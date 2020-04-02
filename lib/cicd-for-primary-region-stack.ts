import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import { CommonProps, PropForCicd } from './cluster-stack';
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';
import { codeToECRspec, deployToEKSspec, deployTo2ndClusterspec } from '../utils/buildspecs';
import { CicdProps } from './cicd-for-secondary-region-stack'

export class CicdForPrimaryRegionStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: PropForCicd) {
    // constructor(scope: cdk.Construct, id: string, props: CommonProps) {
    
        super(scope, id, props);

        const primaryRegion = cdk.Stack.of(this).region;
        const secondaryRegion = 'us-east-1';

        const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo', {
            repositoryName: 'hello-py-for-demogo'
        });

        const ecrForMainRegion = new ecr.Repository(this, `ecr-for-hello-py`);
        ecrForMainRegion.grantPull(props.asg.role);

        const sourceOutput = new codepipeline.Artifact();

        const buildForECR = codeToECRspec(this, ecrForMainRegion.repositoryUri);
        ecrForMainRegion.grantPullPush(buildForECR.role!);

        const deployToMainCluster = deployToEKSspec(this, primaryRegion, props.cluster, ecrForMainRegion);
        const deployTo2ndCluster = deployTo2ndClusterspec(this, secondaryRegion, ecrForMainRegion, props.roleFor2ndRegionDeployment);
        // const ecrFor2ndRegion = props.targetRepo;
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
                
                // {
                //     stageName: 'ReplicateTo2ndRegionsECR',
                //     actions: [ new pipelineAction.CodeBuildAction({
                //         actionName: 'ReplicateTo2ndRegionsECR',
                //         input: sourceOutput,
                //         project: replicateTo2ndECR
                //     })]
                // }
                {
                    stageName: 'DeployTo2ndRegionCluster',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'DeployTo2ndRegionCluster',
                        input: sourceOutput,
                        project: deployTo2ndCluster
                    })]
                }
            ]
        });

        

    }
}

