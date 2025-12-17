# Requirements Document Update Proposal

**Date:** December 9, 2025
**Based On:** Analysis of Pricing Investment Template V11.xlsx
**Purpose:** Proposed changes to requirements documentation to align with actual sales process

---

## Summary of Changes

This document proposes updates to the requirements documentation based on analysis of the actual Excel-based quoting tool (Pricing Investment Template V11.xlsx) that salespeople currently use.

**Key Changes:**
1. Complete rewrite of Section 2.2 (SaaS Product Configuration) to use module-based model
2. New Section 2.2.4 (Integration Configuration) with named integration selection
3. Update Section 2.3.4 (Online Forms) to support multi-form quoting
4. Add Volume Parameters concept throughout

---

## Section 2.2: SaaS Product Configuration (Recurring Monthly Costs)

**[REPLACES CURRENT SECTION 2.2]**

### Overview

The SaaS configuration is **module-driven**, not simply product-driven. Users select a base Teller product, then enable specific application modules, each with its own monthly SaaS cost and potential setup SKU.

### 2.2.1 Base Product Selection

Users select between two Teller products:

| Product | Monthly Cost | Included Users | Departments |
|---------|--------------|----------------|-------------|
| **Teller Standard** | $2,950/month | 5 Named Users | Multi-department |
| **Teller Basic** | $995/month | 5 Named Users | Single department |

**User Interface:**
- Radio button or dropdown: "Teller Standard" or "Teller Basic"
- Default: Teller Standard
- Helper text: "Teller Basic is single-department only"

**Data Storage:**
```json
{
  "base_product": "standard",  // or "basic"
  "base_monthly_cost": 2950.00
}
```

### 2.2.2 Additional Named Users

Beyond the 5 Named Users included in the base product, clients can add more users.

**Pricing:** $60/month per additional user

**User Interface:**
- Number input: "Additional Named Users (beyond 5 included)"
- Default: 0
- Range: 0-999

**Calculation:**
```
additional_user_cost = additional_users × $60
```

**Data Storage:**
```json
{
  "additional_users": 3,
  "additional_users_monthly_cost": 180.00
}
```

### 2.2.3 Application Modules

Application modules are discrete functional units that clients can enable. Each module has:
1. **Monthly SaaS Cost**: Recurring subscription price
2. **Volume Parameters**: Usage metrics (optional, varies by module)
3. **Setup SKU**: One-time implementation cost (if "is_new" flag set)

#### Module List

| Module Code | Module Name | Monthly Cost | Volume Parameter | Setup SKU | Setup Cost |
|-------------|-------------|--------------|------------------|-----------|------------|
| CHECK_RECOGNITION | Check Recognition/Bulk Scanning | $1,030 | Monthly scan volume | CHECK-ICL-SETUP | $12,880 |
| IMAGE_CASH_LETTER | Image Cash Letter | $669.50 | - | CHECK-ICL-SETUP | $12,880 |
| REVENUE_SUBMISSION | Revenue Submission | $570 | Number of submitters | REVENUE-SUBMISSION-SETUP | $8,000* |
| WORKFLOW | Workflow Submission | $475 | Number of workflows | WORKFLOW-SETUP | $6,000* |
| ONLINE_PORTAL | Online Customer Portal | $700 | Monthly transactions | ONLINE-PORTAL-SETUP | $10,000* |

*Note: Setup costs are estimates and may vary based on volume parameters or be determined by rule engine.

#### User Interface for Each Module

For each module, present:
```
☐ Check Recognition/Bulk Scanning
   Monthly SaaS Cost: $1,030

   ☐ New Implementation (requires setup)

   Volume Parameters:
   ├─ Monthly Scan Volume: [_______] scans

   If new: Includes CHECK-ICL-SETUP ($12,880 one-time)
```

**Interaction Flow:**
1. User checks module checkbox → module enabled
2. User checks "New Implementation" → setup SKU auto-added
3. User enters volume parameters → stored for reference (may affect pricing in future)

#### Auto-Selection Rules

When modules are enabled, certain setup SKUs are automatically included:

