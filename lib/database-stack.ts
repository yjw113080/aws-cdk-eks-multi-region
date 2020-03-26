import * as cdk from '@aws-cdk/core';
import dynamodb = require('@aws-cdk/aws-dynamodb');



export class DatabaseStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const table = new dynamodb.Table(this, 'Table', {
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            replicationRegions: ['us-east-1']
          });
        

    }
}