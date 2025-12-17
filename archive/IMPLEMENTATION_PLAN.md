# Teller Quoting System - Production Implementation Plan

**Version:** 1.2
**Date:** December 3, 2025
**Status:** Ready for Review

**Changelog:**
- **v1.2:** Added comprehensive development standards (Section 9)
  - PascalCase database naming convention
  - Strict testing requirements (95% coverage for business logic)
  - Test-Driven Development (TDD) workflow
  - Integration tests for all requirements examples
  - Pre-commit hooks and build verification
  - Code review standards and documentation requirements
- **v1.1:** Added explicit session timeout configuration (TR-12)
  - Added calculation_parameters table for better parameter management
  - Added hardware_catalog table for versioned hardware pricing
  - Updated quote_version_hardware to reference hardware catalog
  - 100% requirements coverage verified (161/161 requirements)

---

## Executive Summary

This document provides a comprehensive implementation plan for the Teller Quoting System, transitioning from the current Excel-based workflow (Pricing Investment Template V11.xlsx) to a production-ready web application. The system will enable sales teams to generate professional quotes in under 15 minutes while maintaining pricing consistency, version control, and audit capabilities.

**Project Goals:**
- Replace manual Excel-based quoting with automated web application
- Support 3 client-facing documents + 1 internal document generation
- Enable quote versioning and pricing configuration management
- Deploy to AWS with SSO authentication via Microsoft Entra ID
- Support 20 concurrent users with 99% availability during business hours

---

## 1. Technical Architecture

### 1.1 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | React 18 + TypeScript | Modern SPA, strong typing, excellent ecosystem |
| **UI Framework** | Tailwind CSS + shadcn/ui | Rapid development, professional components |
| **State Management** | TanStack Query + Zustand | Server state caching, client state management |
| **Backend** | Python 3.11 + FastAPI | High performance async, excellent Python ecosystem |
| **Database** | PostgreSQL 15 | ACID compliance, JSON support, versioning capabilities |
| **Document Generation** | python-docx | Native Word document generation, template support |
| **Authentication** | Microsoft Entra ID (OAuth2/OIDC) | SSO integration, role-based access |
| **API Layer** | REST (OpenAPI 3.0) | Standard HTTP, auto-generated docs |
| **Deployment** | AWS ECS Fargate + App Runner | Serverless containers, auto-scaling |
| **Infrastructure** | Terraform | Infrastructure as code, reproducible |
| **CI/CD** | GitHub Actions | Automated testing, deployment |

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                               │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │   CloudFront    │────────▶│  S3 Bucket       │           │
│  │   (CDN)         │         │  (Static Assets) │           │
│  └─────────────────┘         └──────────────────┘           │
│          │                                                    │
│          ▼                                                    │
│  ┌─────────────────────────────────────────────┐            │
│  │     Application Load Balancer (ALB)         │            │
│  │     (HTTPS/TLS Termination)                 │            │
│  └─────────────────────────────────────────────┘            │
│          │                                                    │
│    ┌─────┴──────┐                                           │
│    ▼            ▼                                            │
│  ┌──────────┐  ┌──────────────────────────┐                │
│  │ ECS      │  │ App Runner               │                │
│  │ Fargate  │  │ (Backend API)            │                │
│  │ (React)  │  │ FastAPI + python-docx    │                │
│  └──────────┘  └──────────────────────────┘                │
│                          │                                   │
│                          ▼                                   │
│                 ┌──────────────────┐                        │
│                 │  RDS PostgreSQL  │                        │
│                 │  (Multi-AZ)      │                        │
│                 └──────────────────┘                        │
│                          │                                   │
│                          ▼                                   │
│                 ┌──────────────────┐                        │
│                 │  S3 Bucket       │                        │
│                 │  (Generated Docs)│                        │
│                 └──────────────────┘                        │
│                                                               │
│  ┌────────────────────────────────────────┐                │
│  │  Secrets Manager                       │                │
│  │  (DB credentials, API keys)            │                │
│  └────────────────────────────────────────┘                │
│                                                               │
└───────────────────────────────────────────────────────────┘

External:
  - Microsoft Entra ID (SSO Authentication)
  - GSA API (Per Diem Lookup - optional)
  - Census API (Population Lookup - optional)
```

### 1.3 Security Architecture

**Authentication Flow:**
1. User accesses application → Redirected to Microsoft Entra ID
2. User authenticates with corporate credentials
3. Entra ID returns JWT token with group claims
4. Frontend stores token, includes in API requests
5. Backend validates JWT signature and extracts roles
6. API enforces role-based access control (RBAC)

**Session Management (TR-12):**
- JWT access token lifetime: 8 hours of inactivity
- Refresh token lifetime: 30 days
- Automatic token renewal on user activity
- Client-side auto-logout on token expiration
- Server-side token revocation capability

**Authorization Roles:**
- **Sales** - Create/edit quotes, generate documents, view own quotes
- **Admin** - All Sales permissions + pricing management, user management
- **Finance** - Read-only access to all quotes and internal documents

**Data Protection:**
- All data encrypted at rest (RDS encryption, S3 encryption)
- All data encrypted in transit (TLS 1.3)
- Sensitive configuration in AWS Secrets Manager
- Database credentials rotated automatically
- Audit logging for all pricing changes

---

## 2. Database Schema Design

### 2.1 Core Tables

```sql
-- Pricing Versions (immutable once used)
CREATE TABLE PricingVersions (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    VersionNumber VARCHAR(20) NOT NULL UNIQUE, -- e.g., "2025.1", "2025.2"
    Description TEXT,
    EffectiveDate DATE NOT NULL,
    ExpirationDate DATE,
    CreatedBy VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    IsCurrent BOOLEAN DEFAULT FALSE,
    IsLocked BOOLEAN DEFAULT FALSE -- true once linked to any quote
);

-- Setup Package SKUs (versioned)
CREATE TABLE SKUDefinitions (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),
    SKUCode VARCHAR(50) NOT NULL, -- e.g., "ORG-SETUP-ENT-MID"
    Name VARCHAR(255) NOT NULL,
    Category VARCHAR(50) NOT NULL, -- Organization, Integration, Module, Training, PM
    FixedPrice DECIMAL(10, 2) NOT NULL,
    EstimatedHours INTEGER NOT NULL,
    TypicalDurationWeeks INTEGER,
    QuickbooksCategory VARCHAR(100),
    SalesDescription TEXT,
    ScopeText TEXT,
    Deliverables JSONB, -- Array of deliverable objects
    AcceptanceCriteria TEXT,
    Dependencies JSONB, -- Array of SKU codes
    IsRepeatable BOOLEAN DEFAULT FALSE,
    IsActive BOOLEAN DEFAULT TRUE,
    UNIQUE(PricingVersionId, SKUCode)
);

-- Delivery milestones for SKUs (for deliverable-based payment schedules)
CREATE TABLE SKUMilestones (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    SKUDefinitionId UUID NOT NULL REFERENCES SKUDefinitions(Id),
    MilestoneName VARCHAR(255) NOT NULL,
    TypicalMonth INTEGER NOT NULL,
    PercentageOfSKU DECIMAL(5, 2) NOT NULL, -- e.g., 50.00 for 50%
    SequenceOrder INTEGER NOT NULL
);

-- SaaS Products (versioned)
CREATE TABLE SaaSProducts (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),
    ProductCode VARCHAR(50) NOT NULL,
    ProductName VARCHAR(255) NOT NULL,
    BaseMonthlyPrice DECIMAL(10, 2),
    PricingType VARCHAR(50) NOT NULL, -- FIXED, VOLUME_TIERED, PERCENTAGE
    TierConfig JSONB, -- For volume-based pricing
    IsActive BOOLEAN DEFAULT TRUE,
    UNIQUE(PricingVersionId, ProductCode)
);

-- Travel Zones (versioned)
CREATE TABLE TravelZones (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),
    ZoneNumber INTEGER NOT NULL,
    ZoneName VARCHAR(100) NOT NULL,
    RegionDescription TEXT,
    AirfareEstimate DECIMAL(10, 2) NOT NULL,
    HotelDefault DECIMAL(10, 2) NOT NULL,
    PerDiemDefault DECIMAL(10, 2) NOT NULL,
    VehiclePerDay DECIMAL(10, 2) NOT NULL,
    UNIQUE(PricingVersionId, ZoneNumber)
);

-- Mature Integrations List
CREATE TABLE MatureIntegrations (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    IntegrationCode VARCHAR(50) UNIQUE NOT NULL,
    SystemName VARCHAR(255) NOT NULL,
    Vendor VARCHAR(255),
    Comments TEXT,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    UpdatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Referrers
CREATE TABLE Referrers (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ReferrerName VARCHAR(255) NOT NULL,
    StandardRate DECIMAL(5, 2) NOT NULL, -- e.g., 5.00 for 5%
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    UpdatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Configuration snippets (warranty, assumptions, etc.) - versioned
CREATE TABLE TextSnippets (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),
    SnippetKey VARCHAR(100) NOT NULL, -- e.g., "warranty_text", "escalation_4pct"
    SnippetContent TEXT NOT NULL,
    SnippetCategory VARCHAR(50), -- IMPLEMENTATION_PLAN, ORDER_FORM, ASSUMPTIONS
    UNIQUE(PricingVersionId, SnippetKey)
);

-- Calculation Parameters (versioned) - NEW for explicit parameter management
CREATE TABLE CalculationParameters (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),
    ParameterName VARCHAR(100) NOT NULL, -- e.g., "hourly_rate", "default_escalation"
    ParameterValue DECIMAL(10, 4) NOT NULL, -- e.g., 230.0000, 0.0400
    ParameterDescription TEXT, -- e.g., "Standard hourly rate for professional services"
    UNIQUE(PricingVersionId, ParameterName)
);
-- Examples: hourly_rate=230, default_escalation=0.04, teller_payments_discount=0.10

