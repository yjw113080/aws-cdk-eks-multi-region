import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import { CommonProps } from './cluster-stack';
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';
import { codeToECRspec, deployToEKSspec } from '../utils/buildspecs';



export class CicdForSecondaryRegionStack extends cdk.Stack {
  
    constructor(scope: cdk.Construct, id: string, props: CommonProps) {
        super(scope, id, props);
        const ecrForHelloPy = new ecr.Repository(this, 'ecr-for-hello-py');
        const ecrOutput = new codepipeline.Artifact();

        const deployTo2ndEKScluster = deployToEKSspec(this, props.cluster, ecrForHelloPy);

        new codepipeline.Pipeline(this, 'pipeline-for-secondary-region', {
            stages: [{
                stageName: 'Source',
                actions: [new pipelineAction.EcrSourceAction({
                    actionName: 'TriggerDeployFor2ndRegion',
                    repository: ecrForHelloPy,
                    output: ecrOutput
                })]
            },{
                stageName: 'DeployTo2ndEKScluster',
                actions: [new pipelineAction.CodeBuildAction({
                    actionName: 'DeployTo2ndEKScluster',
                    input: ecrOutput,
                    project: deployTo2ndEKScluster
                })]
            }]
        })
        // const pyRepo = ecr.Repository.fromRepositoryName(this, 'hello-py', 'hello-py-for-demogo');
        // deployToEKSspec(this, props.cluster, pyRepo);
    }
}