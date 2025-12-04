# Development Quick Start Guide

Quick reference for developers working on the Teller Quoting System.

## 🚀 Before You Start Coding

### 1. Understand the Requirements
- Read [Teller_Quoting_System_Requirements_v1.5.md](Teller_Quoting_System_Requirements_v1.5.md)
- Review the specific section relevant to your task
- Check Appendix A for design rationale

### 2. Review the Implementation Plan
- See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for architecture
- Understand the database schema (Section 2)
- Review API design (Section 3)

### 3. Follow Development Standards
- See [IMPLEMENTATION_PLAN.md Section 9](IMPLEMENTATION_PLAN.md#9-development-standards--best-practices)
- Review naming conventions
- Understand testing requirements

## 🔧 Environment Setup

**IMPORTANT: Always use the virtual environment for backend development!**

```bash
# Backend: Use venv for ALL Python commands
cd backend
source venv/bin/activate

# Then you can use alembic, pytest, etc.
alembic upgrade head
pytest tests/

# When done
deactivate
```

## 📝 Naming Conventions Cheat Sheet

### Database (PostgreSQL)
```sql
-- Tables: PascalCase
CREATE TABLE PricingVersions (...);
CREATE TABLE QuoteVersions (...);
CREATE TABLE SKUDefinitions (...);

-- Columns: PascalCase
PricingVersionId UUID
CreatedAt TIMESTAMP
IsActive BOOLEAN

-- Indexes: idx_{table}_{column}
CREATE INDEX idx_quotes_client_name ON Quotes(client_name);

-- Foreign Keys: {referenced_table_singular}_id
quote_id UUID REFERENCES Quotes(id)
PricingVersionId UUID REFERENCES PricingVersions(id)
```

### Python (Backend)
```python
# Classes: PascalCase
class QuoteService:
class PricingVersionRepository:

# Functions/Methods: snake_case
def calculate_saas_tiers():
def generate_order_form():

# Variables: snake_case
total_saas_monthly = 2950
pricing_version = get_version()

# Constants: SCREAMING_SNAKE_CASE
DEFAULT_PROJECTION_YEARS = 5
MAX_QUOTE_VERSIONS = 100

# Private methods: prefix with _
def _validate_pricing_version():
```

### TypeScript (Frontend)
```typescript
// Components: PascalCase
const QuoteBuilder = () => { ... }
const SaaSProductSelector = () => { ... }

// Hooks: camelCase with 'use' prefix
const useQuotes = () => { ... }
const usePricingVersions = () => { ... }

// Functions: camelCase
function calculateTotals() { ... }
function formatCurrency() { ... }

// Variables: camelCase
const quoteVersion = ...
const totalSaasMonthly = ...

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api...'
const DEFAULT_TIMEOUT = 30000

// Types/Interfaces: PascalCase
interface Quote { ... }
type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED'
```

## ✅ TDD Workflow (MANDATORY)

### The Red-Green-Refactor Cycle

```bash
# 1. RED - Write failing test first
# File: tests/unit/test_calculations.py
def test_level_loading_calculation():
    escalated = [35400, 36816, 38289, 39820, 41413]
    result = calculate_level_loading(escalated)
    assert result == pytest.approx(38347.60, rel=0.01)

# Run test - it SHOULD FAIL (function doesn't exist yet)
$ pytest tests/unit/test_calculations.py::test_level_loading_calculation
# FAILED - NameError: name 'calculate_level_loading' is not defined

# 2. GREEN - Write minimum code to pass
# File: app/core/calculations/saas_pricing.py
def calculate_level_loading(escalated_costs: list[float]) -> float:
    """Calculate level loaded annual amount."""
    return sum(escalated_costs) / len(escalated_costs)

# Run test - it SHOULD PASS
$ pytest tests/unit/test_calculations.py::test_level_loading_calculation
# PASSED

# 3. REFACTOR - Improve while keeping green
def calculate_level_loading(escalated_costs: list[float]) -> float:
    """
    Calculate level loaded annual amount.

    Args:
        escalated_costs: List of annual costs with escalation applied

    Returns:
        Constant annual amount (revenue neutral)

    Raises:
        ValueError: If escalated_costs is empty
    """
    if not escalated_costs:
        raise ValueError("Cannot calculate level loading for empty list")

    total = sum(escalated_costs)
    years = len(escalated_costs)
    return total / years

# Run test again - STILL PASSES
$ pytest tests/unit/test_calculations.py::test_level_loading_calculation
# PASSED
```

## 🧪 Pre-Commit Checklist

**Run these commands BEFORE every commit:**

### Backend
```bash
cd backend

# 1. Type checking
mypy app/ --strict

# 2. Linting
ruff check .
black --check .

# 3. Run ALL tests
pytest tests/ -v --cov=app --cov-fail-under=80

# 4. Security scan
bandit -r app/

# If all pass, you're good to commit!
```

### Frontend
```bash
cd frontend

# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Run ALL tests
npm test

# 4. Build check
npm run build

# If all pass, you're good to commit!
```

### Install Pre-Commit Hook (Automate This!)
```bash
# Copy the pre-commit hook
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Now it runs automatically on every commit!
```

## 📊 Test Coverage Requirements

| Code Type | Minimum Coverage | Enforcement |
|-----------|-----------------|-------------|
| **Business Logic** (calculations, services) | **95%** | ❌ CI/CD blocks merge if < 95% |
| **API Endpoints** | **90%** | ❌ CI/CD blocks merge if < 90% |
| **Utilities** | **90%** | ❌ CI/CD blocks merge if < 90% |
| **UI Components** | **70%** | ⚠️ CI/CD warns if < 70% |
| **Overall Project** | **80%** | ❌ CI/CD blocks merge if < 80% |

## 🎯 Integration Test Examples (REQUIRED)

Every major example from requirements MUST have an integration test:

### Example 1: City of Fond du Lac Quote
```python
# File: tests/integration/test_fond_du_lac_quote.py
def test_fond_du_lac_quote_integration():
    """
    Test City of Fond du Lac reference implementation.
    Requirements: Appendix B.5
    """
    # Setup
    pricing_version = create_pricing_version("2025.1")
    quote = create_quote(client_name="City of Fond du Lac", client_state="WI")

    # Add all SaaS products
    add_saas_product(quote, "TELLER_STANDARD", quantity=1)
    add_saas_product(quote, "CHECK_RECOGNITION", annual_scans=60000)
    # ... (see Section 9.2.3 for full example)

    # Verify totals
    totals = calculate_quote_totals(quote)
    assert totals.total_setup_packages == pytest.approx(213840, rel=0.02)
```

### Example 2: Multi-Year Projection with Level Loading
```python
# File: tests/integration/test_multi_year_projection.py
def test_multi_year_level_loading():
    """Requirements: Section 3.6 - Level Loading Option"""
    escalated = calculate_multi_year_projection(
        base_monthly=2950,
        years=5,
        escalation_rate=0.04
    )

    level_loaded = calculate_level_loading(escalated)
    assert level_loaded == pytest.approx(38254, rel=0.01)
```

### Example 3: Travel Cost Calculation
```python
# File: tests/integration/test_travel_costs.py
def test_travel_cost_zone1_example():
    """Requirements: Section 4.5 - Travel Cost Formula"""
    trip = TravelTrip(zone_number=1, days=2, people=2)
    cost = calculate_trip_cost(trip, get_travel_zone(1))

    assert cost.total == 3315  # Requirements example
```

### Example 4: Deliverable-Based Milestones
```python
# File: tests/integration/test_payment_milestones.py
def test_deliverable_based_milestones():
    """Requirements: Section 5.1 Style B - Deliverable-Based"""
    milestones = calculate_deliverable_based_milestones(
        quote=quote,
        initial_payment_percentage=15.0,
        project_duration_months=10
    )

    assert milestones.initial_payment == pytest.approx(28013, rel=0.01)
```

## 🏗️ Code Organization

### Backend (Python + FastAPI)
```
backend/
├── app/
│   ├── api/v1/           # API endpoints (routes)
│   ├── core/             # Business logic
│   │   ├── calculations/ # Pricing calculations
│   │   └── documents/    # Document generation
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic request/response schemas
│   ├── repositories/     # Data access layer
│   ├── services/         # Business services
│   └── utils/            # Utility functions
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test fixtures
└── alembic/              # Database migrations
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI (buttons, inputs)
│   │   ├── quotes/      # Quote-specific components
│   │   └── admin/       # Admin-specific components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and helpers
│   ├── stores/          # Zustand state management
│   ├── types/           # TypeScript type definitions
│   └── pages/           # Page components
└── tests/
    ├── unit/            # Component unit tests
    ├── integration/     # Integration tests
    └── e2e/             # Playwright E2E tests
```

## 📚 Documentation Requirements

### Python Docstrings
```python
def calculate_saas_tier_price(
    product_code: str,
    volume: float,
    PricingVersionId: UUID
) -> float:
    """
    Calculate monthly SaaS price based on volume tier.

    Uses the pricing tier thresholds from the specified pricing version
    to determine the appropriate price for the given volume.

    Args:
        product_code: Product identifier (e.g., "CHECK_RECOGNITION")
        volume: Volume input for tiered pricing (e.g., annual scans)
        PricingVersionId: Pricing version to use for tier lookup

    Returns:
        Monthly price in USD

    Raises:
        ValueError: If product_code not found or volume is negative

    Example:
        >>> calculate_saas_tier_price("CHECK_RECOGNITION", 25000, version_id)
        340.00
    """
    ...
```

### TypeScript JSDoc
```typescript
/**
 * Calculate the level loaded annual SaaS cost.
 *
 * Takes escalated year-by-year costs and returns a constant annual
 * amount that is revenue-neutral over the projection period.
 *
 * @param escalatedCosts - Array of annual costs with escalation applied
 * @returns Constant annual amount (level loaded)
 *
 * @example
 * ```ts
 * const escalated = [35400, 36816, 38289, 39820, 41413];
 * const levelLoaded = calculateLevelLoading(escalated);
 * // Returns: 38347.60
 * ```
 */
function calculateLevelLoading(escalatedCosts: number[]): number {
  const total = escalatedCosts.reduce((sum, cost) => sum + cost, 0);
  return total / escalatedCosts.length;
}
```

## 🔒 Security Checklist

- [ ] No hardcoded secrets or API keys
- [ ] No SQL injection vulnerabilities (use parameterized queries)
- [ ] No XSS vulnerabilities (sanitize user input)
- [ ] No authentication bypass (check JWT on all protected routes)
- [ ] No authorization escalation (verify user roles)
- [ ] No sensitive data in logs (mask PII, prices)
- [ ] HTTPS only (no HTTP in production)
- [ ] CSRF protection enabled
- [ ] Rate limiting on API endpoints

## 🛠️ Common Tasks

### Create a New Database Migration
```bash
cd backend
alembic revision -m "add_new_table"
# Edit the generated file in alembic/versions/
# Run upgrade
alembic upgrade head
# Test downgrade
alembic downgrade -1
# Re-upgrade
alembic upgrade head
```

### Run Backend API Locally
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### Run Frontend Locally
```bash
cd frontend
npm run dev
# App: http://localhost:5173
```

### Run Specific Test
```bash
# Backend - single test
pytest tests/unit/test_calculations.py::test_level_loading_calculation -v

# Frontend - single test
npm test -- quote-builder.test.tsx
```

### Check Test Coverage
```bash
# Backend
pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html

# Frontend
npm test -- --coverage
# Open coverage/lcov-report/index.html
```

## ❌ Common Mistakes to Avoid

1. **❌ Committing without tests**
   - ✅ Write tests FIRST (TDD)

2. **❌ Using `any` in TypeScript**
   - ✅ Use specific types or `unknown` with type narrowing

3. **❌ Hardcoding values in business logic**
   - ✅ Use configuration from database (pricing_versions)

4. **❌ Skipping type hints in Python**
   - ✅ Use type hints on ALL functions

5. **❌ snake_case for database tables**
   - ✅ Use PascalCase for tables, snake_case for columns

6. **❌ Not running tests before committing**
   - ✅ Install pre-commit hook (auto-runs tests)

7. **❌ Forgetting database migrations**
   - ✅ Create migration for every schema change

8. **❌ Poor error handling**
   - ✅ Use custom exceptions, log errors, show user-friendly messages

## 🆘 Getting Help

1. **Check the docs first:**
   - [Requirements](Teller_Quoting_System_Requirements_v1.5.md)
   - [Implementation Plan](IMPLEMENTATION_PLAN.md)
   - [Requirements Traceability](REQUIREMENTS_TRACEABILITY_MATRIX.md)

2. **Search existing code:**
   - Look for similar functionality already implemented
   - Follow existing patterns

3. **Ask the team:**
   - Slack: #tellerquoter-dev
   - Code review: Tag relevant reviewers

4. **Design decisions:**
   - See Requirements Appendix A for rationale
   - Discuss in team meeting if uncertain

---

**Quick Links:**
- [Full Requirements](Teller_Quoting_System_Requirements_v1.5.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Development Standards (Section 9)](IMPLEMENTATION_PLAN.md#9-development-standards--best-practices)
- [Requirements Coverage](REQUIREMENTS_TRACEABILITY_MATRIX.md)
