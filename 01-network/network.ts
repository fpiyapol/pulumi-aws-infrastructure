import * as aws_native from '@pulumi/aws-native'

import { NetworkConfig } from './config'

/**
 * Represents the output of the network creation.
 */
interface Network {
  vpc: aws_native.ec2.VPC
}

/**
 * Creates a network based on the provided configuration.
 * @param {NetworkConfig} networkConfig - The configuration for the network.
 * @returns {NetworkOutput} The output of the network creation.
 */
function create(networkConfig: NetworkConfig): Network {
  const { name, cidrBlock } = networkConfig

  // Create a VPC
  const vpcName = `${name}-vpc`
  const createdVpc = new aws_native.ec2.VPC(vpcName, {
    cidrBlock,
    tags: [{ key: 'Name', value: vpcName }],
  })

  return {
    vpc: createdVpc,
  }
}

export default { create }
