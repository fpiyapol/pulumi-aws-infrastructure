import * as aws_native from '@pulumi/aws-native'
import * as pulumi from '@pulumi/pulumi'

import { NetworkConfig, SubnetConfig } from './config'

/**
 * Represents the output of the network creation.
 */
interface Network {
  vpc: aws_native.ec2.VPC
  privateSubnets: aws_native.ec2.Subnet[]
  publicSubnets: aws_native.ec2.Subnet[]
}

/**
 * Represents the arguments required to create subnets in multiple availability zones within a VPC.
 * @interface SubnetsArgs
 * @property {string[]} availabilityZones - An array of availability zone names where the subnets will be created.
 * @property {Boundary} boundary - The boundary configuration for the subnets.
 * @property {string} name - Name to be used as identifier
 * @property {SubnetConfig} subnetConfig - The configuration for the subnets.
 * @property {string | pulumi.Input<string>} vpcId - The ID of the VPC in which the subnets will be created.
 */
interface SubnetsArgs {
  availabilityZones: string[]
  boundary: Boundary
  name: string
  subnetConfig: SubnetConfig
  vpcId: string | pulumi.Input<string>
}

/**
 * Enumeration representing the boundary type for creating subnets.
 * @enum {string}
 * @property {string} PRIVATE - Indicates a private boundary type.
 * @property {string} PUBLIC - Indicates a public boundary type.
 */
enum Boundary {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

/**
 * Creates subnets in the VPC.
 * @function
 * @param {SubnetsArgs} subnetsArgs - The arguments required to create the subnets.
 * @returns {aws_native.ec2.Subnet[]} - An array of AWS Native Subnet objects representing the created subnets.
 */
function createSubnets(subnetsArgs: SubnetsArgs): aws_native.ec2.Subnet[] {
  const { availabilityZones, boundary, name, subnetConfig, vpcId } = subnetsArgs
  const { cidrBlocks, tags = [] } = subnetConfig

  const createdSubnets = cidrBlocks.map((cidrBlock, index) => {
    const availabilityZone = availabilityZones[index]
    const subnetName = `${name}-${boundary}-subnet-${availabilityZone}`

    return new aws_native.ec2.Subnet(subnetName, {
      availabilityZone,
      cidrBlock,
      vpcId,
      tags: [
        ...tags,
        {
          key: 'Name',
          value: subnetName,
        },
      ],
    })
  })

  return createdSubnets
}

/**
 * Creates a network based on the provided configuration.
 * @param {NetworkConfig} networkConfig - The configuration for the network.
 * @returns {NetworkOutput} The output of the network creation.
 */
function create(networkConfig: NetworkConfig): Network {
  const {
    availabilityZones,
    cidrBlock,
    name,
    privateSubnet: privateSubnetConfig,
    publicSubnet: publicSubnetConfig,
  } = networkConfig

  // Create a VPC
  const vpcName = `${name}-vpc`
  const createdVpc = new aws_native.ec2.VPC(vpcName, {
    cidrBlock,
    tags: [{ key: 'Name', value: vpcName }],
  })
  const { vpcId } = createdVpc

  // Create private subnets
  const createdPrivateSubnets = createSubnets({
    availabilityZones,
    boundary: Boundary.PRIVATE,
    name,
    subnetConfig: privateSubnetConfig,
    vpcId,
  })

  // Create public subnets
  const createdPublicSubnets = createSubnets({
    availabilityZones,
    boundary: Boundary.PUBLIC,
    name,
    subnetConfig: publicSubnetConfig,
    vpcId,
  })

  return {
    privateSubnets: createdPrivateSubnets,
    publicSubnets: createdPublicSubnets,
    vpc: createdVpc,
  }
}

export default { create }
