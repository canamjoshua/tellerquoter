#!/bin/bash
# Convenience script for seeding the database
# Usage:
#   ./seed_db.sh                 # Seed all data (keeps existing)
#   ./seed_db.sh --reset-all     # Clear and reseed all data
#   ./seed_db.sh --pricing-only  # Seed pricing data only
#   ./seed_db.sh --referrers-only # Seed referrers only

set -e

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the seeder
python -m app.seed_data.seeder "$@"
