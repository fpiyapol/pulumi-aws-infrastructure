import * as pulumi from '@pulumi/pulumi'

/**
 * Represents a tag for a resource.
 * @interface SubnetTag
 * @property {string} key - The key of the tag.
 * @property {string} value - The value of the tag.
 */
interface Tag {
  key: string
  value: string
}

/**
 * Represents the configuration for a subnet.
 * @interface SubnetConfig
 * @property {string[]} cidrBlocks - An array of CIDR blocks for the subnet.
 * @property {SubnetTag[]} [tags] - Optional array of tags associated with the subnet.
 */
interface SubnetConfig {
  cidrBlocks: string[]
  tags?: Tag[]
}

/**
 * Represents the configuration for a network.
 * @interface NetworkConfig
 * @property {string} name - Name to be used as identifier.
 * @property {string} cidrBlock - The CIDR block for the VPC.
 * @property {string[]} availabilityZones - An array of availability zones for the subnets.
 * @property {SubnetConfig} publicSubnet - The configuration for the public subnets.
 * @property {SubnetConfig} privateSubnet - The configuration for the private subnets.
 */
interface NetworkConfig {
  name: string
  cidrBlock: string
  availabilityZones: string[]
  publicSubnet: SubnetConfig
  privateSubnet: SubnetConfig
}

const pulumiConfig = new pulumi.Config()
const networkConfig = pulumiConfig.requireObject<NetworkConfig>('network')

export { networkConfig, NetworkConfig, SubnetConfig }