-- Hardware Catalog (versioned)
CREATE TABLE HardwareCatalog (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),
    ItemName VARCHAR(255) NOT NULL,
    Model VARCHAR(255),
    UnitPrice DECIMAL(10, 2) NOT NULL,
    Description TEXT,
    IsActive BOOLEAN DEFAULT TRUE,
    UNIQUE(PricingVersionId, ItemName, Model)
);

-- Quotes
CREATE TABLE Quotes (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteNumber VARCHAR(50) UNIQUE NOT NULL, -- e.g., "Q-2025-0001"
    ClientName VARCHAR(255) NOT NULL,
    ClientOrganization VARCHAR(255),
    CreatedBy VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    UpdatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    Status VARCHAR(50) DEFAULT 'DRAFT' -- DRAFT, SENT, ACCEPTED, DECLINED
);

-- Quote Versions
CREATE TABLE QuoteVersions (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteId UUID NOT NULL REFERENCES Quotes(Id),
    VersionNumber INTEGER NOT NULL, -- 1, 2, 3...
    VersionDescription TEXT,
    PricingVersionId UUID NOT NULL REFERENCES PricingVersions(Id),

    -- Client Information
    ClientData JSONB NOT NULL, -- Name, address, contacts, population, location

    -- Quote Configuration
    ProjectionYears INTEGER DEFAULT 5,
    EscalationModel VARCHAR(50) DEFAULT 'STANDARD_4PCT', -- STANDARD_4PCT, CPI, MULTI_YEAR_FREEZE
    MultiYearFreezeYears INTEGER,
    LevelLoadingEnabled BOOLEAN DEFAULT FALSE,
    TellerPaymentsEnabled BOOLEAN DEFAULT FALSE,

    -- Discounts
    DiscountConfig JSONB, -- {saas_year1_pct, saas_all_years_pct, setup_fixed, setup_pct}

    -- Referral
    ReferrerId UUID REFERENCES Referrers(Id),
    ReferralRateOverride DECIMAL(5, 2),

    -- Implementation Plan Config
    MilestoneStyle VARCHAR(50) DEFAULT 'FIXED_MONTHLY', -- FIXED_MONTHLY, DELIVERABLE_BASED
    InitialPaymentPercentage DECIMAL(5, 2) DEFAULT 25.00,
    ProjectDurationMonths INTEGER DEFAULT 10,

    -- Travel
    TravelZoneId UUID REFERENCES TravelZones(Id),
    TravelConfig JSONB, -- Array of trips with days, people, overrides

    -- Totals (calculated/cached)
    TotalSaaSMonthly DECIMAL(10, 2),
    TotalSaaSAnnualYear1 DECIMAL(10, 2),
    TotalSetupPackages DECIMAL(10, 2),
    TotalTravel DECIMAL(10, 2),
    TotalContractedAmount DECIMAL(10, 2),

    CreatedBy VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    VersionStatus VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED

    UNIQUE(QuoteId, VersionNumber)
);

-- Quote Version - SaaS Products (many-to-many)
CREATE TABLE QuoteVersionSaaSProducts (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteVersionId UUID NOT NULL REFERENCES QuoteVersions(Id) ON DELETE CASCADE,
    SaaSProductId UUID NOT NULL REFERENCES SaaSProducts(Id),
    Quantity DECIMAL(10, 2) NOT NULL, -- volume input for tiered pricing
    CalculatedMonthlyPrice DECIMAL(10, 2) NOT NULL,
    Notes TEXT
);

-- Quote Version - Setup Packages (many-to-many)
CREATE TABLE QuoteVersionSetupPackages (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteVersionId UUID NOT NULL REFERENCES QuoteVersions(Id) ON DELETE CASCADE,
    SKUDefinitionId UUID NOT NULL REFERENCES SKUDefinitions(Id),
    Quantity INTEGER DEFAULT 1,
    CalculatedPrice DECIMAL(10, 2) NOT NULL,
    CustomScopeNotes TEXT,
    SequenceOrder INTEGER
);

-- Quote Version - Integrations (for listing on Order Form)
CREATE TABLE QuoteVersionIntegrations (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteVersionId UUID NOT NULL REFERENCES QuoteVersions(Id) ON DELETE CASCADE,
    IntegrationId UUID REFERENCES MatureIntegrations(Id),
    CustomSystemName VARCHAR(255), -- for "TBD" or unlisted systems
    SKUDefinitionId UUID NOT NULL REFERENCES SKUDefinitions(Id)
);

-- Quote Version - Hardware
CREATE TABLE QuoteVersionHardware (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteVersionId UUID NOT NULL REFERENCES QuoteVersions(Id) ON DELETE CASCADE,
    HardwareCatalogId UUID REFERENCES HardwareCatalog(Id), -- Reference to catalog item
    CustomItemName VARCHAR(255), -- For items not in catalog
    CustomModel VARCHAR(255),
    UnitPrice DECIMAL(10, 2) NOT NULL, -- Captured from catalog at quote time
    Quantity INTEGER, -- NULL = TBD
    Notes TEXT
);

-- Generated Documents
CREATE TABLE GeneratedDocuments (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    QuoteVersionId UUID NOT NULL REFERENCES QuoteVersions(Id),
    DocumentType VARCHAR(50) NOT NULL, -- ORDER_FORM, IMPLEMENTATION_PLAN, INTERNAL_DETAIL
    FileFormat VARCHAR(10) NOT NULL, -- DOCX, PDF
    S3Bucket VARCHAR(255) NOT NULL,
    S3Key VARCHAR(500) NOT NULL,
    GeneratedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    GeneratedBy VARCHAR(255) NOT NULL
);

-- Audit Log
CREATE TABLE AuditLog (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    EntityType VARCHAR(100) NOT NULL, -- PRICING_VERSION, QUOTE, SKU, etc.
    EntityId UUID NOT NULL,
    Action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    ChangedBy VARCHAR(255) NOT NULL,
    ChangedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    Changes JSONB, -- before/after values
    Reason TEXT
);

-- Indexes for performance
CREATE INDEX IdxQuotesClientName ON Quotes(ClientName);
CREATE INDEX IdxQuotesCreatedBy ON Quotes(CreatedBy);
CREATE INDEX IdxQuoteVersionsQuoteId ON QuoteVersions(QuoteId);
CREATE INDEX IdxQuoteVersionsPricingVersion ON QuoteVersions(PricingVersionId);
CREATE INDEX IdxSKUDefinitionsPricingVersion ON SKUDefinitions(PricingVersionId);
CREATE INDEX IdxSaaSProductsPricingVersion ON SaaSProducts(PricingVersionId);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at DESC);
```

### 2.2 Key Design Decisions

**Pricing Versioning:**
- Each pricing version is immutable once linked to a quote
- All pricing-related tables (SKUs, SaaS products, zones, snippets) reference pricing_version_id
- Enables historical accuracy and prevents retroactive price changes
- Supports comparison between pricing versions

**Quote Versioning:**
- Quotes have a parent record (quote number, client) and child version records
- Each version links to specific pricing version
- Versions can branch from any previous version
- Full audit trail of changes between versions

**JSONB Usage:**
- Used for flexible, schema-less data (client details, trip configs, tier definitions)
- Enables PostgreSQL JSON queries while maintaining type safety for critical fields
- Balances normalization with pragmatic flexibility

**Calculated Fields:**
- Total amounts cached in quote_versions for performance
- Recalculated when quote is modified
- Prevents expensive joins during quote listing/search

---

## 3. API Design

### 3.1 API Architecture

**Base URL:** `https://api.tellerquoter.canam.com/v1`

