#!/bin/bash
# Deployment script for TellerQuoter application
# This script deploys the application to the EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${ENVIRONMENT:-staging}"
EC2_HOST="${EC2_HOST}"
EC2_USER="${EC2_USER:-ec2-user}"
KEY_PATH="${KEY_PATH:-~/.ssh/tellerquoter-${ENVIRONMENT}.pem}"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}TellerQuoter Deployment Script${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check required environment variables
if [ -z "$EC2_HOST" ]; then
    echo -e "${RED}Error: EC2_HOST environment variable not set${NC}"
    echo "Usage: EC2_HOST=<ip-address> ./scripts/deploy.sh"
    exit 1
fi

# Check if key file exists
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at $KEY_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploying to: ${EC2_USER}@${EC2_HOST}${NC}"

# Create temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy necessary files to temp directory
echo -e "${YELLOW}Preparing deployment files...${NC}"
cp docker-compose.production.yml "$TEMP_DIR/"
cp backend/Dockerfile.production "$TEMP_DIR/Dockerfile.backend"
cp frontend/Dockerfile.production "$TEMP_DIR/Dockerfile.frontend"

# Create tarball
cd "$TEMP_DIR"
tar czf deployment.tar.gz *
cd - > /dev/null

# Upload deployment files
echo -e "${YELLOW}Uploading files to EC2...${NC}"
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no \
    "$TEMP_DIR/deployment.tar.gz" \
    "${EC2_USER}@${EC2_HOST}:/tmp/"

# Execute deployment on EC2
echo -e "${YELLOW}Executing deployment on EC2...${NC}"
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "${EC2_USER}@${EC2_HOST}" << 'ENDSSH'
set -e

APP_DIR="/opt/tellerquoter"
cd "$APP_DIR"

# Extract deployment files
echo "Extracting deployment files..."
tar xzf /tmp/deployment.tar.gz -C "$APP_DIR"
rm /tmp/deployment.tar.gz

# Stop existing containers
echo "Stopping existing containers..."
if [ -f docker-compose.production.yml ]; then
    docker-compose -f docker-compose.production.yml down || true
fi

# Build and start new containers
echo "Building and starting containers..."
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check container status
docker-compose -f docker-compose.production.yml ps

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.production.yml exec -T backend alembic upgrade head

echo "Deployment completed successfully!"
ENDSSH

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "Application URLs:"
echo "  - Frontend: https://staging.tellerquoter.internal.canamtechnologies.com"
echo "  - Backend API: https://staging.tellerquoter.internal.canamtechnologies.com/api"
echo "  - Health Check: https://staging.tellerquoter.internal.canamtechnologies.com/health"
echo ""
echo "To view logs:"
echo "  ssh -i $KEY_PATH ${EC2_USER}@${EC2_HOST} 'cd /opt/tellerquoter && docker-compose -f docker-compose.production.yml logs -f'"
