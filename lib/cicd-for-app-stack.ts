import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import { CommonProps } from './cluster-stack';
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';
import { codeToECRspec } from '../utils/buildspec-deploy-to-eks';


export class CicdForAppStack extends cdk.Stack {
  
    constructor(scope: cdk.Construct, id: string, props: CommonProps) {
        super(scope, id, props);

        // defining code repository and image registry
        // const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo',{ repositoryName: 'repo-hello-py' });
        // const ecrForHelloPy = new ecr.Repository(this, 'ecr-for-hello-py');
        // ecrForHelloPy.grantPull(props.asg.role);

        // // things we need for the pipeline
        // const sourceOutput = new codepipeline.Artifact();
        // const buildForECR = codeToECRspec(this, ecrForHelloPy.repositoryUri);
        // ecrForHelloPy.grantPullPush(buildForECR.role!);


    }
}