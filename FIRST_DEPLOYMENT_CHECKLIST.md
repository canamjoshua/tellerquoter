# First Deployment Checklist

Use this checklist to ensure you complete all steps for your first AWS deployment.

## Pre-Deployment Checklist

### ☐ Local Environment Setup
- [ ] Terraform installed (version >= 1.6.0)
  ```bash
  terraform --version
  ```
- [ ] AWS CLI installed and configured
  ```bash
  aws --version
  aws configure list
  ```
- [ ] Git repository cloned locally
- [ ] Review [DEPLOYMENT.md](DEPLOYMENT.md) documentation

### ☐ AWS Account Preparation
- [ ] AWS account accessible
- [ ] IAM user with appropriate permissions (or admin access)
- [ ] Billing alerts configured (recommended)
- [ ] Understand estimated costs (~$60/month)

### ☐ Route53 Configuration
- [ ] Existing hosted zone for `internal.canamtechnologies.com`
- [ ] Note down the Hosted Zone ID:
  ```bash
  aws route53 list-hosted-zones
  ```
  Zone ID: `________________________`

### ☐ EC2 Key Pair
- [ ] Create EC2 key pair:
  ```bash
  aws ec2 create-key-pair \
    --key-name tellerquoter-staging \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/tellerquoter-staging.pem
  chmod 400 ~/.ssh/tellerquoter-staging.pem
  ```
- [ ] Verify key file exists:
  ```bash
  ls -l ~/.ssh/tellerquoter-staging.pem
  ```

### ☐ Generate Secure Passwords
- [ ] Generate database password:
  ```bash
  openssl rand -base64 32
  ```
  Password: `________________________` (save securely!)

## Infrastructure Deployment

### ☐ Configure Terraform
- [ ] Copy example configuration:
  ```bash
  cd terraform
  cp terraform.tfvars.example terraform.tfvars
  ```
- [ ] Edit `terraform.tfvars` with your values:
  - [ ] `aws_region` (default: us-east-1)
  - [ ] `ec2_key_name` = "tellerquoter-staging"
  - [ ] `db_password` = (generated password)
  - [ ] `domain_name` = "staging.tellerquoter.internal.canamtechnologies.com"
  - [ ] `route53_zone_id` = (your zone ID)
  - [ ] `alarm_email` = (your email)

### ☐ Initialize Terraform
- [ ] Initialize Terraform:
  ```bash
  cd terraform
  terraform init
  ```
- [ ] Expected output: "Terraform has been successfully initialized!"

### ☐ Validate Configuration
- [ ] Validate syntax:
  ```bash
  terraform validate
  ```
- [ ] Review planned changes:
  ```bash
  terraform plan
  ```
- [ ] Verify approximately 40-50 resources will be created

### ☐ Deploy Infrastructure
- [ ] Apply configuration:
  ```bash
  terraform apply
  # or use helper script
  ../scripts/terraform-apply.sh staging
  ```
- [ ] Type `yes` when prompted
- [ ] Wait 10-15 minutes for completion
- [ ] Save outputs:
  ```bash
  terraform output > ../infrastructure-outputs.txt
  ```

### ☐ Post-Infrastructure Checks
- [ ] Note down EC2 public IP:
  ```bash
  terraform output ec2_public_ip
  ```
  IP Address: `________________________`
- [ ] Note down RDS endpoint:
  ```bash
  terraform output rds_endpoint
  ```
  Endpoint: `________________________`

## Certificate and DNS Configuration

### ☐ SNS Subscription
- [ ] Check email for SNS subscription confirmation
- [ ] Click confirmation link in email
- [ ] Verify subscription in AWS Console

### ☐ ACM Certificate Validation
- [ ] Check certificate status:
  ```bash
  aws acm describe-certificate \
    --certificate-arn $(terraform output -raw certificate_arn) \
    --query 'Certificate.Status'
  ```
- [ ] Wait until status shows "ISSUED" (5-10 minutes)
- [ ] Verify DNS validation records in Route53:
  ```bash
  aws route53 list-resource-record-sets \
    --hosted-zone-id YOUR_ZONE_ID \
    --query "ResourceRecordSets[?Type=='CNAME']"
  ```

