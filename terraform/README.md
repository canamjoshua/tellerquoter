# TellerQuoter AWS Terraform Infrastructure

This directory contains Terraform configuration for deploying the TellerQuoter application to AWS.

## Architecture Overview

The infrastructure consists of:

- **VPC**: Multi-AZ VPC with public and private subnets
- **EC2**: t3.small instance running Docker Compose
- **RDS**: PostgreSQL 15 database (single-AZ for staging)
- **ALB**: Application Load Balancer with HTTPS termination
- **Route53**: DNS records for custom domain
- **ACM**: SSL/TLS certificate with automatic renewal
- **CloudWatch**: Monitoring, logging, and alarms

## Prerequisites

1. **AWS Account**: Active AWS account with appropriate permissions
2. **AWS CLI**: Configured with credentials (`aws configure`)
3. **Terraform**: Version 1.6.0 or later
4. **SSH Key Pair**: Create an EC2 key pair in AWS Console
5. **Route53 Hosted Zone**: Existing hosted zone for your domain

## Initial Setup

### 1. Create terraform.tfvars

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in your values:

```hcl
aws_region  = "us-east-1"
environment = "staging"

# EC2 Configuration
ec2_instance_type = "t3.small"
ec2_key_name      = "your-ec2-key-name"  # Must exist in AWS

# Database Configuration
db_name     = "tellerquoter"
db_username = "tellerquoter"
db_password = "STRONG_PASSWORD_HERE"

# DNS Configuration
domain_name     = "staging.tellerquoter.internal.canamtechnologies.com"
route53_zone_id = "Z1234567890ABC"  # Your Route53 hosted zone ID

# Monitoring
alarm_email = "ops@canamtechnologies.com"
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Review and Apply

```bash
# Validate configuration
terraform validate

# Plan changes
terraform plan

# Apply changes
terraform apply
```

Or use the provided script:

```bash
../scripts/terraform-apply.sh staging
```

## Post-Deployment Steps

### 1. Confirm SNS Subscription

Check your email for the SNS subscription confirmation and click the link.

### 2. Wait for Certificate Validation

ACM certificate validation may take 5-10 minutes. Check status:

```bash
terraform output certificate_arn
```

### 3. Get EC2 Connection Info

```bash
terraform output ssh_command
terraform output ec2_public_ip
```

### 4. Deploy Application

Once infrastructure is ready, deploy the application:

```bash
EC2_HOST=$(terraform output -raw ec2_public_ip) ../scripts/deploy.sh
```

Or use GitHub Actions for automated deployment (see CI/CD section below).

## Infrastructure Modules

### VPC Module
- Creates VPC with public and private subnets across 2 AZs
- Internet Gateway for public subnets
- Route tables for traffic routing

**Location**: `modules/vpc/`

### RDS Module
- PostgreSQL 15 RDS instance
- Automated backups with 7-day retention
- Enhanced monitoring enabled
- Performance Insights enabled
- Security group allowing access from EC2

**Location**: `modules/rds/`

### EC2 Module
- Amazon Linux 2023 instance
- Docker and Docker Compose pre-installed
- CloudWatch agent for logs and metrics
- User data script for initial setup
- IAM role with CloudWatch and SSM permissions

**Location**: `modules/ec2/`

### ALB Module
- Application Load Balancer across multiple AZs
- HTTPS listener with ACM certificate
- HTTP to HTTPS redirect
- Target groups for frontend and backend
- Health checks configured

**Location**: `modules/alb/`

### Route53 Module
- A record pointing to ALB
- Alias record for better performance

**Location**: `modules/route53/`

### ACM Module
- SSL/TLS certificate for domain
- DNS validation via Route53
- Automatic renewal

**Location**: `modules/acm/`

### CloudWatch Module
- Dashboard with key metrics
- CPU, memory, and disk alarms
- ALB health and error alarms
- SNS topic for alarm notifications
- Log groups for application logs

**Location**: `modules/cloudwatch/`

## Terraform State Management

### Local State (Current)

State is stored locally in `terraform.tfstate`. This is suitable for development but not recommended for teams.

### Remote State (Recommended for Production)

To use S3 backend for state storage:

1. Create S3 bucket and DynamoDB table:

```bash
aws s3api create-bucket \
  --bucket tellerquoter-terraform-state \
  --region us-east-1

aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

2. Uncomment the backend block in `main.tf`:

```hcl
backend "s3" {
  bucket         = "tellerquoter-terraform-state"
  key            = "staging/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "terraform-state-lock"
}
```

3. Migrate state:

```bash
terraform init -migrate-state
```

## Outputs

After deployment, Terraform provides useful outputs:

```bash
terraform output
```

Available outputs:
- `application_url`: Application URL with HTTPS
- `alb_dns_name`: Load balancer DNS name
- `ec2_instance_id`: EC2 instance ID
- `ec2_public_ip`: EC2 public IP
- `rds_endpoint`: Database endpoint
- `ssh_command`: Command to SSH into EC2

## Common Operations

### Connect to EC2 Instance

```bash
# Get SSH command
terraform output ssh_command

# Or manually
ssh -i ~/.ssh/your-key.pem ec2-user@$(terraform output -raw ec2_public_ip)
```

### View Application Logs

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<ip> 'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml logs -f'
```

### Update Infrastructure

```bash
# Make changes to .tf files
terraform plan
terraform apply
```

### Destroy Infrastructure

```bash
# Use the safety script
../scripts/terraform-destroy.sh staging

# Or manually
terraform destroy
```

## Security Considerations

### Current Security Features

- ✅ HTTPS with TLS 1.3
- ✅ Security groups restricting access
- ✅ Private subnets for database
- ✅ Encrypted RDS storage
- ✅ IMDSv2 for EC2
- ✅ IAM roles with least privilege

### Improvements for Production

1. **Restrict SSH Access**: Update EC2 security group to allow SSH only from your IP:

```hcl
# In modules/ec2/main.tf
ingress {
  description = "SSH"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["YOUR_IP/32"]  # Replace with your IP
}
```

2. **Enable Multi-AZ RDS**: For production, enable multi-AZ:

```hcl
# In modules/rds/main.tf
multi_az = true
```

3. **Secrets Management**: Use AWS Secrets Manager for database credentials:

```bash
aws secretsmanager create-secret \
  --name /tellerquoter/staging/db-password \
  --secret-string "your-db-password"
```

4. **Bastion Host**: Add a bastion host in public subnet for SSH access:

```hcl
# Create bastion module
module "bastion" {
  source = "./modules/bastion"
  # ...
}
```

## Cost Estimation

Monthly costs for staging environment (us-east-1):

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| EC2 t3.small | 730 hours | ~$15 |
| RDS db.t3.micro | Single-AZ | ~$15 |
| ALB | Basic usage | ~$20 |
| Data Transfer | < 10GB | ~$5 |
| CloudWatch | Logs & Metrics | ~$5 |
| **Total** | | **~$60/month** |

*Costs may vary based on usage and region*

## Troubleshooting

### Certificate Validation Stuck

If ACM certificate validation is taking too long:

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw certificate_arn)

# Verify DNS records
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID
```

### EC2 Instance Not Healthy

```bash
# Check instance status
aws ec2 describe-instance-status \
  --instance-ids $(terraform output -raw ec2_instance_id)

# View user data logs
ssh -i ~/.ssh/your-key.pem ec2-user@<ip> 'sudo tail -f /var/log/user-data.log'
```

### RDS Connection Issues

```bash
# Test database connectivity from EC2
ssh -i ~/.ssh/your-key.pem ec2-user@<ip>
psql -h $(terraform output -raw rds_endpoint | cut -d: -f1) -U tellerquoter -d tellerquoter
```

### ALB Health Checks Failing

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names tellerquoter-staging-backend-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

## CI/CD with GitHub Actions

See the GitHub Actions workflow at [../.github/workflows/deploy-staging.yml](../.github/workflows/deploy-staging.yml).

### Required GitHub Secrets

Set these in your repository settings:

- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `EC2_SSH_PRIVATE_KEY`: Private key for EC2 access

### Workflow Stages

1. **Test**: Run backend and frontend tests
2. **Build**: Build Docker images and push to ECR
3. **Deploy**: Deploy to EC2 via SSH

## Support

For issues or questions:
- Check Terraform output: `terraform output`
- View CloudWatch logs in AWS Console
- Check CloudWatch alarms for infrastructure issues
- Review application logs on EC2

## License

Internal use - Canam Technologies