**Rule 1: Check Recognition + ICL Share Setup**
```
IF (CHECK_RECOGNITION.enabled AND CHECK_RECOGNITION.is_new)
   OR (IMAGE_CASH_LETTER.enabled AND IMAGE_CASH_LETTER.is_new)
THEN
   Include CHECK-ICL-SETUP ($12,880) ONCE
   (Not duplicated if both modules enabled)
```

**Rule 2: Revenue Submission**
```
IF REVENUE_SUBMISSION.enabled AND REVENUE_SUBMISSION.is_new
THEN
   Include REVENUE-SUBMISSION-SETUP
   Price may vary based on num_submitters (tiered pricing)
```

**Rule 3: Workflow**
```
IF WORKFLOW.enabled AND WORKFLOW.is_new
THEN
   Include WORKFLOW-SETUP
   Price may vary based on num_workflows
```

**Rule 4: Online Portal**
```
IF ONLINE_PORTAL.enabled AND ONLINE_PORTAL.is_new
THEN
   Include ONLINE-PORTAL-SETUP
   Price may vary based on monthly_transactions (tiered pricing)
```

#### Data Storage

**QuoteVersion.Configuration:**
```json
{
  "modules": {
    "check_recognition": {
      "enabled": true,
      "is_new": true,
      "scan_volume": 75000
    },
    "image_cash_letter": {
      "enabled": true,
      "is_new": true
    },
    "revenue_submission": {
      "enabled": true,
      "is_new": false,  // Already implemented, no setup cost
      "num_submitters": 15
    },
    "online_portal": {
      "enabled": false
    }
  }
}
```

**Quote Calculation Results:**
```json
{
  "saas_costs": {
    "base_product": {
      "product_code": "TELLER-STANDARD",
      "monthly_cost": 2950.00
    },
    "modules": [
      {
        "module_code": "CHECK_RECOGNITION",
        "monthly_cost": 1030.00,
        "volume": 75000,
        "volume_unit": "scans"
      },
      {
        "module_code": "IMAGE_CASH_LETTER",
        "monthly_cost": 669.50
      },
      {
        "module_code": "REVENUE_SUBMISSION",
        "monthly_cost": 570.00,
        "volume": 15,
        "volume_unit": "submitters"
      }
    ],
    "total_monthly_recurring": 5219.50
  },
  "setup_skus": [
    {
      "sku_code": "CHECK-ICL-SETUP",
      "name": "Check Recognition & ICL Setup",
      "cost": 12880.00,
      "reason": "Required for Check Recognition and Image Cash Letter modules"
    }
  ]
}
```

---

## Section 2.2.4: Integration Configuration (NEW SECTION)

### Overview

Integrations connect Teller to external systems. Unlike generic "interface counts", the system tracks **named, specific integrations** with known vendors.

There are two types of integrations:
1. **Bi-Directional Interfaces**: Two-way data sync ($285/month each)
2. **Payment Import Interfaces**: One-way payment data import ($170/month each)

### Mature vs Custom Integrations

The system maintains a **Mature Integrations List** of pre-built interfaces:

**Mature Integration Examples:**
- Tyler Munis (Tyler Technologies) - Financial management
- Tyler Incode (Tyler Technologies) - Public sector ERP
- Springbrook (Springbrook Software) - Government financial software
- Logos (Innoprise) - Utility billing
- Eden (Central Square) - Public sector software
- CSDC Incode (CSDC) - Court system

**Mature Integration Setup:** $2,000 (existing interface, configuration only)
**Custom Integration Setup:** $8,000 (requires development)

### User Interface

#### Bi-Directional Interfaces Section

```
Bi-Directional Interfaces ($285/month each)
═══════════════════════════════════════════

[+ Add Bi-Directional Interface]

Integration 1:
├─ System Name: [Dropdown: Tyler Munis ▼]
│               [Or enter custom system name...]
├─ Vendor: Tyler Technologies (auto-filled)
├─ ☐ New Implementation (requires setup)
│     If checked: $2,000 setup (mature) or $8,000 (custom)
└─ Monthly Cost: $285

Integration 2:
├─ System Name: [Dropdown: Springbrook ▼]
├─ Vendor: Springbrook Software
├─ ☑ New Implementation
│     → INTEGRATION-MATURE: $2,000 (Springbrook is in mature list)
└─ Monthly Cost: $285

Integration 3:
├─ System Name: [Custom: "Internal HR System"]
├─ Vendor: [Custom Vendor Inc.]
├─ ☑ New Implementation
│     → INTEGRATION-CUSTOM: $8,000 (not in mature list)
└─ Monthly Cost: $285

Total Bi-Directional: $855/month recurring, $10,000 one-time setup
```

