# Dev Container for TellerQuoter
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    build-essential \
    libpq-dev \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Create directories for volumes and set ownership for vscode user
# This ensures proper permissions when Docker volumes are mounted
RUN mkdir -p /home/vscode/.vscode-server \
    /home/vscode/.npm \
    /home/vscode/.cache/pip \
    /home/vscode/.claude \
    && chown -R vscode:vscode /home/vscode/.vscode-server \
       /home/vscode/.npm \
       /home/vscode/.cache \
       /home/vscode/.claude

# Create workspace directory
WORKDIR /workspace

# Set default shell to bash
SHELL ["/bin/bash", "-c"]