### ☐ DNS Resolution
- [ ] Test DNS resolution:
  ```bash
  nslookup staging.tellerquoter.internal.canamtechnologies.com
  ```
- [ ] Should resolve to ALB DNS name

## Application Deployment

### ☐ GitHub Actions Setup (Recommended)
- [ ] Go to GitHub repository → Settings → Secrets
- [ ] Add `AWS_ACCESS_KEY_ID`:
  ```bash
  cat ~/.aws/credentials  # Copy from here
  ```
- [ ] Add `AWS_SECRET_ACCESS_KEY`:
  ```bash
  cat ~/.aws/credentials  # Copy from here
  ```
- [ ] Add `EC2_SSH_PRIVATE_KEY`:
  ```bash
  cat ~/.ssh/tellerquoter-staging.pem  # Copy entire file
  ```
- [ ] Verify workflow file exists:
  ```bash
  cat .github/workflows/deploy-staging.yml
  ```

### ☐ Initial Application Deployment

**Option A: GitHub Actions**
- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "Add AWS deployment configuration"
  ```
- [ ] Push to main branch:
  ```bash
  git push origin main
  ```
- [ ] Monitor GitHub Actions tab
- [ ] Wait for deployment to complete

**Option B: Manual Deployment**
- [ ] SSH to EC2 to verify connectivity:
  ```bash
  eval $(cd terraform && terraform output -raw ssh_command)
  ```
- [ ] Exit SSH
- [ ] Run deployment script:
  ```bash
  EC2_HOST=$(cd terraform && terraform output -raw ec2_public_ip) ./scripts/deploy.sh
  ```

## Verification

### ☐ Health Checks
- [ ] Test backend health:
  ```bash
  curl https://staging.tellerquoter.internal.canamtechnologies.com/health
  ```
  Expected: `{"status":"ok","timestamp":"..."}`

- [ ] Test frontend:
  ```bash
  open https://staging.tellerquoter.internal.canamtechnologies.com
  # or
  curl -I https://staging.tellerquoter.internal.canamtechnologies.com
  ```
  Expected: HTTP 200 OK

### ☐ EC2 Verification
- [ ] SSH to EC2:
  ```bash
  ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>
  ```
- [ ] Check Docker containers:
  ```bash
  cd /opt/tellerquoter
  docker-compose -f docker-compose.production.yml ps
  ```
  Expected: All containers running (Up)
- [ ] Check logs:
  ```bash
  docker-compose -f docker-compose.production.yml logs --tail=50
  ```
  Expected: No critical errors

### ☐ Database Verification
- [ ] Connect to database from EC2:
  ```bash
  psql -h <rds-endpoint> -U tellerquoter -d tellerquoter
  ```
- [ ] List tables:
  ```sql
  \dt
  ```
  Expected: See application tables
- [ ] Exit: `\q`

### ☐ ALB Health Checks
- [ ] Check target group health:
  ```bash
  aws elbv2 describe-target-health \
    --target-group-arn $(aws elbv2 describe-target-groups \
      --names tellerquoter-staging-backend-tg \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text)
  ```
  Expected: `State: healthy`

### ☐ CloudWatch Setup
- [ ] Access CloudWatch dashboard:
  ```bash
  cd terraform
  terraform output cloudwatch_dashboard_url
  ```
- [ ] Open URL in browser
- [ ] Verify metrics are being collected
- [ ] Check all alarms are in "OK" state (may take a few minutes)

### ☐ Application Testing
- [ ] Open application in browser
- [ ] Test core functionality:
  - [ ] Homepage loads
  - [ ] Navigation works
  - [ ] Quote builder accessible
  - [ ] API endpoints respond
- [ ] Check browser console for errors (F12)

## Post-Deployment

### ☐ Documentation
- [ ] Save infrastructure outputs:
  ```bash
  cd terraform
  terraform output > ../deployment-outputs-$(date +%Y%m%d).txt
  ```
- [ ] Document any custom configurations
- [ ] Note any issues encountered
- [ ] Update team wiki/documentation

### ☐ Security Review
- [ ] Review security group rules
- [ ] Verify SSH access (consider restricting to specific IPs)
- [ ] Confirm database is in private subnet
- [ ] Check IAM role permissions
- [ ] Verify HTTPS enforcement

### ☐ Monitoring Setup
- [ ] Verify email notifications work (trigger a test alarm)
- [ ] Set up CloudWatch dashboard bookmarks
- [ ] Configure additional alerts if needed
- [ ] Document escalation procedures

### ☐ Backup Verification
- [ ] Verify RDS automated backups are configured:
  ```bash
  aws rds describe-db-instances \
    --db-instance-identifier tellerquoter-staging-db \
    --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'
  ```
- [ ] Expected: 7 days retention
- [ ] Create manual snapshot for initial state:
  ```bash
  aws rds create-db-snapshot \
    --db-instance-identifier tellerquoter-staging-db \
    --db-snapshot-identifier tellerquoter-staging-initial-$(date +%Y%m%d)
  ```

### ☐ Team Handoff
- [ ] Share access credentials (securely)
- [ ] Provide [AWS_QUICK_REFERENCE.md](AWS_QUICK_REFERENCE.md) to team
- [ ] Document deployment process for team
- [ ] Schedule knowledge transfer session
- [ ] Share CloudWatch dashboard access

## Troubleshooting Common Issues

### Issue: Certificate validation stuck
**Solution:**
```bash
# Check Route53 validation records
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID | grep _acme-challenge

