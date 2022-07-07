# Test VPC Endpoint

Source = https://thecodinginterface.com/blog/aws-vpc-endpoints-with-cdk/

## Test VPC Endpoint
1. SSH to public EC2 instance as bastion
2. SSH to private EC2 instance
3. Run `aws sts get-caller-identity` --> Should NOT work
4. Run `aws --region us-east-1 sts get-caller-identity --endpoint-url https://sts.us-east-1.amazonaws.com` --> Should work
5. Check the metrics of the VPC Endpoint
