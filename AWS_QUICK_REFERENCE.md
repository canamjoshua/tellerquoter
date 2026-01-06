# TellerQuoter AWS Quick Reference

Quick commands and tips for managing your AWS deployment.

## 🚀 Quick Commands

### Infrastructure

```bash
# Deploy infrastructure
cd terraform && terraform apply

# Get outputs
terraform output

# SSH to EC2
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@$(terraform output -raw ec2_public_ip)

# Destroy infrastructure
terraform destroy
```

### Application Deployment

```bash
# Deploy via script
EC2_HOST=$(cd terraform && terraform output -raw ec2_public_ip) ./scripts/deploy.sh

# Or push to main branch for automatic GitHub Actions deployment
git push origin main
```

### Monitoring

```bash
# View CloudWatch dashboard
terraform output cloudwatch_dashboard_url

# View application logs on EC2
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip> \
  'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml logs -f'

# Check container status
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip> \
  'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml ps'
```

### Database

```bash
# Connect to database from EC2
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>
psql -h <rds-endpoint> -U tellerquoter -d tellerquoter

# Run migrations
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip> \
  'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml exec backend alembic upgrade head'

# Create database backup
aws rds create-db-snapshot \
  --db-instance-identifier tellerquoter-staging-db \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d-%H%M%S)
```

## 🔗 Important URLs

| Resource | URL |
|----------|-----|
| **Application** | https://staging.tellerquoter.internal.canamtechnologies.com |
| **API Health** | https://staging.tellerquoter.internal.canamtechnologies.com/health |
| **AWS Console** | https://console.aws.amazon.com |
| **CloudWatch** | Get URL: `cd terraform && terraform output cloudwatch_dashboard_url` |

## 📊 Resource Names

All resources are tagged with:
- `Project: TellerQuoter`
- `Environment: staging`
- `ManagedBy: Terraform`

### EC2
- **Name**: `tellerquoter-staging-app`
- **Instance Type**: t3.small
- **AMI**: Amazon Linux 2023

### RDS
- **Identifier**: `tellerquoter-staging-db`
- **Instance Class**: db.t3.micro
- **Engine**: PostgreSQL 15.5

### ALB
- **Name**: `tellerquoter-staging-alb`
- **Scheme**: Internet-facing
- **Type**: Application Load Balancer

### VPC
- **Name**: `tellerquoter-staging-vpc`
- **CIDR**: 10.0.0.0/16

## 🔐 Security

### SSH Access

```bash
# Key location
~/.ssh/tellerquoter-staging.pem

# Permissions must be 400
chmod 400 ~/.ssh/tellerquoter-staging.pem
```

### Secrets Management

| Secret | Location |
|--------|----------|
| Database Password | `terraform.tfvars` (local), `.env.production` (EC2) |
| AWS Credentials | GitHub Secrets |
| SSH Keys | GitHub Secrets, Local `~/.ssh/` |

### Security Groups

| Name | Purpose | Ports |
|------|---------|-------|
| `tellerquoter-staging-alb-sg` | ALB traffic | 80, 443 |
| `tellerquoter-staging-ec2-sg` | EC2 instance | 22, 3000, 8000 |
| `tellerquoter-staging-rds-sg` | RDS database | 5432 (from EC2 only) |

## 🚨 CloudWatch Alarms

All alarms send notifications to SNS topic. Check your email for alerts.

| Alarm | Threshold | Action |
|-------|-----------|--------|
| EC2 High CPU | > 80% for 10min | Investigate load, consider scaling |
| RDS High CPU | > 80% for 10min | Check slow queries, consider scaling |
| RDS Low Storage | < 2GB free | Clean up old data or increase storage |
| ALB Unhealthy Targets | > 0 for 2min | Check application health, logs |
| ALB 5XX Errors | > 10 in 5min | Check application logs for errors |

## 🛠️ Common Tasks

### Restart Application

```bash
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>
cd /opt/tellerquoter
docker-compose -f docker-compose.production.yml restart
```

### Update Environment Variables

```bash
# 1. SSH to EC2
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>

# 2. Edit .env.production
cd /opt/tellerquoter
nano .env.production

# 3. Restart containers
docker-compose -f docker-compose.production.yml restart
```

### View Real-time Logs

```bash
# All services
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip> \
  'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml logs -f'

# Backend only
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip> \
  'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml logs -f backend'

# Frontend only
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip> \
  'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml logs -f frontend'
```

