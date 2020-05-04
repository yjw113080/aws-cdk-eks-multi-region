import * as cdk from '@aws-cdk/core';
import { EksProps } from './cluster-stack';
import { readYamlFromDir } from '../utils/read-file';

export class ContainerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EksProps) {
    super(scope, id, props);

    const stable = 'https://kubernetes-charts.storage.googleapis.com/';
    const cluster = props.cluster;
    const commonFolder = './yaml-common/';
    const regionFolder = `./yaml-${cdk.Stack.of(this).region}/`;

    readYamlFromDir(commonFolder, cluster);
    readYamlFromDir(regionFolder, cluster);

    cluster.addChart(`metrics-server`, {
      repository: stable,
      chart: 'metrics-server'
    });

  }

}


