#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClusterStack } from '../lib/cluster-stack';
import { ContainerStack } from '../lib/container-stack';
import { CicdForPrimaryRegionStack } from '../lib/cicd-for-primary-region-stack';
import { CicdForSecondaryRegionStack } from '../lib/cicd-for-secondary-region-stack';


const app = new cdk.App();
const primaryRegion = 'ap-northeast-1';
const secondaryRegion = 'us-east-1';

const environments = [

    { account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
        region: primaryRegion },
    { account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
    region: secondaryRegion },

];


let primaryCluster = new ClusterStack(app, `ClusterStack-${environments[0].region}`, {env: environments[0]});
let primaryContainer = new ContainerStack(app, `ContainerStack-${environments[0].region}`, {env: environments[0], cluster: primaryCluster.cluster, asg: primaryCluster.asg});
// primaryContainer.addDependency(primaryCluster);

let secondaryCluster = new ClusterStack(app, `ClusterStack-${environments[1].region}`, {env: environments[1]});
let secondaryContainer = new ContainerStack(app, `ContainerStack-${environments[1].region}`, {env: environments[1], cluster: secondaryCluster.cluster, asg: secondaryCluster.asg});
// secondaryContainer.addDependency(secondaryCluster);

// let secondaryCicd = new CicdForSecondaryRegionStack(app, `CicdForSecondaryStack`, {env: environments[1], cluster: secondaryCluster.cluster, asg: secondaryCluster.asg});
let primaryCicd = new CicdForPrimaryRegionStack(app, `CicdForPrimaryStack`, {env: environments[0], cluster: primaryCluster.cluster, asg: primaryCluster.asg,
    roleFor2ndRegionDeployment: secondaryCluster.roleFor2ndRegionDeployment
    // , targetRepo: secondaryCicd.targetRepo
});
// primaryCicd.addDependency(secondaryCicd);