**Authentication:** Bearer token (JWT from Microsoft Entra ID)

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2025-12-03T10:00:00Z" }
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid SKU selection",
    "details": { ... }
  }
}
```

### 3.2 Core API Endpoints

#### Authentication & Users
```
POST   /auth/login              # Initiate OAuth flow
GET    /auth/callback           # OAuth callback
POST   /auth/refresh            # Refresh token
GET    /auth/me                 # Get current user info
```

#### Pricing Versions (Admin)
```
GET    /pricing-versions                    # List all versions
POST   /pricing-versions                    # Create new version
GET    /pricing-versions/{id}               # Get version details
POST   /pricing-versions/{id}/clone         # Clone as new version
POST   /pricing-versions/{id}/activate      # Set as current
GET    /pricing-versions/{id}/comparison/{other_id}  # Compare versions
```

#### SKU Management (Admin)
```
GET    /pricing-versions/{pv_id}/skus       # List SKUs for version
POST   /pricing-versions/{pv_id}/skus       # Create SKU
PUT    /pricing-versions/{pv_id}/skus/{id}  # Update SKU (if not locked)
DELETE /pricing-versions/{pv_id}/skus/{id}  # Delete SKU (if not locked)
```

#### SaaS Products (Admin)
```
GET    /pricing-versions/{pv_id}/saas-products
POST   /pricing-versions/{pv_id}/saas-products
PUT    /pricing-versions/{pv_id}/saas-products/{id}
DELETE /pricing-versions/{pv_id}/saas-products/{id}
```

#### Travel Zones (Admin)
```
GET    /pricing-versions/{pv_id}/travel-zones
POST   /pricing-versions/{pv_id}/travel-zones
PUT    /pricing-versions/{pv_id}/travel-zones/{id}
```

#### Integrations (Admin)
```
GET    /integrations                        # List mature integrations
POST   /integrations                        # Add integration
PUT    /integrations/{id}                   # Update
DELETE /integrations/{id}                   # Soft delete
```

#### Referrers (Admin)
```
GET    /referrers
POST   /referrers
PUT    /referrers/{id}
```

#### Quotes (Sales)
```
GET    /quotes                              # List quotes (filtered by user/role)
POST   /quotes                              # Create new quote
GET    /quotes/{id}                         # Get quote with all versions
GET    /quotes/search?q={query}             # Search quotes
DELETE /quotes/{id}                         # Delete quote
```

#### Quote Versions (Sales)
```
GET    /quotes/{quote_id}/versions          # List versions for quote
POST   /quotes/{quote_id}/versions          # Create new version
GET    /quotes/{quote_id}/versions/{v_num}  # Get specific version
PUT    /quotes/{quote_id}/versions/{v_num}  # Update version
POST   /quotes/{quote_id}/versions/{v_num}/clone  # Clone to new version
GET    /quotes/{quote_id}/versions/{v1}/compare/{v2}  # Compare versions
PUT    /quotes/{quote_id}/versions/{v_num}/status  # Update status (SENT, ACCEPTED)
```

#### Quote Calculations (Sales)
```
POST   /quotes/calculate                    # Calculate totals (no save)
POST   /quotes/{quote_id}/versions/{v_num}/recalculate  # Recalc and save
```

#### Document Generation (Sales)
```
POST   /quotes/{quote_id}/versions/{v_num}/documents/order-form
POST   /quotes/{quote_id}/versions/{v_num}/documents/implementation-plan
POST   /quotes/{quote_id}/versions/{v_num}/documents/internal-detail
GET    /documents/{doc_id}/download         # Download from S3
```

#### Lookups (Sales - Helper endpoints)
```
GET    /lookups/population?city={city}&state={state}    # Census API lookup
GET    /lookups/gsa-per-diem?city={city}&state={state}  # GSA API lookup
GET    /lookups/suggest-org-tier?population={pop}       # Suggest org setup tier
GET    /lookups/suggest-trips?saas_annual={amount}      # Suggest trip config
```

#### Audit (Admin/Finance)
```
GET    /audit?entity_type={type}&entity_id={id}  # Get audit trail
```

### 3.3 Calculation Engine

**Key Calculation Functions:**

1. **SaaS Volume Tier Calculation**
   - Input: Product code, volume/quantity
   - Output: Monthly price based on tier thresholds

2. **Multi-Year Projection**
   - Input: Monthly SaaS total, escalation model, projection years
   - Output: Year-by-year costs with escalation

3. **Level Loading**
   - Input: Escalated year-by-year costs
   - Output: Constant annual amount

4. **Discount Application**
   - Input: Line items, discount config
   - Output: Discounted totals per line and overall

5. **Travel Cost Calculation**
   - Input: Zone, trip configs (days, people)
   - Output: Per-trip costs and total

6. **Payment Milestone Calculation**
   - Input: Setup total, milestone style, initial %, duration
   - Output: Payment schedule with dates and amounts

7. **Referral Fee Calculation**
   - Input: Year 1 SaaS, referrer rate
   - Output: Referral fee amount

---

## 4. Frontend Architecture

### 4.1 Application Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AppShell.tsx       # Main layout with nav
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── quotes/
│   │   ├── QuoteList.tsx
│   │   ├── QuoteSearch.tsx
│   │   ├── QuoteBuilder/
│   │   │   ├── ClientInfoStep.tsx
│   │   │   ├── SaaSProductsStep.tsx
│   │   │   ├── SetupPackagesStep.tsx
│   │   │   ├── TravelStep.tsx
│   │   │   ├── DiscountsStep.tsx
│   │   │   ├── ImplementationPlanStep.tsx
│   │   │   └── ReviewStep.tsx
│   │   ├── QuoteVersionHistory.tsx
│   │   ├── QuoteComparison.tsx
│   │   └── DocumentGeneration.tsx
│   ├── admin/
│   │   ├── PricingVersionManager.tsx
│   │   ├── SKUEditor.tsx
│   │   ├── SaaSProductEditor.tsx
│   │   ├── TravelZoneEditor.tsx
│   │   ├── IntegrationManager.tsx
│   │   └── ReferrerManager.tsx
│   └── shared/
│       ├── CalculationPreview.tsx
│       ├── FormField.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useQuotes.ts
│   ├── usePricingVersions.ts
│   ├── useCalculations.ts
│   └── useDocuments.ts
├── lib/
│   ├── api-client.ts          # Axios instance with auth
│   ├── calculations.ts        # Client-side calculation helpers
│   ├── formatters.ts          # Currency, date formatting
│   └── validators.ts          # Form validation
├── stores/
│   ├── auth-store.ts          # Zustand store for auth state
│   └── quote-builder-store.ts # Zustand store for quote builder state
├── types/
│   ├── api.ts                 # API request/response types
│   ├── quote.ts               # Quote domain types
│   ├── pricing.ts             # Pricing domain types
│   └── user.ts                # User types
├── pages/
│   ├── Dashboard.tsx
│   ├── QuoteBuilder.tsx
│   ├── QuoteDetail.tsx
│   ├── Admin.tsx
│   └── Login.tsx
├── App.tsx
└── main.tsx
```

### 4.2 Key UI Flows

#### Quote Builder Flow (Multi-Step)

**Step 1: Client Information**
- Client name, organization
- Address, contacts
- Location (city/state) → triggers population lookup
- Auto-suggest organization setup tier based on population

**Step 2: SaaS Products**
- Teller Standard/Basic selection
- Additional named users (quantity input)
- Module selections with volume inputs:
  - Check Recognition (annual scans)
  - Image Cash Letter (calculated from Check Recognition)
  - Revenue Submission (template count)
  - Revenue Submission Workflow (workflow count)
  - Teller Online (annual transactions)
  - Online Forms (form count)
- Bi-Directional interfaces (quantity)
- Payment Import interfaces (quantity)
- Teller Payments checkbox → applies 10% discount
- **Real-time calculation preview** on right side
- Multi-year projection slider (3-10 years)
- Escalation model selector
- Level loading toggle

**Step 3: Setup Packages**
- Organized by category (Organization, Integration, Module, Training, PM)
- Auto-suggested SKUs based on SaaS selections (can override)
- Repeatable SKUs (integrations, training) with quantity
- Integration SKU → opens integration selector:
  - Mature integrations list
  - "TBD" option
  - Custom system name input
- Dependency validation (warnings if prerequisites missing)
- **Running total** updates in sidebar

**Step 4: Travel**
- Zone selector (auto-suggested based on client location)
- Trip builder:
  - Pre-populated with suggested trips based on complexity
  - Each trip: Type, Days, People
  - Override per diem/hotel rates if needed
- **Trip cost breakdown** displayed per trip

**Step 5: Discounts & Referrals**
- Discount options:
  - SaaS Year 1 only (%)
  - SaaS All Years (%)
  - Setup Packages (% or $ fixed)
- Impact preview (before/after totals)
- Referrer selector (optional)
  - Shows standard rate, allows override
  - Calculates referral fee

**Step 6: Implementation Plan Options**
- Milestone style selector (Fixed Monthly / Deliverable-Based)
- Initial payment % slider
- Project duration (months)
- Hardware selector with quantities
- Preview payment schedule

**Step 7: Review & Generate**
- Complete quote summary
- Quote number assignment
- Save draft
- Generate documents (3 buttons):
  - Order Form (.docx / .pdf)
  - Implementation Plan (.docx / .pdf)
  - Internal Detail (.xlsx / .pdf)

### 4.3 State Management Strategy

**Server State (TanStack Query):**
- Quotes list, quote details
- Pricing versions, SKUs, SaaS products
- Generated documents
- Automatic caching, refetching
- Optimistic updates for better UX

**Client State (Zustand):**
- Authentication state (user, token, roles)
- Quote builder form state (multi-step form)
- UI preferences (sidebar collapsed, theme)

**Form State (React Hook Form):**
- Individual step validation
- Field-level error handling
- Integration with calculation engine

---

## 5. Document Generation

### 5.1 Word Document Generation Strategy

**Library:** `python-docx` (proven, stable, supports .docx format)

**Approach:**
1. Create .docx templates with placeholder text
2. Python code loads template, replaces placeholders
3. Generates tables dynamically based on quote data
4. Applies Can/Am branding (logo, colors, fonts)
5. Saves to S3, returns signed URL for download

**Templates:**
- `order_form_template.docx`
- `implementation_plan_template.docx`
- `internal_detail_template.docx`

**Placeholder Format:** `{{CLIENT_NAME}}`, `{{TOTAL_SAAS_MONTHLY}}`, etc.

### 5.2 Order Form Structure

