import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import { codeToECRspec, deployToEKSspec, deployAllPoliciesSpec } from '../utils/buildspecs';
import { SecurityProps } from './cluster-stack';


export class SecurityStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: SecurityProps) {
        super(scope, id, props);
        const primaryRegion = 'ap-northeast-1';
        
        const policyRepo = new codecommit.Repository(this, 'opa-policy-repo',{
            repositoryName: 'opa-policy'
        });

        new cdk.CfnOutput(this, 'opa-repo-uri', {
            exportName: 'OpaPolicyRepoURL',
            value: policyRepo.repositoryCloneUrlHttp
        });

        const deployToMainCluster = deployAllPoliciesSpec(this, 
            primaryRegion, 
            props.cluster, 
            props.deployRole);

        const sourceOutput = new codepipeline.Artifact();   

        new codepipeline.Pipeline(this, 'security-pipeline', {
            stages: [
                {
                    stageName: 'Source',
                    actions: [ new pipelineAction.CodeCommitSourceAction({
                            actionName: 'CatchSourcefromCode',
                            repository: policyRepo,
                            output: sourceOutput,
                        })]
                },{
                    stageName: 'Build',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'BuildAndPushtoECR',
                        input: sourceOutput,
                        project: deployToMainCluster
                    })]
                }
            ]
        })
    }
}