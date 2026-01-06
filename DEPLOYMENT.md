# TellerQuoter AWS Deployment Guide

This guide walks you through deploying the TellerQuoter application to AWS for the first time.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: AWS Setup](#step-1-aws-setup)
- [Step 2: Configure Terraform](#step-2-configure-terraform)
- [Step 3: Deploy Infrastructure](#step-3-deploy-infrastructure)
- [Step 4: Configure GitHub Actions](#step-4-configure-github-actions)
- [Step 5: Deploy Application](#step-5-deploy-application)
- [Step 6: Verify Deployment](#step-6-verify-deployment)
- [Ongoing Operations](#ongoing-operations)

---

## Prerequisites

### Required Tools

Install the following on your local machine:

```bash
# Terraform
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads

# AWS CLI
brew install awscli  # macOS
# or download from https://aws.amazon.com/cli/

# Verify installations
terraform --version  # Should be >= 1.6.0
aws --version
```

### AWS Account Requirements

- AWS account with admin access (or appropriate IAM permissions)
- AWS CLI configured with credentials
- Credit card on file for AWS charges (~$60/month for staging)

---

## Step 1: AWS Setup

### 1.1 Configure AWS CLI

```bash
aws configure
```

Enter your AWS credentials:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

### 1.2 Create EC2 Key Pair

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name tellerquoter-staging \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/tellerquoter-staging.pem

# Set permissions
chmod 400 ~/.ssh/tellerquoter-staging.pem
```

### 1.3 Get Route53 Hosted Zone ID

If you already have a hosted zone for `internal.canamtechnologies.com`:

```bash
aws route53 list-hosted-zones
```

Note the `Id` (e.g., `/hostedzone/Z1234567890ABC`). You'll use `Z1234567890ABC` in the next step.

If you need to create a hosted zone:

```bash
aws route53 create-hosted-zone \
  --name internal.canamtechnologies.com \
  --caller-reference $(date +%s)
```

---

## Step 2: Configure Terraform

### 2.1 Create terraform.tfvars

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

### 2.2 Edit terraform.tfvars

Open `terraform.tfvars` and configure:

```hcl
aws_region  = "us-east-1"
environment = "staging"

# EC2 Configuration
ec2_instance_type = "t3.small"
ec2_key_name      = "tellerquoter-staging"  # Key pair created in Step 1.2

# Database Configuration
db_name     = "tellerquoter"
db_username = "tellerquoter"
db_password = "CHANGE_TO_STRONG_PASSWORD"  # Generate secure password

# DNS Configuration
domain_name     = "staging.tellerquoter.internal.canamtechnologies.com"
route53_zone_id = "Z1234567890ABC"  # From Step 1.3

# Monitoring
alarm_email = "ops@canamtechnologies.com"  # Your email for alerts
```

**Important**: Generate a strong database password:

```bash
# Generate secure password
openssl rand -base64 32
```

---

## Step 3: Deploy Infrastructure

### 3.1 Initialize Terraform

```bash
cd terraform
terraform init
```

You should see: "Terraform has been successfully initialized!"

### 3.2 Validate Configuration

```bash
terraform validate
```

### 3.3 Review Plan

```bash
terraform plan
```

Review the resources that will be created:
- VPC with subnets
- EC2 instance
- RDS PostgreSQL database
- Application Load Balancer
- Route53 DNS records
- ACM SSL certificate
- CloudWatch alarms and dashboard

### 3.4 Apply Configuration

```bash
terraform apply
```

Or use the helper script:

```bash
../scripts/terraform-apply.sh staging
```

Type `yes` when prompted. Deployment takes 10-15 minutes.

### 3.5 Save Outputs

```bash
terraform output > ../infrastructure-outputs.txt
```

---

## Step 4: Configure GitHub Actions

### 4.1 Create ECR Repositories (Optional)

If using ECR for Docker images:

```bash
# Create repositories
aws ecr create-repository --repository-name tellerquoter-backend
aws ecr create-repository --repository-name tellerquoter-frontend
```

### 4.2 Set GitHub Secrets

Go to your repository settings → Secrets and variables → Actions:

**Required Secrets:**

1. `AWS_ACCESS_KEY_ID`
   ```bash
   # Get from AWS CLI config or create new IAM user
   cat ~/.aws/credentials
   ```

2. `AWS_SECRET_ACCESS_KEY`
   ```bash
   # Same as above
   ```

3. `EC2_SSH_PRIVATE_KEY`
   ```bash
   # Contents of your SSH key
   cat ~/.ssh/tellerquoter-staging.pem
   ```

### 4.3 Verify Workflow File

Check [.github/workflows/deploy-staging.yml](.github/workflows/deploy-staging.yml) is present.

---

## Step 5: Deploy Application

You have two deployment options:

### Option A: GitHub Actions (Recommended)

Push to main branch:

```bash
git add .
git commit -m "Initial AWS deployment configuration"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build Docker images
3. Deploy to EC2

Monitor progress in GitHub Actions tab.

### Option B: Manual Deployment

Get EC2 IP from Terraform outputs:

```bash
cd terraform
export EC2_HOST=$(terraform output -raw ec2_public_ip)
cd ..
```

Run deployment script:

```bash
./scripts/deploy.sh
```

---

## Step 6: Verify Deployment

### 6.1 Confirm SNS Subscription

Check your email for SNS subscription confirmation and click the confirm link.

### 6.2 Wait for Certificate Validation

ACM certificate validation takes 5-10 minutes:

```bash
cd terraform
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw certificate_arn) \
  --query 'Certificate.Status'
```

Wait until status is `ISSUED`.

### 6.3 Test Application

```bash
# Test health endpoint
curl https://staging.tellerquoter.internal.canamtechnologies.com/health

# Expected response: {"status":"ok","timestamp":"..."}

# Test frontend
open https://staging.tellerquoter.internal.canamtechnologies.com
```

### 6.4 Check CloudWatch

View your dashboard:

```bash
cd terraform
terraform output cloudwatch_dashboard_url
```

Open the URL in your browser to see metrics.

### 6.5 SSH to EC2 (Optional)

```bash
cd terraform
eval $(terraform output -raw ssh_command)

# Once connected:
cd /opt/tellerquoter
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs
```

---

## Ongoing Operations

### Deploy Application Updates

**Automatic (GitHub Actions):**
Push to main branch - deployment happens automatically.

**Manual:**
```bash
EC2_HOST=$(cd terraform && terraform output -raw ec2_public_ip) ./scripts/deploy.sh
```

### View Logs

**Via SSH:**
```bash
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>
cd /opt/tellerquoter
docker-compose -f docker-compose.production.yml logs -f
```

**Via CloudWatch:**
Go to AWS Console → CloudWatch → Log Groups → `/aws/ec2/tellerquoter-staging`

### Update Infrastructure

```bash
cd terraform

# Edit .tf files as needed
terraform plan
terraform apply
```

### Database Access

**From EC2:**
```bash
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>
psql -h <rds-endpoint> -U tellerquoter -d tellerquoter
```

**Via SSH Tunnel:**
```bash
# Terminal 1: Create tunnel
ssh -i ~/.ssh/tellerquoter-staging.pem -L 5432:<rds-endpoint>:5432 ec2-user@<ec2-ip>

# Terminal 2: Connect to database
psql -h localhost -U tellerquoter -d tellerquoter
```

### Backup and Restore

**RDS Automated Backups:**
- Automatic daily backups with 7-day retention
- View in AWS Console → RDS → Automated Backups

**Manual Snapshot:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier tellerquoter-staging-db \
  --db-snapshot-identifier tellerquoter-staging-manual-$(date +%Y%m%d)
```

**Restore from Snapshot:**
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier tellerquoter-staging-db-restored \
  --db-snapshot-identifier <snapshot-id>
```

### Scale Resources

**Vertical Scaling (Bigger Instance):**

Edit `terraform.tfvars`:
```hcl
ec2_instance_type = "t3.medium"  # or t3.large
db_instance_class = "db.t3.small"  # for RDS
```

Apply changes:
```bash
cd terraform
terraform apply
```

**Note**: EC2 changes require stopping the instance.

### Monitor Costs

**AWS Cost Explorer:**
- AWS Console → Cost Explorer
- Filter by tag: `Project=TellerQuoter`, `Environment=staging`

**Set Budget Alerts:**
```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget-config.json
```

### Security Best Practices

1. **Rotate Database Password:**
   ```bash
   # Update in terraform.tfvars
   # Update in .env.production on EC2
   # Run: terraform apply
   ```

2. **Update AMI:**
   ```bash
   # EC2 uses latest AL2023 AMI automatically
   # To force update: terraform taint module.ec2.aws_instance.main
   terraform apply
   ```

3. **Review Security Groups:**
   ```bash
   # Restrict SSH access to your IP
   # Edit modules/ec2/main.tf ingress rules
   ```

---

## Troubleshooting

### Certificate Not Validating

**Symptom:** ACM certificate stuck in "Pending validation"

**Solution:**
```bash
# Check DNS validation records
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Type=='CNAME']"

# Verify CNAME exists for _acme-challenge subdomain
```

### Application Not Accessible

**Symptom:** Cannot access https://staging.tellerquoter...

**Check:**
1. ALB health checks:
   ```bash
   aws elbv2 describe-target-health --target-group-arn <tg-arn>
   ```

2. Security groups:
   ```bash
   aws ec2 describe-security-groups \
     --filters "Name=tag:Name,Values=tellerquoter-staging-*"
   ```

3. Application logs on EC2

### Database Connection Failed

**Symptom:** Backend cannot connect to RDS

**Check:**
1. RDS status:
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier tellerquoter-staging-db
   ```

2. Environment variables on EC2:
   ```bash
   ssh ec2-user@<ip>
   cat /opt/tellerquoter/.env.production
   ```

3. Security group rules allow EC2 → RDS traffic

### High Costs

**Solution:**
- Stop EC2 when not in use (staging only):
  ```bash
  aws ec2 stop-instances --instance-ids $(cd terraform && terraform output -raw ec2_instance_id)
  ```
- Delete unused snapshots
- Review CloudWatch log retention (currently 7 days)

---

## Destroying Infrastructure

**Warning:** This is irreversible!

```bash
cd terraform
../scripts/terraform-destroy.sh staging
```

Or manually:
```bash
terraform destroy
```

---

## Support

- **Terraform Documentation**: [terraform/README.md](terraform/README.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **AWS Console**: https://console.aws.amazon.com
- **CloudWatch Dashboard**: See Terraform outputs

---

## Next Steps

After successful deployment:

1. ✅ Set up monitoring alerts
2. ✅ Configure automated backups
3. ✅ Set up staging → production promotion process
4. ✅ Document runbook for common operations
5. ✅ Set up log aggregation (optional)
6. ✅ Configure WAF rules (optional)
7. ✅ Set up CI/CD for infrastructure changes

---

**Congratulations!** Your TellerQuoter application is now deployed to AWS.
