import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import { CommonProps } from './cluster-stack';
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';
import { codeToECRspec, deployToEKSspec, replicateECRspec } from '../utils/buildspecs';
import { CicdProps } from './cicd-for-secondary-region-stack'

export class CicdForPrimaryRegionStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: CommonProps) {
        super(scope, id, props);

        const primaryRegion = 'ap-northeast-1';
        const secondaryRegion = 'us-east-1';

        const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo', {
            repositoryName: 'hello-py-for-demogo'
        });

        const ecrForMainRegion = new ecr.Repository(this, 'ecr-for-hello-py');
        // const ecrFor2ndRegion = new ecr.Repository(this, 'ecr-for-hello-py');
        ecrForMainRegion.grantPull(props.asg.role);
        // ecrFor2ndRegion.grantPull(props.asg.role);

        const sourceOutput = new codepipeline.Artifact();

        const buildForECR = codeToECRspec(this, ecrForMainRegion.repositoryUri);
        ecrForMainRegion.grantPullPush(buildForECR.role!);

        const deployToMainCluster = deployToEKSspec(this, primaryRegion, props.cluster, ecrForMainRegion);
        const deployTo2ndCluster = deployToEKSspec(this, secondaryRegion, props.cluster, ecrForMainRegion);

        // const replicateTo2ndECR = replicateECRspec(this, ecrForMainRegion, ecrFor2ndRegion);


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
                        project: deployToMainCluster
                    })]
                },
                {
                    stageName: 'ApproveToDeployTo2ndRegion',
                    actions: [ new pipelineAction.ManualApprovalAction({
                            actionName: 'ApproveToDeployTo2ndRegion'
                    })]
                },
                {
                    stageName: 'DeployTo2ndEKScluster',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'DeployTo2ndEKScluster',
                        input: sourceOutput,
                        project: deployTo2ndCluster
                    })]
                }
                // {
                //     stageName: 'ReplicateTo2ndRegionsECR',
                //     actions: [ new pipelineAction.CodeBuildAction({
                //         actionName: 'ReplicateTo2ndRegionsECR',
                //         input: sourceOutput,
                //         project: replicateTo2ndECR
                //     })]
                // }
            ]
        });

        

    }
}

