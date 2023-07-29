import * as pulumi from '@pulumi/pulumi'

/**
 * Represents the configuration for a network.
 * @interface NetworkConfig
 * @property {string} name - Name to be used as identifier.
 * @property {string} cidrBlock - The CIDR block for the VPC.
 */
interface NetworkConfig {
  name: string
  cidrBlock: string
}

const pulumiConfig = new pulumi.Config()
const networkConfig = pulumiConfig.requireObject<NetworkConfig>('network')

export { NetworkConfig, networkConfig }
