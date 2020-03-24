import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as autoscaling from '@aws-cdk/aws-autoscaling';

export class ClusterStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly asg: autoscaling.AutoScalingGroup;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      const clusterAdmin = new iam.Role(this, 'AdminRole', {
        assumedBy: new iam.AccountRootPrincipal()
      });


      this.cluster = new eks.Cluster(this, 'demogo-cluster', {
        clusterName: `demogo-${cdk.Stack.of(this).region}`,
        mastersRole: clusterAdmin,
        defaultCapacity: 0
      });

      this.cluster.addFargateProfile('FargateProfile', {
        selectors: [ { namespace: 'fargate' } ]
      });



      let asg = this.cluster.addCapacity('t3-asg', {
        minCapacity: 1,
        maxCapacity: 10,
        instanceType: new ec2.InstanceType('t3.large'),
        spotPrice: '0.1094'
      });
                           
      asg.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup"
        ],
        resources: ["*"]
      }));

      cdk.Tag.add(asg, 'k8s.io/cluster-autoscaler/enabled', '');
      cdk.Tag.add(asg, `k8s.io/cluster-autoscaler/${this.cluster.clusterName}`, '');
      this.asg = asg;

  }
}

export interface ContainerProps extends cdk.StackProps {
  cluster: eks.Cluster,
  asg: autoscaling.AutoScalingGroup
}