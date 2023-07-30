import * as aws_classic from '@pulumi/aws'
import * as aws_native from '@pulumi/aws-native'
import * as pulumi from '@pulumi/pulumi'

import { NetworkConfig, SubnetConfig } from './config'

/**
 * Represents the output of the network creation.
 */
interface Network {
  internetGateway: aws_classic.ec2.InternetGateway
  natGateway: aws_native.ec2.NatGateway
  natGatewayEip: aws_native.ec2.EIP
  privateRoute: aws_classic.ec2.Route
  privateRouteAssociations: aws_native.ec2.SubnetRouteTableAssociation[]
  privateRouteTable: aws_native.ec2.RouteTable
  privateSubnets: aws_native.ec2.Subnet[]
  publicRoute: aws_classic.ec2.Route
  publicRouteAssociations: aws_native.ec2.SubnetRouteTableAssociation[]
  publicRouteTable: aws_native.ec2.RouteTable
  publicSubnets: aws_native.ec2.Subnet[]
  vpc: aws_native.ec2.VPC
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

  // Create a NAT Gateway
  const eipNatName = `${name}-eip-nat`
  const createdEipNat = new aws_native.ec2.EIP(eipNatName, {
    tags: [{ key: 'Name', value: eipNatName }],
  })
  const natName = `${name}-nat`
  const createdNatGateway = new aws_native.ec2.NatGateway(natName, {
    allocationId: createdEipNat.allocationId,
    subnetId: createdPublicSubnets[0].id,
    tags: [{ key: 'Name', value: natName }],
  })

  // Create an Internet Gateway (IGW)
  // aws_native does not support creating an IGW with a specified vpcId.
  const igwName = `${name}-igw`
  const createdInternetGateway = new aws_classic.ec2.InternetGateway(igwName, {
    vpcId,
    tags: { Name: igwName },
  })

  // Create a public route table and its route
  const publicRouteTableName = `${name}-public-rtb`
  const createdPublicRouteTable = new aws_native.ec2.RouteTable(
    publicRouteTableName,
    { vpcId, tags: [{ key: 'Name', value: publicRouteTableName }] },
  )
  const createdPublicRoute = new aws_classic.ec2.Route(`${name}-public-route`, {
    destinationCidrBlock: '0.0.0.0/0',
    gatewayId: createdInternetGateway.id,
    routeTableId: createdPublicRouteTable.id,
  })
  const createdPublicRouteTableAssociations = createdPublicSubnets.map(
    (subnet, index) => {
      return new aws_native.ec2.SubnetRouteTableAssociation(
        `${name}-${Boundary.PUBLIC}-rtb-assc-${index}`,
        {
          subnetId: subnet.id,
          routeTableId: createdPublicRouteTable.id,
        },
      )
    },
  )

  // Create a private route table and its route
  const privateRouteTableName = `${name}-private-rtb`
  const createdPrivateRouteTable = new aws_native.ec2.RouteTable(
    privateRouteTableName,
    { vpcId, tags: [{ key: 'Name', value: privateRouteTableName }] },
  )
  const createdPrivateRoute = new aws_classic.ec2.Route(
    `${name}-private-route`,
    {
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: createdNatGateway.id,
      routeTableId: createdPrivateRouteTable.id,
    },
  )
  const createdPrivateRouteTableAssociations = createdPrivateSubnets.map(
    (subnet, index) => {
      return new aws_native.ec2.SubnetRouteTableAssociation(
        `${name}-${Boundary.PRIVATE}-rtb-assc-${index}`,
        {
          subnetId: subnet.id,
          routeTableId: createdPrivateRouteTable.routeTableId,
        },
      )
    },
  )

  return {
    internetGateway: createdInternetGateway,
    natGateway: createdNatGateway,
    natGatewayEip: createdEipNat,
    privateRoute: createdPrivateRoute,
    privateRouteAssociations: createdPrivateRouteTableAssociations,
    privateRouteTable: createdPrivateRouteTable,
    privateSubnets: createdPrivateSubnets,
    publicRoute: createdPublicRoute,
    publicRouteAssociations: createdPublicRouteTableAssociations,
    publicRouteTable: createdPublicRouteTable,
    publicSubnets: createdPublicSubnets,
    vpc: createdVpc,
  }
}

export default { create }
