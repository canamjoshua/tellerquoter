#!/bin/bash
# Script to stop the standalone tellerquoter-db container
# Run this from your HOST machine (not inside the dev container)

echo "Stopping standalone tellerquoter-db container..."

# Stop the container
docker stop tellerquoter-db 2>/dev/null || echo "Container tellerquoter-db not running"

# Remove the container
docker rm tellerquoter-db 2>/dev/null || echo "Container tellerquoter-db already removed"

# Optionally, remove the volume (uncomment if you want to delete data)
# docker volume rm tellerquoter_postgres_data 2>/dev/null || echo "Volume already removed"

# Disable auto-start if it was set
docker update --restart=no tellerquoter-db 2>/dev/null || echo "Container already removed or restart policy not set"

echo "Done! The standalone database container has been stopped and will not auto-start."
echo ""
echo "To completely remove the data volume, run:"
echo "  docker volume rm tellerquoter_postgres_data"
