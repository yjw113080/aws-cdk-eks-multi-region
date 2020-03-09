import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import MultiClusterTs = require('../lib/multi-cluster-ts-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new MultiClusterTs.MultiClusterTsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