```
┌─────────────────────────────────────────────┐
│  Can/Am Logo           TELLER ORDER FORM     │
├─────────────────────────────────────────────┤
│  Client Information                          │
│  - Name, Address, Contacts                   │
│  - Quote Number, Date                        │
├─────────────────────────────────────────────┤
│  SaaS Services (Recurring Monthly)           │
│  ┌───────────────┬────┬─────┬────────┐     │
│  │ Product       │ Qty│ Unit│ Total  │     │
│  ├───────────────┼────┼─────┼────────┤     │
│  │ Teller Std    │  1 │ 2950│  2,950 │     │
│  │ Add'l Users   │  5 │   60│    300 │     │
│  │ Check Recog   │  1 │  340│    340 │     │
│  │ ... (dynamic)                      │     │
│  └───────────────┴────┴─────┴────────┘     │
│  Total SaaS Monthly: $X,XXX                  │
│  Total SaaS Annual (Year 1): $XX,XXX         │
├─────────────────────────────────────────────┤
│  Setup Packages                              │
│  - See Exhibit C for details: $XX,XXX        │
├─────────────────────────────────────────────┤
│  Variable Items                              │
│  - Travel (estimated): $X,XXX                │
│  - Hardware: $X,XXX (or TBD)                 │
│  - Contingency: $XXX                         │
├─────────────────────────────────────────────┤
│  Total Contracted Amount: $XXX,XXX           │
├─────────────────────────────────────────────┤
│  Escalation Clause                           │
│  [Dynamic text based on model selected]      │
├─────────────────────────────────────────────┤
│  [Conditional: Teller Payments Section]      │
├─────────────────────────────────────────────┤
│  Signature Block                             │
│  CanAm: ____________  Client: ____________   │
└─────────────────────────────────────────────┘
```

### 5.3 Implementation Plan (Exhibit C) Structure

```
┌─────────────────────────────────────────────┐
│  TELLER IMPLEMENTATION PLAN                  │
│  Client: [Name]                              │
│  Quote: [Number]                             │
├─────────────────────────────────────────────┤
│  1. OVERVIEW                                 │
│     - Project approach                       │
│     - Milestone style indicator              │
├─────────────────────────────────────────────┤
│  2. SETUP PACKAGE SUMMARY                    │
│     Organization & Dept: $XX,XXX             │
│     Integrations: $XX,XXX                    │
│     Modules: $XX,XXX                         │
│     Training: $XX,XXX                        │
│     Project Management: $XX,XXX              │
│     ────────────────────                     │
│     Total: $XXX,XXX                          │
├─────────────────────────────────────────────┤
│  3. DETAILED SCOPE                           │
│     [For each SKU selected:]                 │
│     3.1 Enterprise Setup - Mid-tier          │
│         Scope: [From SKU library]            │
│         Deliverables:                        │
│           • [Deliverable 1]                  │
│           • [Deliverable 2]                  │
│         Acceptance Criteria: [...]           │
│         Estimated Effort: XX hours           │
├─────────────────────────────────────────────┤
│  4. PAYMENT MILESTONES                       │
│     [Style A: Fixed Monthly]                 │
│     Contract Execution: $XX,XXX (25%)        │
│     Month 2-10 (×9): $X,XXX each             │
│     ────────────────────                     │
│     OR                                       │
│     [Style B: Deliverable-Based]             │
│     Contract Execution: $XX,XXX (15%)        │
│     Monthly Services (×10): $X,XXX           │
│     Enterprise Setup (Mo 2): $XX,XXX         │
│     Integration Complete (Mo 6): $XX,XXX     │
│     ... (dynamic)                            │
├─────────────────────────────────────────────┤
│  5. HARDWARE OPTIONS                         │
│     [Dynamic table from quote]               │
├─────────────────────────────────────────────┤
│  6. ASSUMPTIONS                              │
│     [Standard + Conditional based on quote]  │
├─────────────────────────────────────────────┤
│  7. WARRANTY                                 │
│     [Fixed text, 90-day warranty]            │
├─────────────────────────────────────────────┤
│  8. CLIENT RESPONSIBILITIES                  │
│     [Fixed text]                             │
├─────────────────────────────────────────────┤
│  9. CHANGE MANAGEMENT                        │
│     [Fixed text]                             │
└─────────────────────────────────────────────┘
```

### 5.4 Internal Quote Detail Structure

**Format:** Excel (.xlsx) or PDF

**Sections:**
1. Quote metadata (number, version, client, dates, created by)
2. Pricing version used
3. SaaS line items with:
   - Product, quantity, unit price, total
   - Escalation rate (if applicable)
   - Discount applied
   - Margin calculation
4. Setup packages with:
   - SKU, quantity, hours, rate, price
   - Quickbooks category
   - Discount applied
5. Travel breakdown per trip
6. Referral fee calculation (if applicable)
7. Summary totals
8. Version history summary

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

**Objectives:**
- Set up development environment
- Initialize infrastructure
- Build authentication
- Create base database schema

**Deliverables:**
- ✅ Repository structure (monorepo: /frontend, /backend, /infrastructure)
- ✅ AWS infrastructure via Terraform:
  - VPC, subnets, security groups
  - RDS PostgreSQL instance
  - S3 buckets (static assets, generated docs)
  - Secrets Manager setup
- ✅ Backend skeleton:
  - FastAPI project structure
  - Database connection with SQLAlchemy
  - Alembic migrations setup
  - Health check endpoint
- ✅ Frontend skeleton:
  - React + Vite + TypeScript
  - Tailwind CSS + shadcn/ui
  - Routing setup (React Router)
- ✅ Authentication:
  - Microsoft Entra ID OAuth integration
  - JWT validation middleware
  - Role extraction from groups
- ✅ CI/CD pipeline (GitHub Actions):
  - Linting, type checking
  - Unit test runners
  - Docker build

**Success Criteria:**
- User can log in with Microsoft SSO
- Backend API responds to health check
- Frontend deploys to S3/CloudFront
- Database migrations run successfully

---

### Phase 2: Pricing Management (Weeks 4-6)

**Objectives:**
- Build Admin UI for pricing configuration
- Implement pricing versioning system
- Seed initial pricing data from V11 Excel

**Deliverables:**
- ✅ Database migrations for pricing tables
- ✅ Pricing Version CRUD API
- ✅ SKU management API + Admin UI
- ✅ SaaS product management API + Admin UI
- ✅ Travel zone management API + Admin UI
- ✅ Mature integrations list API + Admin UI
- ✅ Referrers API + Admin UI
- ✅ Text snippets management API + Admin UI
- ✅ Audit logging for all pricing changes
- ✅ Data migration script: V11.xlsx → PostgreSQL
- ✅ Pricing version comparison UI
- ✅ Pricing version locking mechanism

**Success Criteria:**
- Admin can create new pricing version
- Admin can clone existing pricing version
- Admin can edit SKU details, prices, text
- All pricing data from V11.xlsx imported correctly
- System prevents editing locked pricing versions

---

### Phase 3: Quote Builder Core (Weeks 7-10)

**Objectives:**
- Build quote creation flow
- Implement calculation engine
- Quote versioning

**Deliverables:**
- ✅ Quote database tables + migrations
- ✅ Quote CRUD API
- ✅ Quote version API
- ✅ Calculation engine (backend):
  - SaaS tier pricing
  - Multi-year projections
  - Level loading
  - Discounts
  - Referral fees
  - Travel costs
- ✅ Quote Builder UI (Steps 1-4):
  - Client information
  - SaaS products selector
  - Setup packages selector
  - Travel configuration
- ✅ Real-time calculation preview
- ✅ Quote save/load functionality
- ✅ Quote search functionality
- ✅ Quote versioning UI
- ✅ Version comparison UI

**Success Criteria:**
- User can create complete quote in < 15 minutes
- Calculations match V11 Excel output exactly
- Quote versions saved correctly
- User can compare two versions
- Real-time totals update within 500ms

---

### Phase 4: Implementation Plan & Discounts (Weeks 11-13)

**Objectives:**
- Complete quote builder workflow
- Build payment milestone calculators
- Implement discount system

**Deliverables:**
- ✅ Quote Builder UI (Steps 5-7):
  - Discounts & referrals
  - Implementation plan options
  - Review & summary
- ✅ Payment milestone calculation (backend):
  - Fixed monthly style
  - Deliverable-based style
- ✅ Discount application logic
- ✅ Hardware configuration
- ✅ Assumptions engine (conditional logic)
- ✅ Implementation plan regeneration support

**Success Criteria:**
- User can configure payment milestones
- Discounts apply correctly to line items
- Impact of discounts visible in UI
- Hardware options configurable
- Conditional assumptions appear correctly

---

### Phase 5: Document Generation (Weeks 14-16)

**Objectives:**
- Build Word document generation
- Create templates with Can/Am branding
- Integrate with S3 for storage

**Deliverables:**
- ✅ python-docx integration
- ✅ Order Form template + generation logic
- ✅ Implementation Plan template + generation logic
- ✅ Internal Detail template + generation logic
- ✅ S3 upload/download functionality
- ✅ Document generation API endpoints
- ✅ Frontend download UI
- ✅ PDF conversion (optional: wkhtmltopdf or LibreOffice)
- ✅ Can/Am branding assets (logo, fonts, colors)

**Success Criteria:**
- All 3 documents generate correctly
- Documents match existing templates visually
- Documents download within 10 seconds
- Branding consistent across all docs
- Generated documents are pixel-perfect

---

### Phase 6: Lookups & Integrations (Weeks 17-18)

**Objectives:**
- Integrate external APIs for lookups
- Build helper features

**Deliverables:**
- ✅ Census API integration (population lookup)
- ✅ GSA API integration (per diem lookup)
- ✅ Auto-suggest logic:
  - Organization tier based on population
  - Trip configuration based on complexity
- ✅ Fallback handling for API failures
- ✅ Caching for lookup results

**Success Criteria:**
- Population auto-fills when city/state entered
- Per diem rates auto-fill from GSA data
- System gracefully handles API unavailability
- Lookups return results within 2 seconds

---

### Phase 7: Testing & Refinement (Weeks 19-20)

**Objectives:**
- Comprehensive testing
- Bug fixes
- Performance optimization
- User acceptance testing (UAT)

