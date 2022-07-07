import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

const KEY_PAIR_NAME = "bch-kp";

export class TestVpcEndpointStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'test-vpc-endpoint-vpc', {
      natGateways: 0,
      cidr: '10.0.0.0/20',
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24
        }
      ]
    });

    /**
     * Security Group Allowing SSH Connections from specific IP
     * along with all TCP traffic among EC2s within VPC
     */
     const ec2SecurityGroup = new ec2.SecurityGroup(this, 'ssh-security-group', {
      vpc: vpc,
      description: 'Allow SSH (TCP port 22) from Anywhere and All TCP within VPC',
      allowAllOutbound: true
    });
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22), 'Allow SSH from Specific IP'
    );
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.allTcp(), 
      'Allow all TCP within VPC'
    );

    /**
     * EC2 Instance Role with IAM Policies allowing EC2's to work with
     * the AWS S3 bucket and AWS Kinesis Data Stream defined previously.
     */
     const ec2Role = new iam.Role(this, 'ec2-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "sts:*"
        ],
        resources: ["*"]
      })
    );

    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.X86_64
    });

    const publicEc2 = new ec2.Instance(this, 'pub-ec2-vpc-endpts', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ami,
      role: ec2Role,
      securityGroup: ec2SecurityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      keyName: KEY_PAIR_NAME
    });

    const privateEc2 = new ec2.Instance(this, 'priv-ec2-vpc-endpts', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ami,
      role: ec2Role,
      securityGroup: ec2SecurityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      keyName: KEY_PAIR_NAME
    });

    /**
     * The STS Endpoint
     */
    const stsInterfaceEndpoint = vpc.addInterfaceEndpoint('sts-endpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.STS,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    /**
     * Dynamically generated resource values to display in output of CloudFormation
     */
     new cdk.CfnOutput(this, 'Ec2PublicIp', {
      value: publicEc2.instancePublicIp
    });
    new cdk.CfnOutput(this, 'Ec2PrivateIp', {
      value: privateEc2.instancePrivateIp
    });
    new cdk.CfnOutput(this, 'STSEndpoint', {
      value: stsInterfaceEndpoint.vpcEndpointId
    });
}
}
