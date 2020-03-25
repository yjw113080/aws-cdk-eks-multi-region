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
        clusterName: `demogo-${cdk.Stack.of(this).region}`,
        mastersRole: clusterAdmin,
        defaultCapacity: 0
      });

      this.cluster.addFargateProfile('FargateProfile', {
        selectors: [ { namespace: 'fargate' } ]
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


      /*
        Temporarily include pipeline
      */

      const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo',{ repositoryName: 'repo-hello-py2' });
      const ecrForHelloPy = new ecr.Repository(this, 'ecr-for-hello-py2');
      ecrForHelloPy.grantPull(asg.role);

      const sourceOutput = new codepipeline.Artifact();
      const buildForECR = codeToECRspec(this, ecrForHelloPy.repositoryUri);
      ecrForHelloPy.grantPullPush(buildForECR.role!);
      const deployToMainEKScluster = deployToEKSspec(this, this.cluster, ecrForHelloPy.repositoryUri);
      
      const repoToEcrPipeline = new codepipeline.Pipeline(this, 'repo-to-ecr-hello-py', {
        stages: [ {
                stageName: 'Source',
                actions: [ new pipelineAction.CodeCommitSourceAction({
                        actionName: 'CatchtheSourcefromCode',
                        repository: helloPyRepo,
                        output: sourceOutput,
                    })]
            },{
                stageName: 'Build',
                actions: [ new pipelineAction.CodeBuildAction({
                    actionName: 'BuildandPushtoECR',
                    input: sourceOutput,
                    project: buildForECR
                })]
            },
            // {
            //     stageName: 'ECRSource',
            //     actions: [ new pipelineAction.EcrSourceAction({ 
            //         actionName: 'CatchImagefromECR',
            //         repository: ecrForHelloPy,
            //         output: new codepipeline.Artifact()
            //       }) ]
            // },
            {
                stageName: 'DeployToMainEKScluster',
                actions: [ new pipelineAction.CodeBuildAction({
                    actionName: 'DeployToMainEKScluster',
                    input: sourceOutput,
                    project: deployToMainEKScluster
                })]
            },
            {
              stageName: 'ApproveToDeployTo2ndRegion',
              actions: [ new pipelineAction.ManualApprovalAction({
                    actionName: 'ApproveToDeployTo2ndRegion'
              })]
            },
            
        ]
      });

  }
}

export interface CommonProps extends cdk.StackProps {
  cluster: eks.Cluster,
  asg: autoscaling.AutoScalingGroup
}