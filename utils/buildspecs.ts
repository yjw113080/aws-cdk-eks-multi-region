import codebuild = require('@aws-cdk/aws-codebuild');
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import { PipelineProject } from '@aws-cdk/aws-codebuild';
import * as ecr from '@aws-cdk/aws-ecr';

function codeToECRspec (scope: cdk.Construct, apprepo: string) :PipelineProject {
    const buildForECR = new codebuild.PipelineProject(scope, `build-to-ecr`, { 
        projectName: `build-to-ecr`,
        environment: {
            buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_DOCKER_18_09_0,
            privileged: true
        },
        environmentVariables: { 'ECR_REPO_URI': {
            value: `${apprepo}`
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

     return buildForECR;

}


function deployToEKSspec (scope: cdk.Construct, cluster: eks.Cluster, apprepo: ecr.Repository) :PipelineProject {
    const deployBuildSpec = new codebuild.PipelineProject(scope, `deploy-to-eks`, {
        // environment: {
        //     buildImage: codebuild.LinuxBuildImage.fromAsset(scope, 'custom-image-for-eks', {
        //         directory: './utils/buildimage'
        //     })
        // },
        environmentVariables: { 
            'CLUSTER_NAME': {
                value: `${cluster.clusterName}`
              },
            'ECR_REPO_URI': {
            value: `${apprepo.repositoryUri}`
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

    cluster.awsAuth.addMastersRole(deployBuildSpec.role!);
    deployBuildSpec.addToRolePolicy(new iam.PolicyStatement({
      actions: ['eks:DescribeCluster'],
      resources: [`${cluster.clusterArn}`],
    }));

    return deployBuildSpec;

}

export { codeToECRspec as  codeToECRspec }
export { deployToEKSspec as deployToEKSspec }