#### Payment Import Interfaces Section

Similar interface pattern:
```
Payment Import Interfaces ($170/month each)
═══════════════════════════════════════════

[+ Add Payment Import Interface]

Integration 1:
├─ System Name: [Dropdown: Financials A/R ▼]
├─ Vendor: [Auto-filled or custom]
├─ ☐ Already Integrated (no setup cost)
└─ Monthly Cost: $170
```

### Auto-Selection Rules

**Rule: Mature Integration Detected**
```
IF integration.system_name IN MatureIntegrations.system_names
   AND integration.is_new = true
THEN
   Add SKU: INTEGRATION-MATURE ($2,000)
   Reason: "{system_name} has existing Teller interface"
```

**Rule: Custom Integration**
```
IF integration.system_name NOT IN MatureIntegrations.system_names
   AND integration.is_new = true
THEN
   Add SKU: INTEGRATION-CUSTOM ($8,000)
   Reason: "Custom integration development required for {system_name}"
```

**Rule: Existing Integration**
```
IF integration.is_new = false
THEN
   Setup Cost: $0
   Reason: "Integration already configured"
```

### Data Storage

**QuoteVersion.Configuration:**
```json
{
  "integrations": {
    "bidirectional": [
      {
        "system_name": "Tyler Munis",
        "vendor": "Tyler Technologies",
        "is_new": true,
        "is_mature": true,
        "monthly_cost": 285.00,
        "setup_cost": 2000.00
      },
      {
        "system_name": "Internal HR System",
        "vendor": "Custom Vendor Inc.",
        "is_new": true,
        "is_mature": false,
        "monthly_cost": 285.00,
        "setup_cost": 8000.00
      }
    ],
    "payment_import": [
      {
        "system_name": "Financials A/R",
        "vendor": "Various",
        "is_new": false,
        "is_mature": true,
        "monthly_cost": 170.00,
        "setup_cost": 0.00
      }
    ]
  }
}
```

### Database Requirements

**MatureIntegrations Table** (already exists):
```sql
CREATE TABLE "MatureIntegrations" (
  "Id" UUID PRIMARY KEY,
  "IntegrationCode" VARCHAR(50) UNIQUE NOT NULL,
  "SystemName" VARCHAR(255) NOT NULL,
  "Vendor" VARCHAR(255),
  "Comments" TEXT,
  "IsActive" BOOLEAN DEFAULT TRUE,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW()
);
```

**Seed Data Required:**
```sql
INSERT INTO "MatureIntegrations" (IntegrationCode, SystemName, Vendor, IsActive) VALUES
  ('TYLER-MUNIS', 'Tyler Munis', 'Tyler Technologies', true),
  ('TYLER-INCODE', 'Tyler Incode', 'Tyler Technologies', true),
  ('SPRINGBROOK', 'Springbrook', 'Springbrook Software', true),
  ('LOGOS', 'Logos', 'Innoprise', true),
  ('EDEN', 'Eden', 'Central Square', true),
  ('CSDC-INCODE', 'CSDC Incode', 'CSDC', true);
```

---

## Section 2.3.4: Online Forms Configuration (UPDATED)

**[REPLACES CURRENT SECTION 2.3.4]**

### Overview

Salespeople often quote **multiple online forms** in a single implementation. Each form has a complexity tier and optional workflow addon.

### Complexity Tiers

| Tier | Typical Criteria | Base Setup Cost |
|------|------------------|-----------------|
| **Simple** | <15 fields, basic validation, no custom logic | $4,600 |
| **Medium** | 15-30 fields, moderate validation, some calculations | $9,200 |
| **Complex** | >30 fields, complex business rules, custom code | $16,560 |

### Workflow Addon

Any form can include workflow approval routing:
- **Workflow Addon Cost:** $5,520 per form

**Examples:**
- Medium form + Workflow = $9,200 + $5,520 = $14,720
- Complex form + Workflow = $16,560 + $5,520 = $22,080

### User Interface - Option A: Count-Based (MVP)

