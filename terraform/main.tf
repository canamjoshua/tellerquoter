# Main Terraform configuration for TellerQuoter AWS deployment
# This is the root module that orchestrates all resources

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state storage
  # Uncomment and configure after creating S3 bucket for state
  # backend "s3" {
  #   bucket         = "tellerquoter-terraform-state"
  #   key            = "staging/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TellerQuoter"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
  project_name       = var.project_name
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  environment          = var.environment
  project_name         = var.project_name
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  ec2_security_group_id = module.ec2.security_group_id

  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  db_instance_class   = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  backup_retention_period = var.backup_retention_period
}

# ACM Certificate Module
module "acm" {
  source = "./modules/acm"

  domain_name      = var.domain_name
  route53_zone_id  = var.route53_zone_id
  environment      = var.environment
  project_name     = var.project_name
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  environment           = var.environment
  project_name          = var.project_name
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = module.vpc.public_subnet_ids
  certificate_arn      = module.acm.certificate_arn
  health_check_path    = "/health"
}

# EC2 Instance Module
module "ec2" {
  source = "./modules/ec2"

  environment          = var.environment
  project_name         = var.project_name
  vpc_id              = module.vpc.vpc_id
  public_subnet_id    = module.vpc.public_subnet_ids[0]
  instance_type       = var.ec2_instance_type
  key_name            = var.ec2_key_name
  alb_security_group_id = module.alb.alb_security_group_id

  # Database connection details
  db_endpoint         = module.rds.db_endpoint
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password

  # Application configuration
  backend_port        = 8000
  frontend_port       = 3000
}

# Route53 DNS Module
module "route53" {
  source = "./modules/route53"

  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
  alb_dns_name    = module.alb.alb_dns_name
  alb_zone_id     = module.alb.alb_zone_id
  environment     = var.environment
}

# CloudWatch Monitoring Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment       = var.environment
  project_name      = var.project_name
  ec2_instance_id   = module.ec2.instance_id
  rds_instance_id   = module.rds.db_instance_id
  alb_arn_suffix    = module.alb.alb_arn_suffix
  target_group_arn_suffix = module.alb.target_group_arn_suffix
  alarm_email       = var.alarm_email
}
