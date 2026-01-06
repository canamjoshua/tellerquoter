#!/bin/bash
set -e

echo "🚀 Setting up TellerQuoter development environment..."

# Check for secrets file
if [ ! -f /workspace/.devcontainer/secrets.env ]; then
    echo ""
    echo "⚠️  No secrets.env found!"
    echo "   Copy secrets.env.example to secrets.env and add your API keys:"
    echo "   cp .devcontainer/secrets.env.example .devcontainer/secrets.env"
    echo ""
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspace/frontend
npm install

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
cd /workspace
npx playwright install --with-deps chromium

# Install backend dependencies
echo "🐍 Installing backend dependencies..."
cd /workspace/backend
pip install --user -r requirements.txt
pip install --user -r requirements-dev.txt

# Install Claude Code CLI
echo "🤖 Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code

echo "✅ Development environment ready!"
echo ""
echo "Quick start:"
echo "  Frontend: cd frontend && npm run dev"
echo "  Backend:  cd backend && uvicorn app.main:app --reload"
echo "  Tests:    npm run test:e2e"
echo "  Claude:   claude"
echo ""

# Verify Claude Code auth is available
if [ -d "$HOME/.claude" ]; then
    echo "✅ Claude Code config directory mounted from host"
    echo "   Your team OAuth credentials should work automatically."
    echo "   If not, run 'claude' and it will prompt you to log in."
else
    echo "⚠️  Claude Code config not found."
    echo "   Run 'claude' inside the container to authenticate."
fi
