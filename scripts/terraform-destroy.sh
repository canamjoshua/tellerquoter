#!/bin/bash
# Terraform destroy script with safety checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"
TERRAFORM_DIR="terraform"

echo -e "${RED}=====================================${NC}"
echo -e "${RED}TellerQuoter Infrastructure Destruction${NC}"
echo -e "${RED}Environment: ${ENVIRONMENT}${NC}"
echo -e "${RED}=====================================${NC}"

cd "$TERRAFORM_DIR"

# Show what will be destroyed
echo -e "${YELLOW}Generating destruction plan...${NC}"
terraform plan -destroy

# Ask for confirmation
echo ""
echo -e "${RED}WARNING: This will destroy all infrastructure!${NC}"
echo -e "${RED}This action cannot be undone!${NC}"
echo ""
read -p "Type 'destroy-${ENVIRONMENT}' to confirm: " CONFIRM

if [ "$CONFIRM" != "destroy-${ENVIRONMENT}" ]; then
    echo -e "${GREEN}Destruction cancelled${NC}"
    exit 0
fi

# Final confirmation
read -p "Are you absolutely sure? (yes/no): " FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "yes" ]; then
    echo -e "${GREEN}Destruction cancelled${NC}"
    exit 0
fi

# Destroy
echo -e "${RED}Destroying infrastructure...${NC}"
terraform destroy -auto-approve

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Infrastructure destroyed${NC}"
echo -e "${GREEN}=====================================${NC}"
