import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import { CommonProps } from './cluster-stack';
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';
import { codeToECRspec, deployToEKSspec } from '../utils/buildspecs';


export class CicdForPrimaryRegionStack extends cdk.Stack {
  
    constructor(scope: cdk.Construct, id: string, props: CommonProps) {
        super(scope, id, props);

        const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo', {
            repositoryName: 'hello-py-for-demogo'
        });
        const ecrForHelloPy = new ecr.Repository(this, 'ecr-for-hello-py');
        ecrForHelloPy.grantPull(props.asg.role);

        const sourceOutput = new codepipeline.Artifact();
        const buildForECR = codeToECRspec(this, ecrForHelloPy.repositoryUri);
        ecrForHelloPy.grantPullPush(buildForECR.role!);

        const deployToMainEKScluster = deployToEKSspec(this, props.cluster, ecrForHelloPy);
        
        new codepipeline.Pipeline(this, 'repo-to-ecr-hello-py', {
            stages: [ {
                    stageName: 'Source',
                    actions: [ new pipelineAction.CodeCommitSourceAction({
                            actionName: 'CatchSourcefromCode',
                            repository: helloPyRepo,
                            output: sourceOutput,
                        })]
                },{
                    stageName: 'Build',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'BuildAndPushtoECR',
                        input: sourceOutput,
                        project: buildForECR
                    })]
                },
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
                // {
                //     stageName: 'DeployTo2ndEKScluster',
                //     actions: [ new pipelineAction.CodeBuildAction({
                //         actionName: 'DeployTo2ndEKScluster',
                //         input: sourceOutput,

                //     }) ]
                // }
            ]
        });

    }
}