### Scale Instance Size

```bash
# 1. Edit terraform.tfvars
cd terraform
nano terraform.tfvars
# Change: ec2_instance_type = "t3.medium"

# 2. Apply changes (will restart instance)
terraform apply

# 3. Verify
terraform output ec2_instance_id
aws ec2 describe-instances --instance-ids <instance-id>
```

### Database Maintenance

```bash
# Check database size
ssh -i ~/.ssh/tellerquoter-staging.pem ec2-user@<ip>
psql -h <rds-endpoint> -U tellerquoter -d tellerquoter -c "\l+"

# Vacuum database
psql -h <rds-endpoint> -U tellerquoter -d tellerquoter -c "VACUUM ANALYZE;"

# View active connections
psql -h <rds-endpoint> -U tellerquoter -d tellerquoter -c "SELECT * FROM pg_stat_activity;"
```

### Certificate Renewal

ACM certificates auto-renew, but to check status:

```bash
aws acm describe-certificate \
  --certificate-arn $(cd terraform && terraform output -raw certificate_arn) \
  --query 'Certificate.[DomainName,Status,NotAfter]'
```

## 💰 Cost Management

### Check Current Costs

```bash
# Last 30 days
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://<(cat <<EOF
{
  "Tags": {
    "Key": "Project",
    "Values": ["TellerQuoter"]
  }
}
EOF
)
```

### Monthly Cost Breakdown

| Service | Est. Monthly Cost |
|---------|------------------|
| EC2 t3.small | ~$15 |
| RDS db.t3.micro | ~$15 |
| ALB | ~$20 |
| Data Transfer | ~$5 |
| CloudWatch | ~$5 |
| **Total** | **~$60** |

### Cost Optimization Tips

1. **Stop EC2 when not in use** (staging only):
   ```bash
   aws ec2 stop-instances --instance-ids $(cd terraform && terraform output -raw ec2_instance_id)
   aws ec2 start-instances --instance-ids $(cd terraform && terraform output -raw ec2_instance_id)
   ```

2. **Reduce backup retention**: Edit `terraform.tfvars`:
   ```hcl
   backup_retention_period = 3  # Default is 7
   ```

3. **Use CloudWatch Logs Insights** instead of exporting all logs

4. **Delete old snapshots**:
   ```bash
   aws rds describe-db-snapshots --query 'DBSnapshots[?SnapshotCreateTime<`2024-01-01`]'
   # Delete old ones manually or with script
   ```

## 🔧 Troubleshooting

### Application Not Responding

```bash
# 1. Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <get-from-console>

# 2. Check container status
ssh ec2-user@<ip> 'docker ps'

# 3. Check logs for errors
ssh ec2-user@<ip> 'cd /opt/tellerquoter && docker-compose logs --tail=100'

# 4. Restart if needed
ssh ec2-user@<ip> 'cd /opt/tellerquoter && docker-compose restart'
```

### Database Connection Failed

```bash
# 1. Check RDS status
aws rds describe-db-instances --db-instance-identifier tellerquoter-staging-db

# 2. Test connection from EC2
ssh ec2-user@<ip>
telnet <rds-endpoint> 5432

# 3. Check security groups
aws ec2 describe-security-groups --filters "Name=tag:Name,Values=*rds*"
```

### Certificate Issues

```bash
# Check certificate status
aws acm describe-certificate --certificate-arn <arn>

# Check DNS validation records
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --query "ResourceRecordSets[?Type=='CNAME']"
```

### High CPU Usage

```bash
# Check what's using CPU
ssh ec2-user@<ip>
top
docker stats

# Check application metrics
# View CloudWatch dashboard
```

## 📚 Additional Resources

- **Full Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Terraform Details**: [terraform/README.md](terraform/README.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **AWS Documentation**: https://docs.aws.amazon.com
- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## 🆘 Emergency Contacts

| Issue | Contact |
|-------|---------|
| Infrastructure | DevOps Team |
| Application Bugs | Development Team |
| Security Issues | Security Team |
| AWS Account | Account Administrator |

## 📝 Change Log Template

When making infrastructure changes, document them:

```markdown
## YYYY-MM-DD - Change Description

**Changed By**: Your Name
**Reason**: Why the change was made
**Changes**:
- Modified X resource
- Added Y configuration
**Testing**: How the change was tested
**Rollback Plan**: How to revert if needed
```

---

**Last Updated**: 2026-01-06
**Maintained By**: DevOps Team
