import * as cdk from '@aws-cdk/core';
import { CommonProps } from './cluster-stack';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { readYamlFromDir } from '../utils/read-file';
import { HelmChart } from '@aws-cdk/aws-eks';

export class ContainerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CommonProps) {
    super(scope, id, props);

    const stable = 'https://kubernetes-charts.storage.googleapis.com/';
    const cluster = props.cluster;
    const commonFolder = './yaml-common/';
    const regionFolder = `./yaml-${cdk.Stack.of(this).region}/`;

    readYamlFromDir(commonFolder, cluster);
    readYamlFromDir(regionFolder, cluster);

    cluster.addChart(`metrics-server`, {
      repository: stable,
      chart: 'metrics-server',
      release: 'metrics-server'
    });

  }

}