**Deliverables:**
- ✅ Unit tests (backend: 80%+ coverage)
- ✅ Integration tests (API endpoints)
- ✅ E2E tests (Playwright - critical flows)
- ✅ Load testing (20 concurrent users)
- ✅ Security testing:
  - OWASP Top 10 checks
  - Penetration testing
  - SQL injection testing
- ✅ Performance optimization:
  - Database query optimization
  - Frontend bundle optimization
  - Caching strategy
- ✅ UAT with sales team (3-5 users)
- ✅ Bug tracking and resolution
- ✅ Documentation:
  - User guide
  - Admin guide
  - API documentation (OpenAPI)

**Success Criteria:**
- All critical bugs resolved
- UAT sign-off from sales team
- Performance targets met (< 500ms calculations, < 10s docs)
- Security scan passes
- Test coverage > 80%

---

### Phase 8: Deployment & Training (Weeks 21-22)

**Objectives:**
- Production deployment
- User training
- Monitoring setup
- Handoff to operations

**Deliverables:**
- ✅ Production infrastructure deployment
- ✅ Database migration to production
- ✅ Initial pricing data seeded
- ✅ SSL certificate configuration
- ✅ Monitoring setup:
  - CloudWatch dashboards
  - Error tracking (Sentry)
  - Uptime monitoring
  - Performance metrics
- ✅ Backup strategy:
  - Daily RDS snapshots
  - S3 versioning enabled
- ✅ User training sessions:
  - Sales team training (2 hours)
  - Admin training (1 hour)
- ✅ Training materials:
  - Video tutorials
  - Quick reference guide
- ✅ Soft launch (limited user group)
- ✅ Full production launch
- ✅ Post-launch support plan

**Success Criteria:**
- Production environment live and stable
- Sales team trained and comfortable
- All pricing data migrated correctly
- Monitoring and alerts operational
- Support process defined

---

## 7. Infrastructure & Deployment

### 7.1 AWS Resources

**Compute:**
- **Frontend:** ECS Fargate (container running Nginx + React static build)
  - Auto-scaling: 2-4 tasks based on CPU/memory
  - Health checks via ALB
- **Backend:** AWS App Runner (FastAPI application)
  - Auto-scaling: 1-5 instances based on request volume
  - Managed platform, automatic deployments

**Database:**
- **RDS PostgreSQL 15**
  - Instance: db.t4g.medium (2 vCPU, 4 GB RAM)
  - Multi-AZ deployment for high availability
  - Automated backups (7-day retention)
  - Encryption at rest (KMS)

**Storage:**
- **S3 Buckets:**
  - `tellerquoter-frontend-static` (CloudFront origin)
  - `tellerquoter-documents` (generated documents, versioned)
  - Lifecycle policies: Archive to Glacier after 90 days

**Networking:**
- **VPC:** Custom VPC with public/private subnets
- **ALB:** Application Load Balancer for HTTPS termination
- **CloudFront:** CDN for frontend static assets
- **Route 53:** DNS management for custom domain

**Security:**
- **Secrets Manager:** Database credentials, API keys
- **IAM Roles:** Least-privilege access for services
- **Security Groups:** Strict ingress/egress rules
- **WAF:** Web Application Firewall (rate limiting, SQL injection protection)

**Monitoring:**
- **CloudWatch:** Logs, metrics, dashboards
- **CloudWatch Alarms:** CPU, memory, error rate thresholds
- **SNS:** Alert notifications to ops team
- **Sentry:** Application error tracking

### 7.2 Terraform Infrastructure Code

**Structure:**
```
infrastructure/
├── modules/
│   ├── networking/
│   ├── database/
│   ├── storage/
│   ├── compute/
│   └── monitoring/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── production/
├── main.tf
├── variables.tf
├── outputs.tf
└── terraform.tfvars
```

**Key Terraform Resources:**
- `aws_vpc`, `aws_subnet`, `aws_internet_gateway`
- `aws_db_instance` (PostgreSQL)
- `aws_s3_bucket`, `aws_s3_bucket_versioning`
- `aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition`
- `aws_apprunner_service`
- `aws_lb`, `aws_lb_listener`, `aws_lb_target_group`
- `aws_cloudfront_distribution`
- `aws_secretsmanager_secret`
- `aws_iam_role`, `aws_iam_policy`

### 7.3 CI/CD Pipeline (GitHub Actions)

