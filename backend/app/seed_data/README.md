## Data Seeding System

The Teller Quoting System includes a comprehensive data seeding system that allows you to:
- Initialize a fresh database with production-ready data
- Reset the database to a known good state for testing
- Load specific data sets for different scenarios
- Maintain consistent test data across development environments

### Quick Start

#### Seed All Data (Recommended for First Time)
```bash
cd backend
./seed_db.sh --reset-all
```

This will:
1. Clear all existing data (preserves schema)
2. Load Pricing Version 2025.1 (Requirements v1.7)
3. Load all 26 active SKUs with proper categorization
4. Load 6 deprecated SKUs for historical quote support
5. Load 3 referrers
6. Load 3 travel zones
7. Load 3 SaaS products
8. Load 6 text snippets

#### Add Data Without Clearing
```bash
cd backend
./seed_db.sh
```

This is idempotent - it will skip records that already exist based on unique keys.

#### Seed Specific Data
```bash
# Pricing data only (version, SKUs, zones, products, snippets)
./seed_db.sh --pricing-only

# Referrers only (global data)
./seed_db.sh --referrers-only
```

### Python API

You can also use the seeder programmatically:

```python
from app.seed_data import DataSeeder

# Initialize seeder
seeder = DataSeeder()

# Seed all data
seeder.seed_all(clear_first=True)

# Or seed specific tables
version_id = seeder.seed_pricing_version()
seeder.seed_skus(version_id)
seeder.seed_referrers()
```

### Data Structure

#### Pricing Version 2025.1 (Requirements v1.7)

**26 Active SKUs**:
- **Organization Setup (3)**: Basic, Medium, Large - All $23,920, 104 hrs, Earmarked ⚠️
- **Training (3)**: Training Suite ($12,880), Revenue ($1,840), Org Admin ($920)
- **Hardware (4)**: Terminals ($2,500-$3,800), Scanner ($1,200), Printer ($450)
- **Services (12)**: Check Recognition, Data Migration, Custom Dev, Reports, PM, Credit Integration, Workflow, Teller Online tiers
- **Travel (1)**: Zone-based calculation

**6 Deprecated SKUs** (IsActive=false):
- 5 individual training courses (replaced by Training Suite)
- 1 generic Teller Online addon (replaced by tiered options)

**Earmarked SKUs** (8 total - pricing subject to change):
- All 3 Organization Setup tiers
- Check Recognition & ICL
- Both Credit Integration options
- Workflow Submission Setup (TBD pricing)

**TBD Pricing** (2 SKUs):
- Workflow Submission Setup (price and hours)
- Travel (calculated per zone)

### Travel Zones

| Zone | Name | Daily Rate | Hotel | Airfare |
|------|------|-----------|-------|---------|
| ZONE-A | Local (< 50 mi) | $150 | - | - |
| ZONE-B | Regional (50-250 mi) | $200 | $150 | - |
| ZONE-C | National (250+ mi) | $250 | $175 | $500 |

### SaaS Products (Tiered Pricing)

| Product | Category | Tier 1 (1-10) | Tier 2 (11-50) | Tier 3 (51+) |
|---------|----------|---------------|----------------|--------------|
| Core Platform | Core (Required) | $125 | $100 | $85 |
| Mobile Access | Optional | $25 | $20 | $15 |
| Analytics | Optional | $50 | $40 | $30 |

### Referrers (Global)

- ABC Financial Partners (5%)
- Tech Solutions Group (7.5%)
- Direct Sales (0%)

### Text Snippets (6)

- Proposal introductions (Standard, Enterprise)
- Legal terms (Payment, Warranty, Assumptions)
- Contact information footer

### Testing Workflow

**Recommended Testing Cycle**:

1. **Start Fresh**:
   ```bash
   ./seed_db.sh --reset-all
   ```

2. **Manual Testing**:
   - Create quotes using the admin UI
   - Test different SKU combinations
   - Verify earmarked warnings
   - Test TBD pricing handling

3. **Reset for Next Test**:
   ```bash
   ./seed_db.sh --reset-all
   ```

4. **Automated Tests**:
   - Tests can use the seeder to set up test data
   - Each test suite can reset to known state

### Extending the Seed Data

To add more seed data:

1. **Edit `pricing_v1_7.py`**:
   ```python
   # Add to existing lists
   SKU_DEFINITIONS.append({
       "SKUCode": "NEW-SKU",
       "Name": "New SKU",
       # ... other fields
   })
   ```

2. **Create Version-Specific Files**:
   ```python
   # Create pricing_v1_8.py for future versions
   from app.seed_data.pricing_v1_8 import *
   ```

3. **Update `seeder.py`**:
   ```python
   # Import new data file
   from app.seed_data.pricing_v1_8 import PRICING_VERSION as V1_8
   ```

### Production Deployment

**For Production**:
```bash
# Only run once on fresh production database
./seed_db.sh --reset-all
```

**After Schema Changes**:
```bash
# Run migrations first
alembic upgrade head

# Then seed data
./seed_db.sh
```

### Troubleshooting

**Error: "no such file or directory: venv"**
```bash
# Create virtual environment first
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Error: "relation does not exist"**
```bash
# Run migrations first
alembic upgrade head
```

**Error: "duplicate key value violates unique constraint"**
```bash
# Data already exists, use --reset-all to clear first
./seed_db.sh --reset-all
```

**Want to preserve some data?**
```python
# Use Python API for selective seeding
from app.seed_data import DataSeeder

seeder = DataSeeder()
# Only seed what you need
seeder.seed_referrers()  # Won't clear other tables
```

### Data Versioning

The seed data is versioned alongside requirements:

- **v1.7**: Current seed data (pricing_v1_7.py)
- **v1.5**: Historical (can be recreated if needed)
- **v2.0**: Future versions can be added as new files

This allows you to:
- Recreate any historical pricing version
- Test migration paths between versions
- Maintain multiple concurrent versions for testing

### Best Practices

1. **Always use `--reset-all` for testing cycles**
   - Ensures clean, known state
   - Prevents data pollution between tests

2. **Version your seed data files**
   - Keep historical versions for reference
   - Document changes between versions

3. **Use meaningful data**
   - Seed data should resemble production data
   - Include edge cases (TBD pricing, earmarked items)

4. **Test the seeder itself**
   - Run seeder multiple times
   - Verify idempotency
   - Check foreign key relationships

5. **Document custom scenarios**
   - If you need specific test scenarios
   - Create separate seed data files
   - Document in this README

### CLI Reference

```bash
# Full reset and reseed
./seed_db.sh --reset-all

# Add data (idempotent)
./seed_db.sh

# Pricing only
./seed_db.sh --pricing-only

# Referrers only
./seed_db.sh --referrers-only

# Custom database URL
./seed_db.sh --db-url "postgresql://user:pass@localhost/db"

# Python module
python -m app.seed_data.seeder --reset-all

# With logging
python -m app.seed_data.seeder --reset-all 2>&1 | tee seed.log
```

### Support

For questions or issues with the seeding system:
1. Check this README first
2. Review the seed data files in `app/seed_data/`
3. Check the logs for specific errors
4. Contact the development team

---

**Last Updated**: December 2025
**Current Version**: v1.7 (Requirements v1.7)
**Seed Data Files**: `pricing_v1_7.py`, `seeder.py`