For rapid quoting, allow salespeople to specify counts at each level:

```
Online Forms Configuration
═══════════════════════════

Simple Forms
├─ Without Workflow: [0] × $4,600 = $0
└─ With Workflow:    [2] × $10,120 = $20,240

Medium Forms
├─ Without Workflow: [1] × $9,200 = $9,200
└─ With Workflow:    [1] × $14,720 = $14,720

Complex Forms
├─ Without Workflow: [0] × $16,560 = $0
└─ With Workflow:    [2] × $22,080 = $44,160

─────────────────────────────────────────
Total: 6 forms, $88,320 one-time setup
```

**Benefits:**
- Fast for salespeople (similar to Excel)
- Simple validation (just numbers)
- Easy to calculate totals

**Data Storage:**
```json
{
  "online_forms": {
    "simple": 0,
    "simple_with_workflow": 2,
    "medium": 1,
    "medium_with_workflow": 1,
    "complex": 0,
    "complex_with_workflow": 2,
    "total_forms": 6,
    "total_cost": 88320.00
  }
}
```

### User Interface - Option B: Detailed List (Future Enhancement)

For more detailed quoting, allow specification of each form:

```
Online Forms Configuration
═══════════════════════════

[+ Add Online Form]

Form 1: License Application
├─ Complexity: [Simple ▼]
├─ ☐ Workflow Required
├─ Notes: Basic license application, minimal validation
└─ Cost: $4,600

Form 2: Permit Renewal
├─ Complexity: [Medium ▼]
├─ ☑ Workflow Required
├─ Notes: Multi-step approval process with department routing
└─ Cost: $14,720 ($9,200 + $5,520 workflow)

Form 3: Business Registration
├─ Complexity: [Complex ▼]
├─ ☑ Workflow Required
├─ Notes: Extensive validation, fee calculations, document uploads
└─ Cost: $22,080

─────────────────────────────────────────
Total: 3 forms, $41,400 one-time setup
```

**Benefits:**
- Better documentation (form names and notes)
- Easier to review and modify specific forms
- More context for implementation team

**Data Storage:**
```json
{
  "online_forms": {
    "forms": [
      {
        "name": "License Application",
        "complexity": "simple",
        "workflow_required": false,
        "notes": "Basic license application, minimal validation",
        "cost": 4600.00
      },
      {
        "name": "Permit Renewal",
        "complexity": "medium",
        "workflow_required": true,
        "notes": "Multi-step approval process",
        "cost": 14720.00
      },
      {
        "name": "Business Registration",
        "complexity": "complex",
        "workflow_required": true,
        "notes": "Extensive validation, fee calculations",
        "cost": 22080.00
      }
    ],
    "total_forms": 3,
    "total_cost": 41400.00
  }
}
```

### Recommendation

**Phase 1 (MVP):** Implement Option A (count-based) to match Excel workflow
**Phase 2:** Add Option B (detailed list) for enhanced documentation

### Auto-Selection Logic

The system automatically generates SKUs based on user inputs.

**Counts-Based Calculation:**
```python
total_cost = 0
sku_list = []

# Simple forms
if simple_count > 0:
    sku_list.append({
        "sku_code": "ONLINE-FORM-TIER1",
        "quantity": simple_count,
        "unit_price": 4600.00,
        "total_price": simple_count * 4600.00
    })

if simple_workflow_count > 0:
    sku_list.append({
        "sku_code": "ONLINE-FORM-TIER1",
        "quantity": simple_workflow_count,
        "unit_price": 4600.00,
        "total_price": simple_workflow_count * 4600.00
    })
    sku_list.append({
        "sku_code": "ONLINE-FORM-WORKFLOW-ADDON",
        "quantity": simple_workflow_count,
        "unit_price": 5520.00,
        "total_price": simple_workflow_count * 5520.00
    })

# Medium forms
if medium_count > 0:
    sku_list.append({
        "sku_code": "ONLINE-FORM-TIER2",
        "quantity": medium_count,
        "unit_price": 9200.00,
        "total_price": medium_count * 9200.00
    })

# Complex forms
if complex_workflow_count > 0:
    sku_list.append({
        "sku_code": "ONLINE-FORM-TIER3",
        "quantity": complex_workflow_count,
        "unit_price": 16560.00,
        "total_price": complex_workflow_count * 16560.00
    })
    sku_list.append({
        "sku_code": "ONLINE-FORM-WORKFLOW-ADDON",
        "quantity": complex_workflow_count,
        "unit_price": 5520.00,
        "total_price": complex_workflow_count * 5520.00
    })
```

