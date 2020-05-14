import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import { PhysicalName } from '@aws-cdk/core';

export class ClusterStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly firstRegionRole: iam.Role;
  public readonly secondRegionRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
      });

    const primaryRegion = 'ap-northeast-1';

    const cluster = new eks.Cluster(this, 'demogo-cluster', {
      clusterName: `demogo`,
      mastersRole: clusterAdmin,
      version: '1.14',
      defaultCapacity: 2,
      defaultCapacityInstance: cdk.Stack.of(this).region==primaryRegion? 
                                new ec2.InstanceType('r5.xlarge') : new ec2.InstanceType('m5.2xlarge')
    });

    cluster.addCapacity('spot-group', {
      instanceType: new ec2.InstanceType('m5.xlarge'),
      spotPrice: cdk.Stack.of(this).region==primaryRegion ? '0.248' : '0.192'
    });
    
    this.cluster = cluster;

    if (cdk.Stack.of(this).region==primaryRegion) {
      this.firstRegionRole = createDeployRole(this, `for-1st-region`, cluster);
    }
    else {
      this.secondRegionRole = createDeployRole(this, `for-2nd-region`, cluster);
    }
    
  }
}

function createDeployRole(scope: cdk.Construct, id: string, cluster: eks.Cluster): iam.Role {
  const role = new iam.Role(scope, id, {
    roleName: PhysicalName.GENERATE_IF_NEEDED,
    assumedBy: new iam.AccountRootPrincipal()
  });
  cluster.awsAuth.addMastersRole(role);

  return role;
}

export interface EksProps extends cdk.StackProps {
  cluster: eks.Cluster
}

export interface CicdProps extends cdk.StackProps {
  cluster: eks.Cluster,
  firstRegionRole: iam.Role,
  secondRegionRole: iam.Role
}

