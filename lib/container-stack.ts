import * as cdk from '@aws-cdk/core';
import { EksProps } from './cluster-stack';
import { readYamlFromDir } from '../utils/read-file';

export class ContainerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EksProps) {
    super(scope, id, props);

    const cluster = props.cluster;

    const commonFolder = './yaml-common/';
    const regionFolder = `./yaml-${cdk.Stack.of(this).region}/`;

    readYamlFromDir(commonFolder, cluster);
    readYamlFromDir(regionFolder, cluster);

    cluster.addHelmChart(`flux`, {
      repository: 'https://charts.fluxcd.io',
      chart: 'flux',
      release: 'flux',
      values: {
        'git.url':'git@github.com:org/repo'
      }
    });

  }

}


