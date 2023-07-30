# Pulumi AWS Infrastructure

A Pulumi program for provision and manage AWS infrastructure

## Project Structure

```
aws-infrastructure/
├─ 01-network         # Provision and manage network-related resources (VPC, Subnets, etc.)
│  ├─ <env>           # Network of each environment (dev, non-prod, prod, etc.)
│  ├─ Pulumi.dev.yaml # For example, the network of development environment
```
