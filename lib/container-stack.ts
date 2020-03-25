import * as cdk from '@aws-cdk/core';
import { CommonProps } from './cluster-stack';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class ContainerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CommonProps) {
    super(scope, id, props);

    const stable = 'https://kubernetes-charts.storage.googleapis.com/';
    const cluster = props.cluster;
    const region = cdk.Stack.of(this).region;
    const commonFolder = './yaml-common/';
    const regionFolder = `./yaml-${region}/`;


    fs.readdir(commonFolder, 'utf8', (err, files) => {
      files.forEach((file) => {
        if (file.split('.').pop()=='yaml') {
          fs.readFile(commonFolder+file, 'utf8', (err, data) => {
            if (data!=undefined) {
              data.split('{{region_name}}').join(region);
              data.split('{{cluster_name}}').join(cluster.clusterName);
              let i = 0;
    
              yaml.loadAll(data).forEach((item) => {
                cluster.addResource(file.substr(0,file.length-5)+i, item);
                i++;
              })
            }
          })
        }
      })
    })

  }

}


