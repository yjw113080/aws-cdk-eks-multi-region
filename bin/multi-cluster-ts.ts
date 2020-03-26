#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClusterStack } from '../lib/cluster-stack';
import { ContainerStack } from '../lib/container-stack';
import { CicdForAppStack } from '../lib/cicd-for-app-stack';
import { DatabaseStack } from '../lib/database-stack';

const app = new cdk.App();

const environments = [
    { account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'ap-northeast-1' },
    // { account: '865200059792', region: 'us-east-1' },
];

for (const env of environments) {
    const clusterStack = new ClusterStack (app, `ClusterStack`, { env });
    const containerStack = new ContainerStack (app, `ContainerStack`, { env, cluster: clusterStack.cluster, asg: clusterStack.asg});
    // containerStack.addDependency(clusterStack);
    // const dbStack = new DatabaseStack (app, 'DatabaseStack', { env });

    const cicdStack = new CicdForAppStack (app, `CicdForAppStack`, { env, cluster: clusterStack.cluster, asg: clusterStack.asg});
}

