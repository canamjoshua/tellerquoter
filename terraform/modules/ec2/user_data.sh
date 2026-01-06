#!/bin/bash
# User data script for TellerQuoter EC2 instance
# This script installs Docker, sets up the application, and starts services

set -e

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting user data script at $(date)"

# Update system
echo "Updating system packages..."
dnf update -y

# Install Docker
echo "Installing Docker..."
dnf install -y docker git

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
echo "Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.24.0"
curl -L "https://github.com/docker/compose/releases/download/v$${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install CloudWatch agent
echo "Installing CloudWatch agent..."
dnf install -y amazon-cloudwatch-agent

# Create application directory
APP_DIR="/opt/${project_name}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Create .env file with database configuration
echo "Creating environment configuration..."
cat > .env.production << EOF
# Database Configuration
POSTGRES_HOST=$(echo ${db_endpoint} | cut -d: -f1)
POSTGRES_PORT=5432
POSTGRES_DB=${db_name}
POSTGRES_USER=${db_username}
POSTGRES_PASSWORD=${db_password}

# Application Configuration
ENVIRONMENT=${environment}
BACKEND_PORT=${backend_port}
FRONTEND_PORT=${frontend_port}

# Backend environment
DATABASE_URL=postgresql://${db_username}:${db_password}@$(echo ${db_endpoint} | cut -d: -f1):5432/${db_name}
SECRET_KEY=$(openssl rand -hex 32)

# Frontend environment
VITE_API_URL=https://staging.tellerquoter.internal.canamtechnologies.com/api
EOF

# Set proper permissions
chown -R ec2-user:ec2-user "$APP_DIR"
chmod 600 "$APP_DIR/.env.production"

# Create deployment script
cat > /usr/local/bin/deploy-tellerquoter << 'DEPLOY_SCRIPT'
#!/bin/bash
# Deployment script for TellerQuoter
set -e

APP_DIR="/opt/${project_name}"
cd "$APP_DIR"

echo "Starting deployment at $(date)"

# Pull latest code
if [ -d ".git" ]; then
    git pull origin main
else
    # On first run, code will be deployed via GitHub Actions
    echo "Waiting for initial deployment..."
fi

# Pull latest images and restart
if [ -f "docker-compose.production.yml" ]; then
    docker-compose -f docker-compose.production.yml pull
    docker-compose -f docker-compose.production.yml up -d
    echo "Deployment completed at $(date)"
else
    echo "docker-compose.production.yml not found. Waiting for deployment..."
fi
DEPLOY_SCRIPT

chmod +x /usr/local/bin/deploy-tellerquoter

# Create systemd service for the application
cat > /etc/systemd/system/${project_name}.service << 'SERVICE'
[Unit]
Description=TellerQuoter Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/${project_name}
ExecStart=/usr/local/bin/docker-compose -f /opt/${project_name}/docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f /opt/${project_name}/docker-compose.production.yml down
User=ec2-user

[Install]
WantedBy=multi-user.target
SERVICE

# Create CloudWatch config
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'CWCONFIG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/${project_name}-${environment}",
            "log_stream_name": "{instance_id}/user-data"
          },
          {
            "file_path": "/opt/${project_name}/logs/*.log",
            "log_group_name": "/aws/ec2/${project_name}-${environment}",
            "log_stream_name": "{instance_id}/application"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "${project_name}/${environment}",
    "metrics_collected": {
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DiskUsedPercent"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MemoryUsedPercent"}
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
CWCONFIG

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

echo "User data script completed at $(date)"
echo "Application directory: $APP_DIR"
echo "To deploy the application, run: /usr/local/bin/deploy-tellerquoter"
