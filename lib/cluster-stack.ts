import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import { codeToECRspec, deployToEKSspec } from '../utils/buildspecs';


export class ClusterStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly asg: autoscaling.AutoScalingGroup;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      const clusterAdmin = new iam.Role(this, 'AdminRole', {
        assumedBy: new iam.AccountRootPrincipal()
      });


      this.cluster = new eks.Cluster(this, 'demogo-cluster', {
        mastersRole: clusterAdmin,
        defaultCapacity: 0
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
      this.asg = asg;


  }
}

export interface CommonProps extends cdk.StackProps {
  cluster: eks.Cluster,
  asg: autoscaling.AutoScalingGroup
}