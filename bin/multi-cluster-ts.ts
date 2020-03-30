#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClusterStack } from '../lib/cluster-stack';
import { ContainerStack } from '../lib/container-stack';
import { CicdForPrimaryRegionStack } from '../lib/cicd-for-primary-region-stack';
import { CicdForSecondaryRegionStack } from '../lib/cicd-for-secondary-region-stack';

import { DatabaseStack } from '../lib/database-stack';


const app = new cdk.App();
const primaryRegion = 'ap-northeast-1';
const secondaryRegion = 'us-east-1';

const environments = [
    { account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
    region: primaryRegion },
    { account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
    region: secondaryRegion }

];


for (const environment of environments) {
    const clusterStack = new ClusterStack (app, `ClusterStack-${environment.region}`, { env: environment });
    new ContainerStack (app, `ContainerStack-${environment.region}`, { env: environment, cluster: clusterStack.cluster, asg: clusterStack.asg});
    
    // cidcdStack doesn't go through the environments loop since it would be located in only one reginon.
    if (environment.region == primaryRegion) {
        new CicdForPrimaryRegionStack (app, `CicdForPrimaryRegionStack`, { env: environments[0], cluster: clusterStack.cluster, asg: clusterStack.asg});
    }

    if (environment.region == secondaryRegion) {
        new CicdForSecondaryRegionStack (app, `CicdForSecondaryRegionStack`, { env: environments[1], cluster: clusterStack.cluster, asg: clusterStack.asg});
    }

}