**Workflow: `.github/workflows/ci-cd.yml`**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests --cov

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  build-backend:
    needs: [backend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t tellerquoter-backend:${{ github.sha }} ./backend
      - run: docker push $ECR_REPO/tellerquoter-backend:${{ github.sha }}

  build-frontend:
    needs: [frontend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build
      - run: docker build -t tellerquoter-frontend:${{ github.sha }} ./frontend
      - run: docker push $ECR_REPO/tellerquoter-frontend:${{ github.sha }}

  deploy-staging:
    needs: [build-backend, build-frontend]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: terraform apply -var-file=environments/staging/terraform.tfvars

  deploy-production:
    needs: [build-backend, build-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: terraform apply -var-file=environments/production/terraform.tfvars
```

### 7.4 Deployment Strategy

**Environments:**
1. **Development** - Local developer machines
2. **Staging** - AWS environment mirroring production
3. **Production** - Live system

**Deployment Process:**
1. Developer commits to feature branch
2. CI runs tests
3. PR merged to `develop` → auto-deploy to Staging
4. Staging tested by QA/Sales
5. PR from `develop` to `main` → manual approval → deploy to Production
6. Blue/green deployment strategy (zero downtime)

**Rollback Plan:**
- Database: Restore from RDS snapshot
- Application: Revert to previous Docker image tag
- Terraform: `terraform plan` shows changes before apply

---

## 8. Testing Strategy

### 8.1 Backend Testing

**Unit Tests (pytest):**
- Calculation engine functions
- Pricing tier logic
- Discount application
- Payment milestone calculations
- Data validation functions
- Target: 80%+ coverage

**Integration Tests:**
- API endpoint tests (all CRUD operations)
- Database transaction tests
- Authentication/authorization tests
- Document generation tests
- External API mocking (Census, GSA)

**Example Test:**
```python
def test_saas_tier_calculation():
    """Test Check Recognition pricing tier calculation"""
    # Given
    annual_scans = 25000
    # When
    monthly_price = calculate_check_recognition_price(annual_scans)
    # Then
    assert monthly_price == 340.00  # 15,001 - 30,000 tier
```

### 8.2 Frontend Testing

**Unit Tests (Vitest):**
- Component rendering
- Utility functions
- State management logic
- Form validation

**Integration Tests (React Testing Library):**
- User interactions
- Form submissions
- API integration (mocked)

**E2E Tests (Playwright):**
- Complete quote creation flow
- Document generation workflow
- Admin pricing configuration
- Quote versioning

**Example E2E Test:**
```typescript
test('Create quote end-to-end', async ({ page }) => {
  await page.goto('/quotes/new');

  // Step 1: Client info
  await page.fill('[name="clientName"]', 'City of Denver');
  await page.fill('[name="city"]', 'Denver');
  await page.selectOption('[name="state"]', 'CO');
  await page.click('button:has-text("Next")');

  // Step 2: SaaS products
  await page.check('[name="tellerStandard"]');
  await page.fill('[name="checkRecognitionScans"]', '50000');
  await page.click('button:has-text("Next")');

  // ... continue through all steps

  // Final: Generate document
  await page.click('button:has-text("Generate Order Form")');
  await expect(page.locator('.download-link')).toBeVisible();
});
```

### 8.3 Performance Testing

**Load Testing (Locust):**
- Simulate 20 concurrent users
- Test calculation endpoint response times
- Test document generation under load
- Identify bottlenecks

**Metrics:**
- API response time: < 500ms (p95)
- Document generation: < 10 seconds
- Database query time: < 100ms

### 8.4 Security Testing

**Automated Scans:**
- OWASP ZAP (web app vulnerabilities)
- Bandit (Python code security)
- npm audit (frontend dependencies)
- Trivy (Docker image scanning)

**Manual Testing:**
- SQL injection attempts
- XSS attempts
- Authentication bypass attempts
- Authorization escalation attempts

---

## 9. Development Standards & Best Practices

### 9.1 Code Quality Standards

**Enforcement:** All standards are enforced via automated tooling in CI/CD pipeline. Code that doesn't meet standards will fail the build.

#### 9.1.1 Naming Conventions

**Database:**
- **Tables:** PascalCase (e.g., `PricingVersions`, `QuoteVersions`, `SkuDefinitions`)
- **Columns:** PascalCase (e.g., `PricingVersionId`, `CreatedAt`, `IsActive`)
- **Primary Keys:** `Id` (UUID, consistently named across all tables)
- **Foreign Keys:** `{TableNameSingular}Id` (e.g., `PricingVersionId`, `QuoteId`)
- **Indexes:** `idx_{Table}_{Column(s)}` (e.g., `idx_Quotes_ClientName`)
- **Constraints:** `{Table}_{Column}_unique`, `{Table}_{Column}_check`

**Python (Backend):**
- **Classes:** PascalCase (e.g., `QuoteService`, `PricingVersionRepository`)
- **Functions/Methods:** snake_case (e.g., `calculate_saas_tiers`, `generate_order_form`)
- **Variables:** snake_case (e.g., `total_saas_monthly`, `pricing_version`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `DEFAULT_PROJECTION_YEARS`, `MAX_QUOTE_VERSIONS`)
- **Private methods:** Prefix with `_` (e.g., `_validate_pricing_version`)

**TypeScript (Frontend):**
- **Components:** PascalCase (e.g., `QuoteBuilder`, `SaaSProductSelector`)
- **Hooks:** camelCase with `use` prefix (e.g., `useQuotes`, `usePricingVersions`)
- **Functions:** camelCase (e.g., `calculateTotals`, `formatCurrency`)
- **Variables:** camelCase (e.g., `quoteVersion`, `totalSaasMonthly`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `API_BASE_URL`, `DEFAULT_TIMEOUT`)
- **Types/Interfaces:** PascalCase (e.g., `Quote`, `PricingVersion`, `QuoteBuilderProps`)

**Files & Folders:**
- **Python modules:** snake_case (e.g., `quote_service.py`, `pricing_repository.py`)
- **TypeScript files:** kebab-case (e.g., `quote-builder.tsx`, `use-quotes.ts`)
- **Test files:** `{module}.test.{ext}` (e.g., `quote_service.test.py`, `quote-builder.test.tsx`)

#### 9.1.2 Type Safety

**Python (Backend):**
- Use type hints for ALL function signatures
- Enable strict mypy checking in CI/CD
- Use Pydantic models for all API request/response schemas
- No `Any` types except where absolutely necessary (document why)

```python
from typing import Optional
from pydantic import BaseModel
from uuid import UUID

def calculate_saas_tier_price(
    product_code: str,
    volume: float,
    pricing_version_id: UUID
) -> float:
    """Calculate monthly price based on volume tier."""
    ...
```

**TypeScript (Frontend):**
- Enable strict mode in `tsconfig.json`
- No `any` types (use `unknown` if truly unknown, then narrow)
- Define interfaces for all API responses
- Use discriminated unions for variant types

```typescript
interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  createdAt: Date;
}

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED';
```

#### 9.1.3 Code Organization

**Backend Structure:**
```
backend/
├── app/
│   ├── api/                    # API routes/endpoints
│   │   ├── v1/
│   │   │   ├── quotes.py
│   │   │   ├── pricing.py
│   │   │   └── admin.py
│   ├── core/                   # Core business logic
│   │   ├── calculations/
│   │   │   ├── saas_pricing.py
│   │   │   ├── travel_costs.py
│   │   │   └── milestones.py
│   │   ├── documents/
│   │   │   ├── order_form.py
│   │   │   ├── implementation_plan.py
│   │   │   └── internal_detail.py
│   ├── models/                 # SQLAlchemy models
│   │   ├── pricing_version.py
│   │   ├── quote.py
│   │   └── sku.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── quote.py
│   │   ├── pricing.py
│   │   └── common.py
│   ├── repositories/           # Data access layer
│   │   ├── quote_repository.py
│   │   └── pricing_repository.py
│   ├── services/               # Business services
│   │   ├── quote_service.py
│   │   └── pricing_service.py
│   └── utils/                  # Utilities
│       ├── validators.py
│       └── formatters.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── alembic/                    # Database migrations
```

**Frontend Structure:**
```
frontend/
├── src/
│   ├── components/             # React components
│   │   ├── ui/                # Reusable UI components
│   │   ├── quotes/            # Quote-specific components
│   │   └── admin/             # Admin-specific components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   ├── stores/                # State management
│   ├── types/                 # TypeScript types
│   └── pages/                 # Page components
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### 9.2 Testing Requirements

**CRITICAL:** All code changes MUST include tests. No exceptions.

#### 9.2.1 Test Coverage Requirements

| Code Type | Minimum Coverage | Enforcement |
|-----------|-----------------|-------------|
| Business Logic (calculations, services) | 95% | CI/CD blocks merge if < 95% |
| API Endpoints | 90% | CI/CD blocks merge if < 90% |
| Utilities | 90% | CI/CD blocks merge if < 90% |
| UI Components | 70% | CI/CD warns if < 70% |
| Overall Project | 80% | CI/CD blocks merge if < 80% |

#### 9.2.2 Test-Driven Development (TDD) Workflow

**REQUIRED WORKFLOW:**
1. Write failing test first
2. Implement minimum code to make test pass
3. Refactor while keeping tests green
4. Run ALL tests before committing
5. Verify tests pass in CI/CD

**Example TDD Cycle:**
```python
# Step 1: Write failing test
def test_level_loading_calculation():
    """Test level loading creates constant annual amount."""
    # Given
    escalated_costs = [35400, 36816, 38289, 39820, 41413]  # 5 years with 4% escalation

    # When
    level_loaded = calculate_level_loading(escalated_costs)

    # Then
    assert level_loaded == pytest.approx(38347.60, rel=0.01)  # Average

# Step 2: Run test (fails - function doesn't exist)
# Step 3: Implement function
def calculate_level_loading(escalated_costs: list[float]) -> float:
    """Calculate level loaded annual amount."""
    total = sum(escalated_costs)
    years = len(escalated_costs)
    return total / years

# Step 4: Run test (passes)
# Step 5: Refactor if needed
```

#### 9.2.3 Integration Tests for Requirements Examples

**REQUIREMENT:** Create integration tests that demonstrate ALL major examples from the requirements document.

**Examples from Requirements to Test:**

**Example 1: City of Fond du Lac (Requirements Appendix B.5)**
```python
def test_fond_du_lac_quote_integration():
    """
    Integration test for City of Fond du Lac reference implementation.

    Requirements: Appendix B.5
    Total: $213,840 professional services
    Duration: 10 months
    Integrations: 8 (mix of bi-directional and import)
    Departments: 3
    Modules: Check Recognition, ICL, Revenue Submission, Teller Online
    """
    # Create pricing version
    pricing_version = create_pricing_version("2025.1")

    # Create quote
    quote = create_quote(
        client_name="City of Fond du Lac",
        client_state="WI"
    )

    # Add SaaS products
    add_saas_product(quote, "TELLER_STANDARD", quantity=1)
    add_saas_product(quote, "CHECK_RECOGNITION", annual_scans=60000)
    add_saas_product(quote, "ICL", annual_scans=60000)
    add_saas_product(quote, "REVENUE_SUBMISSION", templates=15)
    add_saas_product(quote, "TELLER_ONLINE", annual_transactions=75000)
    add_saas_product(quote, "BI_DIRECTIONAL_INTERFACE", quantity=6)
    add_saas_product(quote, "PAYMENT_IMPORT_INTERFACE", quantity=2)

    # Add Setup Packages
    add_sku(quote, "ORG-SETUP-ENT-MID")  # Enterprise Mid-tier
    add_sku(quote, "DEPT-SETUP-ADDITIONAL", quantity=2)  # 2 additional depts
    add_sku(quote, "INTEGRATION-CONFIG", quantity=6)  # 6 mature integrations
    add_sku(quote, "INTEGRATION-PAYMENT-IMPORT", quantity=2)
    add_sku(quote, "CHECK-ICL-SETUP")
    add_sku(quote, "REVENUE-BASE")
    add_sku(quote, "TELLER-ONLINE-SETUP")
    add_sku(quote, "TRAINING-USAGE")
    add_sku(quote, "TRAINING-MANAGEMENT")
    add_sku(quote, "TRAINING-CONFIGURATION")
    add_sku(quote, "TRAINING-IT-ADMIN")
    add_sku(quote, "PM-MONTH-STANDARD", quantity=10)

    # Calculate totals
    totals = calculate_quote_totals(quote)

    # Assert matches reference implementation
    assert totals.total_setup_packages == pytest.approx(213840, rel=0.02)
    assert totals.project_duration_months == 10
```

**Example 2: Multi-Year Projection with Level Loading (Requirements Section 3.6)**
```python
def test_multi_year_level_loading():
    """
    Test 5-year projection with level loading.

    Requirements: Section 3.6 - Level Loading Option
    """
    # Given: Base SaaS monthly cost
    base_monthly = 2950  # Teller Standard
    projection_years = 5
    escalation_rate = 0.04  # 4% annual

    # When: Calculate standard escalated projection
    escalated = calculate_multi_year_projection(
        base_monthly=base_monthly,
        years=projection_years,
        escalation_rate=escalation_rate
    )

    # Then: Verify escalated amounts
    assert escalated[0] == 35400  # Year 1: 2950 * 12
    assert escalated[1] == 36816  # Year 2: 35400 * 1.04
    assert escalated[4] == 41413  # Year 5

    # When: Apply level loading
    level_loaded = calculate_level_loading(escalated)

    # Then: Verify constant amount
    assert level_loaded == pytest.approx(38254, rel=0.01)
    assert sum(escalated) == pytest.approx(level_loaded * 5, rel=0.01)  # Revenue neutral
```

**Example 3: Travel Cost Calculation (Requirements Section 4.5)**
```python
def test_travel_cost_zone1_example():
    """
    Test travel cost calculation for Zone 1 example.

    Requirements: Section 4.5 - Travel Cost Formula
    Example: 2-day trip with 2 people to Zone 1 (Western US)
    """
    # Given
    trip = TravelTrip(
        zone_number=1,  # Western US
        days=2,
        people=2
    )

    zone_config = get_travel_zone(1)
    assert zone_config.airfare == 750
    assert zone_config.hotel_default == 180
    assert zone_config.per_diem_default == 60
    assert zone_config.vehicle_per_day == 125

    # When
    cost = calculate_trip_cost(trip, zone_config)

    # Then
    trip_nights = 3  # days + 1
    expected_airfare = 750 * 2  # $1,500
    expected_hotel = 180 * 2 * 3  # $1,080
    expected_per_diem = 60 * 2 * 3  # $360
    expected_vehicle = 125 * 3  # $375
    expected_total = 3315

    assert cost.airfare == expected_airfare
    assert cost.hotel == expected_hotel
    assert cost.per_diem == expected_per_diem
    assert cost.vehicle == expected_vehicle
    assert cost.total == expected_total
```

**Example 4: Payment Milestones - Deliverable-Based (Requirements Section 5.1)**
```python
def test_deliverable_based_milestones():
    """
    Test deliverable-based payment milestone calculation.

    Requirements: Section 5.1 Style B - Deliverable-Based
    Example: 10-month project, $186,750 total, 15% initial
    """
    # Given
    quote = create_quote_with_skus(
        total_setup_packages=186750,
        project_duration_months=10
    )

    # When
    milestones = calculate_deliverable_based_milestones(
        quote=quote,
        initial_payment_percentage=15.0,
        project_duration_months=10
    )

    # Then
    assert milestones.initial_payment == pytest.approx(28013, rel=0.01)  # 15%
    assert len(milestones.monthly_services) == 10
    assert milestones.monthly_services[0].amount == pytest.approx(6000, rel=0.01)

    # Verify specific deliverable milestones match requirements example
    enterprise_setup_milestone = find_milestone(milestones, "Enterprise Setup Complete")
    assert enterprise_setup_milestone.month == 2
    assert enterprise_setup_milestone.amount == pytest.approx(10250, rel=0.01)

    integration_req_milestone = find_milestone(milestones, "Integration Requirements")
    assert integration_req_milestone.month == 3
    assert integration_req_milestone.amount == pytest.approx(25750, rel=0.01)
```

#### 9.2.4 Pre-Commit Testing

**MANDATORY:** Run all tests before every commit.

**Git Pre-Commit Hook:**
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit tests..."

# Backend tests
cd backend
python -m pytest tests/ --cov=app --cov-fail-under=80 || exit 1

# Frontend tests
cd ../frontend
npm run test || exit 1
npm run type-check || exit 1

# Linting
cd ../backend
ruff check . || exit 1
black --check . || exit 1

cd ../frontend
npm run lint || exit 1

echo "All pre-commit checks passed!"
```

### 9.3 Code Compilation & Build Verification

**REQUIREMENT:** All code must compile/build successfully before handoff.

#### 9.3.1 Backend Compilation Checks

**Pre-Handoff Checklist:**
```bash
# 1. Type checking
mypy app/ --strict

# 2. Linting
ruff check .
black --check .

# 3. Run all tests
pytest tests/ -v --cov=app --cov-report=html

# 4. Check for security issues
bandit -r app/

# 5. Check dependencies
pip-audit

# 6. Build Docker image
docker build -t tellerquoter-backend:test .

# 7. Run container smoke test
docker run --rm tellerquoter-backend:test python -c "from app.main import app; print('OK')"
```

#### 9.3.2 Frontend Compilation Checks

**Pre-Handoff Checklist:**
```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Run all tests
npm test

# 4. Build production bundle
npm run build

# 5. Check bundle size
npm run analyze

# 6. Check for security issues
npm audit --audit-level=moderate

# 7. Run Lighthouse (performance)
npm run lighthouse
```

#### 9.3.3 CI/CD Build Pipeline

**All checks automated in GitHub Actions:**

```yaml
name: Build & Test

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: mypy app/ --strict
      - run: ruff check .
      - run: black --check .
      - run: pytest tests/ --cov=app --cov-fail-under=80
      - run: bandit -r app/
      - run: docker build -t tellerquoter-backend:${{ github.sha }} .

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'
      - run: npm run build
      - run: npm audit --audit-level=moderate
```

### 9.4 Code Review Standards

**REQUIRED:** All code must pass code review before merge.

**Review Checklist:**
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage meets thresholds
- [ ] Type checking passes (mypy, TypeScript)
- [ ] Linting passes (ruff, ESLint)
- [ ] No security vulnerabilities (Bandit, npm audit)
- [ ] Code compiles/builds successfully
- [ ] Documentation updated (docstrings, comments)
- [ ] Database migrations included (if schema changes)
- [ ] Integration tests cover requirements examples
- [ ] No hardcoded secrets or credentials
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate (not too verbose, not too sparse)

### 9.5 Documentation Standards

**Docstrings (Python):**
```python
def calculate_saas_tier_price(
    product_code: str,
    volume: float,
    pricing_version_id: UUID
) -> float:
    """
    Calculate monthly SaaS price based on volume tier.

    Uses the pricing tier thresholds from the specified pricing version
    to determine the appropriate price for the given volume.

    Args:
        product_code: Product identifier (e.g., "CHECK_RECOGNITION")
        volume: Volume input for tiered pricing (e.g., annual scans)
        pricing_version_id: Pricing version to use for tier lookup

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

**JSDoc (TypeScript):**
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
  ...
}
```

### 9.6 Error Handling Standards

**Backend:**
```python
from app.exceptions import QuoteNotFoundException, PricingVersionExpiredException

def get_quote_version(quote_id: UUID, version_number: int) -> QuoteVersion:
    """Get specific quote version with error handling."""
    quote = quote_repository.get_by_id(quote_id)
    if not quote:
        raise QuoteNotFoundException(f"Quote {quote_id} not found")

    version = quote.get_version(version_number)
    if not version:
        raise QuoteVersionNotFoundException(
            f"Version {version_number} not found for quote {quote_id}"
        )

    # Check if pricing version has expired
    if version.pricing_version.expiration_date:
        if version.pricing_version.expiration_date < date.today():
            logger.warning(
                f"Quote version {version.id} uses expired pricing version "
                f"{version.pricing_version.version_number}"
            )

    return version
```

**Frontend:**
```typescript
try {
  const quote = await quoteApi.getQuoteVersion(quoteId, versionNumber);
  return quote;
} catch (error) {
  if (error instanceof QuoteNotFoundError) {
    toast.error(`Quote ${quoteId} not found`);
    navigate('/quotes');
  } else if (error instanceof NetworkError) {
    toast.error('Network error. Please try again.');
  } else {
    logger.error('Unexpected error fetching quote', { error, quoteId });
    toast.error('An unexpected error occurred');
  }
  throw error;
}
```

### 9.7 Database Migration Standards

**REQUIRED:** All schema changes must include migration scripts.

**Migration Naming:**
```
alembic/versions/
  2025_01_15_1430_create_pricing_versions_table.py
  2025_01_16_0930_add_hardware_catalog_table.py
  2025_01_20_1100_add_calculation_parameters_table.py
```

**Migration Template:**
```python
"""Add calculation_parameters table

Revision ID: abc123def456
Revises: previous_revision
Create Date: 2025-01-20 11:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'abc123def456'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Apply migration."""
    op.create_table(
        'CalculationParameters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('pricing_version_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parameter_name', sa.String(100), nullable=False),
        sa.Column('parameter_value', sa.Numeric(10, 4), nullable=False),
        sa.Column('parameter_description', sa.Text()),
        sa.ForeignKeyConstraint(['pricing_version_id'], ['PricingVersions.id']),
        sa.UniqueConstraint('pricing_version_id', 'parameter_name')
    )

    # Create indexes
    op.create_index(
        'idx_calculation_parameters_pricing_version',
        'CalculationParameters',
        ['pricing_version_id']
    )

def downgrade() -> None:
    """Revert migration."""
    op.drop_index('idx_calculation_parameters_pricing_version')
    op.drop_table('CalculationParameters')
```

**Testing Migrations:**
```bash
# Test upgrade
alembic upgrade head

# Test downgrade
alembic downgrade -1

# Test re-upgrade
alembic upgrade head

# Verify data integrity
python scripts/verify_migration.py
```

---

## 10. Data Migration

### 10.1 Excel to Database Migration

**Source:** Pricing Investment Template V11.xlsx

**Migration Script:** `backend/scripts/migrate_v11_data.py`

**Process:**
1. Parse Excel file using `openpyxl`
2. Extract pricing data:
   - SKU definitions (26 SKUs)
   - SaaS product pricing tiers
   - Travel zones and costs
   - Text snippets (assumptions, warranty, etc.)
3. Create initial pricing version (e.g., "2025.1 - Initial Release")
4. Insert all data into PostgreSQL
5. Validate calculations match Excel output
6. Generate migration report

**Validation:**
- For each SKU: Verify price, hours, description
- For each SaaS tier: Verify thresholds, prices
- Run test quotes, compare totals to Excel
- Manual review by finance team

### 9.2 Data Seeding

**Seed Data for Testing:**
- 3 pricing versions (current, previous, future)
- 5 sample quotes with versions
- 10 mature integrations
- 5 referrers
- All 26 SKUs
- All SaaS products with tiers

**Script:** `backend/scripts/seed_dev_data.py`

---

## 10. Operational Considerations

### 10.1 Monitoring & Alerting

**Metrics to Track:**
- API response times (p50, p95, p99)
- Error rates (5xx, 4xx)
- Database connection pool usage
- Document generation success rate
- Active user count
- Quote creation rate

**Alerts:**
- API error rate > 5% (15 min window) → Page ops team
- Database CPU > 80% (10 min window) → Email ops team
- Document generation failures > 10% → Email ops team
- RDS storage < 10% free → Email ops team

**Dashboards (CloudWatch):**
1. **Application Health** - Error rates, response times, uptime
2. **Database Performance** - CPU, memory, connections, query times
3. **Business Metrics** - Quotes created, documents generated, active users

### 10.2 Backup & Disaster Recovery

**RDS Backups:**
- Automated daily snapshots (7-day retention)
- Point-in-time recovery enabled (5-day window)
- Weekly manual snapshots (30-day retention)

**S3 Document Backups:**
- Versioning enabled (all versions retained)
- Cross-region replication to us-west-2 (disaster recovery)

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 1 hour

**Disaster Recovery Plan:**
1. Identify failure (monitoring alerts)
2. Assess impact (data loss, service outage)
3. Restore RDS from latest snapshot
4. Redeploy application from known-good Docker images
5. Validate functionality with smoke tests
6. Resume operations

### 10.3 Support & Maintenance

**Support Tiers:**
- **L1 (Sales Team Self-Service):** User guide, FAQ, training videos
- **L2 (Internal IT Support):** Basic troubleshooting, password resets
- **L3 (Development Team):** Bug fixes, feature requests, pricing updates

**Maintenance Windows:**
- Database patching: Monthly, 3rd Sunday, 2am-4am MT
- Application deployments: As needed, during business hours (blue/green, zero downtime)

**Change Management:**
- Minor updates (bug fixes): Deploy to staging → Production within 1 day
- Major updates (new features): Deploy to staging → UAT (1 week) → Production
- Pricing updates: Admin UI (no deployment required)

### 10.4 Scaling Plan

**Current Capacity:** 20 concurrent users

**Growth Scenarios:**

| Users | Backend | Frontend | Database | Expected Date |
|-------|---------|----------|----------|---------------|
| 20 | 1-2 App Runner instances | 2 ECS tasks | db.t4g.medium | Launch |
| 50 | 2-4 App Runner instances | 3-4 ECS tasks | db.t4g.large | +6 months |
| 100 | 4-8 App Runner instances | 5-6 ECS tasks | db.r6g.large | +12 months |

**Auto-Scaling Triggers:**
- Backend: CPU > 70% for 5 min → scale out
- Frontend: Request count > 1000/min → scale out
- Database: CPU > 70% → manual scale-up (requires brief downtime)

---

## 11. Success Metrics

### 11.1 Performance KPIs

| Metric | Target | Current (Excel) |
|--------|--------|-----------------|
| Time to create quote | < 15 minutes | 30-45 minutes |
| Document generation time | < 10 seconds | 5-10 minutes (manual) |
| Quote search/retrieval | < 2 seconds | N/A (file browsing) |
| System availability | 99% | N/A |
| Calculation accuracy | 100% match to V11.xlsx | 100% (baseline) |

### 11.2 Business KPIs

| Metric | Target | How to Measure |
|--------|--------|----------------|
| User adoption | 100% of sales team | Active user count |
| Quote volume | 50+ quotes/month | Database metrics |
| Document quality | Zero client-reported errors | Support tickets |
| Pricing update frequency | < 5 minutes to update | Admin UI usage logs |
| Training time for new users | < 2 hours | HR onboarding data |

### 11.3 Technical KPIs

| Metric | Target | Tool |
|--------|--------|------|
| Test coverage | > 80% | pytest-cov, Vitest |
| Uptime | 99% | CloudWatch |
| API p95 latency | < 500ms | CloudWatch |
| Security vulnerabilities | Zero critical/high | OWASP ZAP, Snyk |
| Code quality | Maintainability A | SonarQube |

---

## 12. Risks & Mitigation

### 12.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Calculation discrepancies vs Excel | High | Medium | Extensive validation, side-by-side testing, finance review |
| Document generation quality issues | High | Medium | Template review with sales, multiple iterations |
| Microsoft Entra ID integration issues | High | Low | Early prototype, fallback to email/password auth |
| AWS cost overruns | Medium | Low | Cost monitoring, budget alerts, reserved instances |
| Performance degradation at scale | Medium | Medium | Load testing, auto-scaling configuration |
| Data migration errors | High | Medium | Migration dry-runs, rollback plan, parallel run period |

### 12.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User resistance to change | High | Medium | Early user involvement, comprehensive training, phased rollout |
| Missing features vs Excel | Medium | Medium | Feature parity checklist, UAT with power users |
| Pricing data inaccuracies | High | Low | Finance team validation, audit trail, version control |
| Insufficient training | Medium | Low | Multiple training sessions, video tutorials, documentation |

### 12.3 Schedule Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | High | High | Strict change control, MVP focus, Phase 2 backlog |
| Resource availability | Medium | Medium | Cross-training, external contractors if needed |
| Third-party API unavailability | Low | Low | Fallback to manual entry, cached data |
| Testing delays | Medium | Medium | Automated testing, early UAT involvement |

---

## 13. Post-Launch Roadmap

### Phase 2 Features (Future Enhancements)

**Quote Management:**
- Quote templates (save SKU configurations for reuse)
- Quote cloning across clients
- Bulk quote operations
- Advanced search filters (date range, amount range, status)

**Collaboration:**
- Multi-user quote editing with locking
- Comments on quote versions
- Approval workflow (sales → manager → finance)
- Client portal for viewing quotes

**Analytics:**
- Quote win/loss tracking
- Pricing analytics dashboard
- Sales performance metrics
- Common SKU combinations report
- Discount impact analysis

**Integrations:**
- Salesforce integration (sync opportunities)
- QuickBooks integration (automatic invoice creation)
- DocuSign integration (e-signature on Order Forms)
- Slack notifications (quote milestones)

**Advanced Pricing:**
- Customer-specific pricing
- Volume discounts across multiple quotes
- Contract amendments (change orders)
- Renewal quote generation

**Document Enhancements:**
- Custom branding per client
- Multi-language support
- Interactive PDF forms
- Presentation mode (slide deck generation)

---

## 14. Team & Roles

### 14.1 Development Team

| Role | Responsibilities | Allocation |
|------|------------------|------------|
| **Tech Lead** | Architecture, code review, technical decisions | 100% |
| **Backend Developer** | API, database, calculations, documents | 100% |
| **Frontend Developer** | React UI, state management, forms | 100% |
| **DevOps Engineer** | AWS infrastructure, CI/CD, monitoring | 50% |
| **QA Engineer** | Test strategy, E2E tests, UAT coordination | 50% |

### 14.2 Stakeholders

| Role | Involvement |
|------|-------------|
| **Sales Leadership** | Requirements validation, UAT, training |
| **Finance** | Pricing validation, Quickbooks mapping |
| **IT Security** | Security review, Entra ID configuration |
| **Implementation Team** | SKU scope validation, delivery milestone review |

### 14.3 Communication Plan

**Weekly Status Meetings:**
- Development team sync (30 min)
- Stakeholder update (30 min)

**Milestones Reviews:**
- End of each phase: Demo to stakeholders
- Gather feedback, adjust plan if needed

**Slack Channels:**
- `#tellerquoter-dev` - Development team
- `#tellerquoter-stakeholders` - Broader updates

---

## 15. Budget Estimate

### 15.1 Development Costs (22 weeks)

| Resource | Rate | Hours | Cost |
|----------|------|-------|------|
| Tech Lead | $150/hr | 880 (22 weeks × 40 hrs) | $132,000 |
| Backend Dev | $120/hr | 880 | $105,600 |
| Frontend Dev | $120/hr | 880 | $105,600 |
| DevOps (50%) | $130/hr | 440 | $57,200 |
| QA (50%) | $100/hr | 440 | $44,000 |
| **Total Development** | | | **$444,400** |

### 15.2 AWS Infrastructure Costs (Monthly)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t4g.medium, Multi-AZ | $120 |
| ECS Fargate (Frontend) | 2 tasks × 0.25 vCPU, 0.5 GB | $20 |
| App Runner (Backend) | 1-2 instances | $50 |
| S3 Storage | 100 GB docs + static | $5 |
| CloudFront | 500 GB transfer | $40 |
| ALB | 1 load balancer | $25 |
| Secrets Manager | 5 secrets | $2 |
| CloudWatch | Logs + metrics | $30 |
| **Total Monthly** | | **~$292** |
| **Annual (Year 1)** | | **~$3,500** |

### 15.3 Third-Party Services

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| Sentry | Error tracking | $26 (Team plan) |
| GitHub | Repository, CI/CD | $0 (included) |
| Domain + SSL | Route 53, ACM | $1 |
| **Total Monthly** | | **$27** |

### 15.4 Total Project Cost

| Category | Cost |
|----------|------|
| Development (22 weeks) | $444,400 |
| Infrastructure (Year 1) | $3,500 |
| Third-Party Services (Year 1) | $324 |
| Contingency (10%) | $44,822 |
| **Total Project Cost** | **$493,046** |

**Ongoing Annual Costs (Post-Launch):**
- AWS Infrastructure: ~$3,500
- Third-Party Services: ~$324
- Maintenance & Support (20% of dev cost annually): ~$88,880
- **Total Annual: ~$92,704**

---

## 16. Conclusion

This implementation plan provides a comprehensive roadmap for building the Teller Quoting System from requirements through production deployment. The phased approach ensures incremental value delivery while managing risks and maintaining quality.

**Key Success Factors:**
1. **Early stakeholder involvement** - Continuous feedback from sales and finance
2. **Phased delivery** - Working software at each phase milestone
3. **Automated testing** - Ensures calculation accuracy and prevents regressions
4. **Pricing versioning** - Protects historical quote integrity
5. **Comprehensive training** - Smooth transition from Excel workflow

**Next Steps:**
1. Review and approve this implementation plan
2. Secure budget and resources
3. Set up development environment (Week 1)
4. Begin Phase 1: Foundation
5. Schedule weekly stakeholder syncs

**Timeline:** 22 weeks from kickoff to production launch

**Budget:** $493,046 total project cost, $92,704 annual ongoing

---

**Prepared by:** Development Team
**Date:** December 3, 2025
**Status:** Ready for Stakeholder Review
