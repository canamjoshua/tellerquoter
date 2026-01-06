#!/bin/bash
# Terraform apply script with safety checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"
TERRAFORM_DIR="terraform"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}TellerQuoter Terraform Deployment${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if terraform.tfvars exists
if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    echo -e "${RED}Error: terraform.tfvars not found${NC}"
    echo "Please create terraform.tfvars from terraform.tfvars.example"
    exit 1
fi

cd "$TERRAFORM_DIR"

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init

# Validate configuration
echo -e "${YELLOW}Validating Terraform configuration...${NC}"
terraform validate

# Format check
echo -e "${YELLOW}Checking Terraform formatting...${NC}"
terraform fmt -check || {
    echo -e "${YELLOW}Formatting issues found. Running terraform fmt...${NC}"
    terraform fmt -recursive
}

# Plan
echo -e "${YELLOW}Generating Terraform plan...${NC}"
terraform plan -out=tfplan

# Ask for confirmation
echo ""
echo -e "${YELLOW}Review the plan above.${NC}"
read -p "Do you want to apply these changes? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    rm tfplan
    exit 0
fi

# Apply
echo -e "${YELLOW}Applying Terraform changes...${NC}"
terraform apply tfplan

# Clean up plan file
rm tfplan

# Output results
echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Terraform deployment completed!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "Infrastructure outputs:"
terraform output

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check your email for SNS subscription confirmation"
echo "2. Wait for ACM certificate validation (may take a few minutes)"
echo "3. Deploy the application using: ./scripts/deploy.sh"
