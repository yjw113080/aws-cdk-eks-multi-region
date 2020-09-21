import {expect as expectCDK, matchTemplate, MatchStyle, SynthUtils} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import {ClusterStack} from "../lib/cluster-stack";
import {ContainerStack} from "../lib/container-stack";

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ClusterStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});

test('Primary Region', () => {
    const app = new cdk.App();
    // WHEN
    const primaryRegion = {account: "xxxxxx", region: 'ap-northeast-1'};
    //const secondaryRegion = {account: "xxxxxx", region: 'us-west-2'};
    const primaryCluster = new ClusterStack(app, 'MyTestStack', {env: primaryRegion });

    const stack = new ContainerStack(app, `ContainerStack-${primaryRegion.region}`, {env: primaryRegion, cluster: primaryCluster.cluster });
    // THEN
    const cfn = SynthUtils.toCloudFormation(stack);
    expect(cfn).toMatchSnapshot();

});
