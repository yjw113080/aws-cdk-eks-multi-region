import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import { PhysicalName } from '@aws-cdk/core';


export class ClusterStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly roleFor2ndRegionDeployment: iam.Role;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const primaryRegion = 'ap-northeast-1';

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
      });

    const cluster = new eks.Cluster(this, 'demogo-cluster', {
        clusterName: `demogo`,
        mastersRole: clusterAdmin,
        defaultCapacity: 2,
        defaultCapacityInstance: cdk.Stack.of(this).region==primaryRegion ? new ec2.InstanceType('r5.xlarge') : new ec2.InstanceType('m5.xlarge')
    });

    this.cluster = cluster;

    const roleForCodebuild = new iam.Role(this, 'for-2nd-region', {
      roleName: PhysicalName.GENERATE_IF_NEEDED,
      assumedBy: new iam.AccountRootPrincipal()
    });
    
    if (cdk.Stack.of(this).region!=primaryRegion) 
      this.cluster.awsAuth.addMastersRole(roleForCodebuild)
    
    this.roleFor2ndRegionDeployment = roleForCodebuild;
    
  }
}

export interface EksProps extends cdk.StackProps {
  cluster: eks.Cluster
}

export interface PropForCicd extends cdk.StackProps {
  cluster: eks.Cluster,
  roleFor2ndRegionDeployment: iam.Role
}