# If missing, rerun: terraform apply
```

### Issue: Cannot access application via domain
**Checklist:**
- [ ] Certificate validated (ISSUED status)?
- [ ] DNS record created in Route53?
- [ ] ALB listeners configured?
- [ ] Security groups allow HTTPS (443)?
- [ ] Target groups healthy?

### Issue: Containers not starting on EC2
**Solution:**
```bash
# SSH to EC2
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>

# Check user data log
sudo tail -100 /var/log/user-data.log

# Check Docker
docker ps -a
docker-compose -f /opt/tellerquoter/docker-compose.production.yml logs
```

### Issue: Database connection failed
**Checklist:**
- [ ] RDS instance running?
- [ ] Security group allows EC2 → RDS on port 5432?
- [ ] Environment variables correct on EC2?
- [ ] Password correct in .env.production?

## Cost Tracking

### ☐ Initial Cost Review
- [ ] Set up cost alerts in AWS:
  ```bash
  # Navigate to AWS Console → Billing → Budgets
  # Create budget for $100/month threshold
  ```
- [ ] Monitor costs daily for first week
- [ ] Review after first full month
- [ ] Document actual vs estimated costs

### ☐ Cost Optimization Review (After 1 Month)
- [ ] Review CloudWatch log retention (currently 7 days)
- [ ] Check RDS snapshot retention
- [ ] Verify no unused resources
- [ ] Consider Reserved Instances for production

## Success Criteria

### ✅ Deployment Successful When:
- [ ] Application accessible via HTTPS domain
- [ ] All health checks passing
- [ ] No critical alarms in CloudWatch
- [ ] Database accepting connections
- [ ] Logs being collected in CloudWatch
- [ ] Email notifications working
- [ ] Team can access and manage infrastructure
- [ ] Documentation complete

## Next Steps After Successful Deployment

1. [ ] Schedule review meeting with team
2. [ ] Plan production environment deployment
3. [ ] Set up staging → production promotion process
4. [ ] Create runbook for common operations
5. [ ] Document disaster recovery procedures
6. [ ] Plan infrastructure improvements
7. [ ] Schedule security review
8. [ ] Implement monitoring dashboards

---

## Quick Reference Card

**Key Commands:**
```bash
# Infrastructure
cd terraform && terraform apply

# Get EC2 IP
terraform output ec2_public_ip

# Deploy app
EC2_HOST=<ip> ./scripts/deploy.sh

# SSH to EC2
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>

# View logs
docker-compose -f /opt/tellerquoter/docker-compose.production.yml logs -f

# Health check
curl https://staging.tellerquoter.internal.canamtechnologies.com/health
```

**Important URLs:**
- Application: https://staging.tellerquoter.internal.canamtechnologies.com
- AWS Console: https://console.aws.amazon.com
- CloudWatch: [Get from terraform output]

---

**Date Deployed**: _______________
**Deployed By**: _______________
**Notes**: _______________________________________________
_________________________________________________________
_________________________________________________________

**🎉 Congratulations on your successful deployment! 🎉**
