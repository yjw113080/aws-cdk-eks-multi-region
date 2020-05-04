import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';
import { codeToECRspec, deployToEKSspec, deployTo2ndClusterspec } from '../utils/buildspecs';
import { PropForCicd } from './cluster-stack';

export class CicdForPrimaryRegionStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: PropForCicd) {
        super(scope, id, props);
        const primaryRegion = 'ap-northeast-1';
        const secondaryRegion = 'us-east-1';

        const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo', {
            repositoryName: `hello-py-${cdk.Stack.of(this).region}`
        });
        new cdk.CfnOutput(this, `codecommit-uri`, {
            exportName: 'CodeCommitURL',
            value: helloPyRepo.repositoryCloneUrlHttp
        });


        const ecrForMainRegion = new ecr.Repository(this, `ecr-for-hello-py`);
        const buildForECR = codeToECRspec(this, ecrForMainRegion.repositoryUri);
        ecrForMainRegion.grantPullPush(buildForECR.role!);

        const deployToMainCluster = deployToEKSspec(this, primaryRegion, props.cluster, ecrForMainRegion);
        const deployTo2ndCluster = deployTo2ndClusterspec(this, secondaryRegion, ecrForMainRegion, props.roleFor2ndRegionDeployment);

        deployTo2ndCluster.addToRolePolicy(new iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [props.roleFor2ndRegionDeployment.roleArn]
        }))

        const sourceOutput = new codepipeline.Artifact();
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
                    stageName: 'ApprovalToReplicate',
                    actions: [ new pipelineAction.ManualApprovalAction({
                        actionName: 'ApproveToReplicateTo2ndRegion'
                    })]
                },
                {
                    stageName: 'Deploy2ndRegion',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'Deploy2ndRegion',
                        input: sourceOutput,
                        project: deployTo2ndCluster
                    })]
                }
                
                
            ]
        });

    }
}