---

## Section 3.X: Volume Parameters (NEW SECTION)

### Overview

Many modules and configurations include **volume parameters** - quantitative metrics about expected usage. While these parameters may not immediately affect pricing, they:

1. **Document client scale** for project planning
2. **Support future tiered pricing** if volume-based costs are introduced
3. **Help implementation teams** understand scope

### Volume Parameters by Configuration Area

#### Application Modules

| Module | Volume Parameter | Unit | Purpose |
|--------|------------------|------|---------|
| Check Recognition | scan_volume | scans/month | May affect SaaS tier or setup complexity |
| Revenue Submission | num_submitters | users | May affect setup complexity |
| Workflow | num_workflows | workflows | May affect setup scope |
| Online Portal | monthly_transactions | transactions/month | May affect SaaS tier |

**Current Behavior:** Parameters are captured but do not affect pricing (fixed pricing model)

**Future Enhancement:** Could implement tiered pricing:
```
IF scan_volume < 50000 THEN tier1_price
ELSE IF scan_volume < 200000 THEN tier2_price
ELSE tier3_price
```

#### Organization Setup

| Parameter | Purpose |
|-----------|---------|
| num_departments | Directly affects SKU selection (Basic vs Enterprise + Additional) |
| department_names | Documentation only (optional) |

#### Project Management

| Parameter | Purpose |
|-----------|---------|
| project_duration_months | Directly affects cost (PM price × months) |
| is_complex | Affects Standard vs Enterprise PM selection |

### Data Storage

All volume parameters stored in `QuoteVersion.Configuration` JSONB field:

```json
{
  "volume_parameters": {
    "check_recognition_scans": 75000,
    "revenue_submission_users": 15,
    "workflow_count": 2,
    "online_portal_transactions": 50000,
    "num_departments": 2,
    "project_duration_months": 9
  }
}
```

### User Interface Guidelines

**Display volume parameters clearly:**
- Use helpful labels: "Monthly Scan Volume" not "scan_volume"
- Show units: "75,000 scans/month" not "75000"
- Provide context: "Estimated monthly transaction volume through online portal"
- Make optional unless required for pricing: "(optional, for planning purposes)"

---

## Implementation Priority

### Phase 1: Core Corrections (This Sprint)
1. ✅ Update requirements document with these changes
2. 🔨 Rebuild SaaS configuration API endpoint (module-based)
3. 🔨 Implement integration configuration API endpoint (named integrations)
4. 🔨 Fix online forms to support counts

### Phase 2: Data Population (Next Sprint)
1. Seed ApplicationModules table with all modules
2. Seed MatureIntegrations table with known systems
3. Link SaaS products to modules
4. Test auto-selection logic

### Phase 3: Frontend (Following Sprint)
1. Build module selection UI
2. Build integration selection UI with dropdown + custom entry
3. Build online forms count-based UI
4. Connect to updated API endpoints

---

## Questions for Review

1. **Module Pricing**: Should module setup costs be fixed or volume-dependent?
   - Current Excel: Fixed costs
   - Recommendation: Start with fixed, add tiering in Phase 2

2. **Integration UI**: Should integration dropdown be searchable/filterable?
   - Recommendation: Yes, with typeahead search

3. **Online Forms**: Count-based (Option A) or detailed list (Option B) first?
   - Recommendation: Count-based matches Excel, implement first

4. **Volume Parameters**: Should any volume parameters affect pricing immediately?
   - Recommendation: No, capture for documentation only initially

5. **Mature Integrations List**: Who maintains this list?
   - Recommendation: Admin UI to manage MatureIntegrations table

---

## Conclusion

These requirement updates align the system design with the actual Excel-based sales process, ensuring that the application reflects real-world usage patterns and salesperson workflows.

**Next Steps:**
1. Review and approve this proposal
2. Update formal requirements document
3. Begin API endpoint refactoring
4. Plan data seeding effort
5. Design frontend UI mockups based on new requirements
