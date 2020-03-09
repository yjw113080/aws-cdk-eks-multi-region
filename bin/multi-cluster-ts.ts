#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MultiClusterTsStack } from '../lib/multi-cluster-ts-stack';

const app = new cdk.App();
new MultiClusterTsStack(app, 'MultiClusterTsStack');
