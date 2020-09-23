import {expect as expectCDK, matchTemplate, MatchStyle, SynthUtils} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import {ClusterStack} from "../lib/cluster-stack";
import {ContainerStack} from "../lib/container-stack";
import '@aws-cdk/assert/jest';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ClusterStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});

test('Primary Region SnapShot', () => {
    //GIVEN
    const app = new cdk.App();
    //const stack = new cdk.Stack(app, 'testing-stack');
    const primaryRegion = {account: "xxxxxx", region: 'ap-northeast-1'};
    // WHEN
    const primaryCluster = new ClusterStack(app, 'PrimaryCluster', {env: primaryRegion });
    const primaryContainer = new ContainerStack(app, `ContainerStack-${primaryRegion.region}`, {env: primaryRegion, cluster: primaryCluster.cluster });

    // THEN
    expect(SynthUtils.toCloudFormation(primaryCluster)).toMatchSnapshot();
    expect(SynthUtils.toCloudFormation(primaryContainer)).toMatchSnapshot();

    //expect(stack).toHaveResource('AWS::S3::Bucket');

});

test('Primary Region Unit Test', () => {
    //GIVEN
    const app = new cdk.App();
    //const stack = new cdk.Stack(app, 'testing-stack');
    const primaryRegion = {account: "xxxxxx", region: 'ap-northeast-1'};
    // WHEN
    const primaryCluster = new ClusterStack(app, 'PrimaryCluster', {env: primaryRegion });
    const primaryContainer = new ContainerStack(app, `ContainerStack-${primaryRegion.region}`, {env: primaryRegion, cluster: primaryCluster.cluster });

    // THEN
    expect(primaryCluster).toHaveResource('AWS::EC2::VPC', {
        EnableDnsSupport: true,
        CidrBlock: "10.0.0.0/16",

    })

    expect(primaryCluster).toHaveResource('AWS::EKS::Nodegroup', {
        AmiType: "AL2_x86_64",
        InstanceTypes: [
            "m5.large",
            ],
        ScalingConfig: {
            "DesiredSize": 2,
            "MaxSize": 2,
            "MinSize": 2,
        },
        Subnets: [{
            "Ref": "demogoclusterDefaultVpcPrivateSubnet1Subnet9EBC7F0F",
            },
            {
            "Ref": "demogoclusterDefaultVpcPrivateSubnet2Subnet71BE4D47",
            },
            {
            "Ref": "demogoclusterDefaultVpcPrivateSubnet3Subnet7C658410",
            },
        ],
    })

    expect(primaryCluster).toHaveResource('Custom::AWSCDK-EKS-HelmChart', {
        "Chart": "aws-node-termination-handler",
        "ClusterName": {
            "Ref": "demogoclusterA89898EB",
        },
        "CreateNamespace": true,
        "Namespace": "kube-system",
        "Release": "clusterdemogoclusterchartspotinterrupthandler38b824cd",
        "Repository": "https://aws.github.io/eks-charts",
        "Values": "{\"nodeSelector.lifecycle\":\"Ec2Spot\"}",
    });

});