import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import { ContainerProps } from './cluster-stack';
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import * as iam from '@aws-cdk/aws-iam';


export class CicdForAppStack extends cdk.Stack {
  
    constructor(scope: cdk.Construct, id: string, props: ContainerProps) {
        super(scope, id, props);
        // defining code repository and image registry
        const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo',{
            repositoryName: 'repo-hello-py'
        });

        const ecrForHelloPy = new ecr.Repository(this, 'ecr-for-hello-py');
        ecrForHelloPy.grantPull(props.asg.role);


        // things we need for the pipeline
        const sourceOutput = new codepipeline.Artifact();

        const buildForECR = new codebuild.PipelineProject(this, 'build-to-ecr', { 
            environment: {
                buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_DOCKER_18_09_0,
                privileged: true
            },
            environmentVariables: { 'ECR_REPO_URI': {
                value: `${ecrForHelloPy.repositoryUri}`
              } },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    pre_build: {
                        commands: [
                            'env', `$(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)`, 
                            // `COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)`,
                            'IMAGE_TAG=${$CODEBUILD_RESOLVED_SOURCE_VERSION:=latest}'
                        ]
                    },
                    build: {
                        commands: [
                            'docker build -t $ECR_REPO_URI:latest .',
                            'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:$IMAGE_TAG'
                        ]
                    },
                    post_build: {
                        commands: [
                            'docker push $ECR_REPO_URI:latest',
                            'docker push $ECR_REPO_URI:$IMAGE_TAG'
                        ]
                    }
                }
            })
         });
 
         ecrForHelloPy.grantPullPush(buildForECR.role!);

         // finally define the Pipeline
        const deployToMainEKScluster = new codebuild.PipelineProject(this, 'deploy-to-main', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.fromAsset(this, 'custom-image', {
                    directory: './buildimage'
                })
            },
            environmentVariables: { 
                'CLUSTER_NAME': {
                    value: `${props.cluster.clusterName}`
                  },
                'ECR_REPO_URI': {
                value: `${ecrForHelloPy.repositoryUri}`
              } 
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                  install: {
                    commands: [
                      'env',
                      'export TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
                      '/usr/local/bin/entrypoint.sh'                    ]
                  },
                  build: {
                    commands: [
                        `sed -i 's@CONTAINER_IMAGE@'"$ECR_REPO_URI:$TAG"'@' hello-py.yaml`,
                        'kubectl apply -f hello-py.yaml'
                    ]
                  }
                }})
        });

        props.cluster.awsAuth.addMastersRole(deployToMainEKScluster.role!);
        deployToMainEKScluster.addToRolePolicy(new iam.PolicyStatement({
          actions: ['eks:DescribeCluster'],
          resources: [`${props.cluster.clusterArn}`],
        }));


        const repoToEcrPipeline = new codepipeline.Pipeline(this, 'repo-to-ecr-hello-py', {
            stages: [
                {
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
                },{
                    stageName: 'ECRSource',
                    actions: [ new pipelineAction.EcrSourceAction({ 
                        actionName: 'CatchImagefromECR',
                        repository: ecrForHelloPy,
                        output: new codepipeline.Artifact()
                     }) ]
                },
                {
                    stageName: 'DeployToMainEKScluster',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'DeployToMainEKScluster',
                        input: sourceOutput,
                        project: deployToMainEKScluster
                    })]
                }
            ]
        });




    }
}