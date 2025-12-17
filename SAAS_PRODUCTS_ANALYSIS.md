# SaaS Products Analysis: Excel vs Implementation

**Date:** December 9, 2025
**Purpose:** Document the gap between the actual Excel-based quoting process and our current API implementation

---

## Executive Summary

After analyzing the **Pricing Investment Template V11.xlsx** (the actual tool salespeople use), there are significant discrepancies between the real-world quoting process and our current implementation.

### Critical Findings

1. **❌ Wrong SaaS Configuration Model**: Our API expects users to specify `bidirectional_interfaces` and `payment_import_interfaces` counts, but the Excel shows salespeople select **specific named integrations** (e.g., "Tyler Munis", "Credit Processor", "Financials A/R")

2. **❌ Module-Driven vs Product-Driven**: The Excel is heavily **module-oriented** (Check Recognition, Revenue Submission, ICL, Workflow, Online Portal), not simple product selection

3. **❌ Missing Volume Parameters**: Many modules require volume inputs (e.g., "Scans: 75000", "Submitters: 15", "Workflows: 2", "Transactions: 50000")

4. **❌ Online Forms Model Wrong**: The Excel treats online forms completely differently - it has counts for Simple/Medium/Complex forms with optional workflow addons, not the tier-based selection we implemented

5. **✅ Some Things Right**: The basic Teller Standard/Basic distinction exists, Additional Users logic is correct, Travel Zones concept is correct

---

## Part 1: The Parameters Sheet (What Salespeople Actually Fill Out)

### Section 1: Basic Client Information (Rows 1-10)

| Row | Field | Excel Column | Value Type | Notes |
|-----|-------|--------------|------------|-------|
| 3 | Name of Agency | C3 | Text | Client name |
| 4 | **Teller Standard or Basic** | B4 | **S or B** | **Core product selection** |
| 5 | Named or Concurrent Users | B5 | N or C | User licensing type |
| 6 | **Number of Additional Users** | B6 | **Number** | **Beyond base 5** |
| 7 | **Departments to Implement** | B7 | **Number** | **Drives org setup SKU** |
| 8 | **Length of Project** | B8 | **Months** | **Duration for PM** |
| 9 | **Travel Zone (1-4)** | B9 | **1-4** | **Travel cost tier** |
| 10 | 24/7 on call support | B10 | Y/N | Optional support add-on |

### Section 2: Application Modules (Rows 12-20)

This is the **CRITICAL** section our current implementation misses entirely.

| Row | Module Name | Active (B) | New (C) | Volume Type (D) | Volume (E) | Related Users (K) |
|-----|-------------|------------|---------|-----------------|------------|-------------------|
| 13 | **Check Recognition/Bulk Scanning** | Y/N | Y/N | Scans: | 75000 | ICL Users: 1 |
| 14 | Check Validation | Y/N | Y/N | - | - | - |
| 15 | **Image Cash Letter (ICL)** | Y/N | Y/N | - | - | - |
| 16 | **Revenue Submission** | Y/N | Y/N | Submitters: | 15 | Rev Sub Users: 1 |
| 17 | Workflow Submission | Y/N | Y/N | Workflows: | 2 | Workflow Users: 1 |
| 18 | **Online Customer Portal** | Y/N | Y/N | Transactions: | 50000 | Transaction Users: 6 |

**Key Observations:**
- Each module has an "Active" (already using) vs "New" (needs implementation) indicator
- Each module has specific **volume metrics** that likely drive pricing tiers
- Some modules have user counts associated (for SaaS pricing)
- These modules directly correspond to SaaS product codes in our database

### Section 3: Integrations - Bi-Directional (Rows 21-43)

This section shows **THE ACTUAL MODEL** for integrations (not generic counts!):

| Row | Integration Name | Active (B) | New (C) | Pay Imp (D) | Description (E-G) |
|-----|------------------|------------|---------|-------------|-------------------|
| 22 | Online - New | Y | N | - | ???? |
| 23 | Misc | Y | N | - | ???? |
| 24 | **Credit Processor** | Y | N | N | N |
| 25 | **Financials** | Y | N | N | N |
| 26 | **Financials** | Y | Y | N | Y |
| 27-40 | Financials (Test 3-12) | N | N | N | N |
| 45-46 | Bi-Directional Interface Count | Y | N | - | ???? |
| 47-59 | Payment Import (Test 3-13) | N | N | - | Import Test rows |

**Critical Insight:**
- Salespeople select **SPECIFIC integrations by name** (Credit Processor, Tyler Munis, Financials A/R)
- Each integration can be marked as "Active" (already exists) or "New" (needs build)
- Payment Import is a separate category with its own specific integrations
- The "Bi-Dir" count (K20: 2) and "Pay Imp" count are **calculated** from these selections, not directly input

### Section 4: Online Forms (Rows 64-76)

This is **COMPLETELY DIFFERENT** from what we implemented:

| Row | Form Type | Count (B) | With Workflow (C) |
|-----|-----------|-----------|-------------------|
| 67 | Simple | 0 | 0 |
| 68 | Medium | 0 | 0 |
| 70 | Complex | 0 | 0 |
| 71 | **Form Count:** | 0 | - |
| 72 | Simple w/ Workflow | 0 | 0 |
| 73 | Medium w/ Workflow | 0 | 0 |
| 75 | Complex w/ Workflow | - | 0 |
| 76 | **Form with Workflow Count:** | - | 0 |

**Critical Problems with Our Implementation:**
1. We treat each form as a single configuration request
2. Excel expects **counts** of forms at each complexity level
3. Excel has separate tracking for workflow addon per form
4. Salespeople can quote **multiple forms** in one quote, we only handle one

---

## Part 2: SaaS Costs Sheet Analysis

The "SaaS Costs" sheet shows the **OUTPUT** of the calculations:

```
Row 6:  SaaS                                      $2,950
Row 7:  Additional Named Users                    $60
Row 8:  (Calculated: 1 user × $60)                $60

Row 11: Check Recognition/Bulk Scanning           $1,030
Row 13: Image Cash Letter                         $669.50
Row 14: Revenue Submission                        $570
Row 16: Online Customer Portal                    $700

Row 20: Financials A/R - ????                     $285
Row 21: Bi-Directional - ????                     $285
Row 22: Bi-Directional - ????                     $285
```

**Key Insights:**
- Base Teller Standard: $2,950/month (matches our data)
- Additional Users: $60/month per user (matches our data)
- **Each application module has its own monthly SaaS cost**
- **Bi-directional interfaces: $285/month each** (matches our data)
- Payment imports would be $170/month (we have this)

---

## Part 3: Gaps in Current Implementation

### 3.1 SaaS Products API Endpoint

**Current Endpoint:**
```python
POST /api/quote-config/preview/saas-products
{
    "product_type": "standard",           # ✅ Correct
    "additional_users": 1,                # ✅ Correct
    "bidirectional_interfaces": 2,        # ❌ WRONG - should be named integrations
    "payment_import_interfaces": 0        # ❌ WRONG - should be named integrations
}
```

**What It Should Be (Based on Excel):**
```python
POST /api/quote-config/preview/saas-products
{
    "product_type": "standard",           # Teller Standard or Basic
    "additional_users": 1,                # Additional Named Users beyond 5

    # Application Modules (each with enable flag + volume parameters)
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
            "is_new": false,
            "num_submitters": 15
        },
        "online_portal": {
            "enabled": true,
            "is_new": true,
            "monthly_transactions": 50000
        }
    },

    # Named Integrations (not counts!)
    "integrations": {
        "bidirectional": [
            {
                "system_name": "Tyler Munis",
                "vendor": "Tyler Technologies",
                "is_new": true
            },
            {
                "system_name": "Credit Processor",
                "vendor": "Various",
                "is_new": false
            }
        ],
        "payment_import": [
            {
                "system_name": "Financials A/R",
                "vendor": "Various",
                "is_new": true
            }
        ]
    }
}
```

**Response Should Include:**
```python
{
    "base_product": {
        "product_code": "TELLER-STANDARD",
        "monthly_price": 2950.00,
        "included_users": 5
    },
    "additional_users": {
        "count": 1,
        "monthly_price_per_user": 60.00,
        "total_monthly_price": 60.00
    },
    "modules": [
        {
            "module_code": "CHECK_RECOGNITION",
            "module_name": "Check Recognition/Bulk Scanning",
            "monthly_price": 1030.00,
            "volume": 75000,
            "volume_unit": "scans"
        },
        {
            "module_code": "IMAGE_CASH_LETTER",
            "module_name": "Image Cash Letter",
            "monthly_price": 669.50
        },
        {
            "module_code": "REVENUE_SUBMISSION",
            "module_name": "Revenue Submission",
            "monthly_price": 570.00,
            "volume": 15,
            "volume_unit": "submitters"
        },
        {
            "module_code": "ONLINE_PORTAL",
            "module_name": "Online Customer Portal",
            "monthly_price": 700.00,
            "volume": 50000,
            "volume_unit": "transactions"
        }
    ],
    "integrations": [
        {
            "integration_type": "bidirectional",
            "system_name": "Tyler Munis",
            "monthly_price": 285.00,
            "is_new": true
        },
        {
            "integration_type": "bidirectional",
            "system_name": "Credit Processor",
            "monthly_price": 285.00,
            "is_new": false
        },
        {
            "integration_type": "payment_import",
            "system_name": "Financials A/R",
            "monthly_price": 170.00,
            "is_new": true
        }
    ],
    "total_monthly_recurring": 6249.50,
    "summary": "Teller Standard with 4 modules, 3 integrations, 1 additional user: $6,249.50/month"
}
```

### 3.2 Online Forms API Endpoint

**Current Endpoint (WRONG):**
```python
POST /api/quote-config/preview/online-form
{
    "form_name": "License Application",
    "num_fields": 10,
    "complex_calculations": false,
    "custom_code": false,
    "workflow_required": false
}
```

**What It Should Be:**
```python
POST /api/quote-config/preview/online-forms
{
    "forms": [
        {
            "form_name": "License Application",
            "complexity": "simple",       # simple, medium, complex
            "workflow_required": false
        },
        {
            "form_name": "Permit Renewal",
            "complexity": "medium",
            "workflow_required": true
        },
        {
            "form_name": "Business Registration",
            "complexity": "complex",
            "workflow_required": true
        }
    ]
}
```

**Or Simplified (Counts):**
```python
POST /api/quote-config/preview/online-forms
{
    "simple_forms": 2,
    "simple_forms_with_workflow": 1,
    "medium_forms": 3,
    "medium_forms_with_workflow": 1,
    "complex_forms": 1,
    "complex_forms_with_workflow": 2
}
```

---

## Part 4: Required Data Model Changes

### 4.1 ApplicationModule Table (Already Exists)

The `ApplicationModule` table was created in Phase 2A and is ready for this use case:

```sql
CREATE TABLE "ApplicationModules" (
  "Id" UUID PRIMARY KEY,
  "PricingVersionId" UUID NOT NULL REFERENCES "PricingVersions"("Id"),
  "ModuleCode" VARCHAR(50) NOT NULL,
  "ModuleName" VARCHAR(255) NOT NULL,
  "Description" TEXT,
  "SaaSProductCode" VARCHAR(50),  -- Link to monthly SaaS pricing
  "SelectionRules" JSONB DEFAULT '{}',  -- Rules for when to include
  "VolumeParameters" JSONB DEFAULT '{}',  -- Define volume inputs needed
  "IsActive" BOOLEAN DEFAULT TRUE,
  "SortOrder" INTEGER DEFAULT 0
);
```

**Example Data Needed:**
```sql
INSERT INTO "ApplicationModules" VALUES
(
  gen_random_uuid(),
  '<pricing_version_id>',
  'CHECK_RECOGNITION',
  'Check Recognition/Bulk Scanning',
  'MICR recognition and bulk check scanning',
  'CHECK-RECOGNITION',  -- Links to SaaSProduct
  '{
    "volumeParameter": {
      "name": "scan_volume",
      "label": "Monthly Scan Volume",
      "type": "integer",
      "required": true
    },
    "setupSKUs": [
      {
        "condition": "always",
        "SKUCode": "CHECK-ICL-SETUP",
        "quantity": 1
      }
    ]
  }',
  '{}',
  true,
  10
);
```

### 4.2 MatureIntegration Table (Already Exists)

Good news: This table already exists and is being used! We just need to populate it with real integration data.

```sql
-- Already exists, just needs data
SELECT * FROM "MatureIntegrations";
```

**Example Data Needed:**
```sql
INSERT INTO "MatureIntegrations"
  (IntegrationCode, SystemName, Vendor, Comments, IsActive)
VALUES
  ('TYLER-MUNIS', 'Tyler Munis', 'Tyler Technologies', 'Financial management system', true),
  ('TYLER-INCODE', 'Tyler Incode', 'Tyler Technologies', 'Public sector ERP', true),
  ('SPRINGBROOK', 'Springbrook', 'Springbrook Software', 'Government financial software', true),
  ('LOGOS', 'Logos', 'Innoprise', 'Utility billing', true),
  ('EDEN', 'Eden', 'Central Square', 'Public sector software', true),
  ('CSDC-INCODE', 'CSDC Incode', 'CSDC', 'Court system', true),
  ('CREDIT-PROCESSOR', 'Credit Card Processor', 'Various', 'Generic credit card processor interface', true);
```

### 4.3 QuoteVersion Configuration Fields

The `QuoteVersion` table needs to store the user's answers. We already have a `Configuration` JSONB field for this:

```sql
-- Already exists in QuoteVersion
"Configuration" JSONB DEFAULT '{}'
```

**Example Configuration Data:**
```json
{
  "base_product": "standard",
  "additional_users": 1,
  "num_departments": 2,
  "project_duration_months": 9,
  "travel_zone": 2,
  "modules": {
    "check_recognition": {
      "enabled": true,
      "is_new": true,
      "scan_volume": 75000
    },
    "revenue_submission": {
      "enabled": true,
      "is_new": false,
      "num_submitters": 15
    }
  },
  "integrations": {
    "bidirectional": [
      {"system_name": "Tyler Munis", "is_new": true}
    ]
  },
  "online_forms": {
    "simple": 0,
    "medium": 0,
    "complex": 0
  }
}
```

---

## Part 5: Recommended Changes to Requirements Document

### Section 2.2: SaaS Product Configuration

**Current Text (Lines ~150-180):**
> Users can select:
> - Base Teller product (Standard or Basic)
> - Additional Named Users (beyond 5 included)
> - Number of Bi-Directional Interfaces
> - Number of Payment Import Interfaces

**Proposed Revision:**
```markdown
### 2.2 SaaS Product Configuration (Recurring Monthly Costs)

#### 2.2.1 Base Product Selection
Users select between:
- **Teller Standard**: $2,950/month (5 users, multi-department)
- **Teller Basic**: $995/month (5 users, single department)

Both include 5 Named Users by default.

#### 2.2.2 Additional Named Users
- **Cost**: $60/month per user beyond the base 5
- **Input**: Number of additional users needed
- **Calculation**: additional_users × $60

#### 2.2.3 Application Modules
Each module has monthly SaaS pricing and optional one-time setup costs.

**Module Configuration Interface:**
For each module, users specify:
1. **Enabled**: Is this module needed? (Y/N)
2. **Is New**: Does client need implementation? (Y/N) - drives setup SKUs
3. **Volume Parameters**: Module-specific usage metrics

**Available Modules:**

| Module Code | Module Name | Monthly SaaS Cost | Volume Parameter | Setup SKU |
|-------------|-------------|-------------------|------------------|-----------|
| CHECK_RECOGNITION | Check Recognition/Bulk Scanning | $1,030 | Monthly scan volume | CHECK-ICL-SETUP |
| IMAGE_CASH_LETTER | Image Cash Letter | $669.50 | - | CHECK-ICL-SETUP |
| REVENUE_SUBMISSION | Revenue Submission | $570 | Number of submitters | REVENUE-SUBMISSION-SETUP |
| WORKFLOW | Workflow Submission | $475 | Number of workflows | WORKFLOW-SETUP |
| ONLINE_PORTAL | Online Customer Portal | $700 | Monthly transactions | ONLINE-PORTAL-SETUP |

**Auto-Selection Rules:**
- If CHECK_RECOGNITION is enabled → automatically include CHECK-ICL-SETUP ($12,880)
- If REVENUE_SUBMISSION is enabled → automatically include REVENUE-SUBMISSION-SETUP
- Volume parameters may affect setup pricing (tiered pricing rules apply)

#### 2.2.4 Integration Configuration

**CRITICAL**: Integrations are **named and specific**, not generic counts.

**Bi-Directional Interfaces** ($285/month each):
- Users select from list of mature integrations (Tyler Munis, Springbrook, etc.)
- Or specify "Custom Integration" if not in list
- Each integration marked as:
  - **Existing**: Client already has this interface (no setup cost)
  - **New**: Needs implementation (includes setup SKU)

**Mature Integrations List:**
- Tyler Munis (Tyler Technologies)
- Tyler Incode (Tyler Technologies)
- Springbrook (Springbrook Software)
- Logos (Innoprise)
- Eden (Central Square)
- CSDC Incode (CSDC)
- [Others from MatureIntegrations table]

**Payment Import Interfaces** ($170/month each):
- Similar selection model as bi-directional
- Typically simpler integrations (one-way data import)

**Setup Cost Auto-Selection Rules:**
- If integration is in MatureIntegrations table → INTEGRATION-MATURE ($2,000)
- If integration is "Custom" or not in list → INTEGRATION-CUSTOM ($8,000)
- If integration already exists (not new) → $0 setup cost

**Example Configuration:**
```
Bi-Directional Interfaces:
  ✓ Tyler Munis (New) → $285/month + $2,000 setup
  ✓ Credit Processor (Existing) → $285/month + $0 setup

Payment Import Interfaces:
  ✓ Financials A/R (New) → $170/month + $2,000 setup

Total Monthly: $740
Total Setup: $4,000
```
```

### Section 2.3.4: Online Forms

**Current Text:**
> System determines tier based on:
> - Number of fields
> - Complex calculations required
> - Custom code needed
> - Workflow addon

**Proposed Revision:**
```markdown
### 2.3.4 Online Forms Configuration

**User Input Model**: Salespeople quote **multiple forms** at various complexity levels.

#### Complexity Tiers

| Tier | Criteria | Setup Cost | Workflow Addon |
|------|----------|------------|----------------|
| **Simple** | <15 fields, no complex logic, no custom code | $4,600 | +$5,520 |
| **Medium** | 15-30 fields OR complex calculations | $9,200 | +$5,520 |
| **Complex** | >30 fields OR requires custom code | $16,560 | +$5,520 |

#### Input Interface (Option A - Detailed)

For each form, specify:
- Form name/description
- Complexity level (Simple/Medium/Complex)
- Workflow required (Y/N)

**Example:**
```
Forms:
  1. License Application - Simple, No Workflow → $4,600
  2. Permit Renewal - Medium, With Workflow → $14,720 ($9,200 + $5,520)
  3. Business Registration - Complex, With Workflow → $22,080 ($16,560 + $5,520)

Total: $41,400
```

#### Input Interface (Option B - Counts)

Specify counts at each level:
- Simple forms: [count]
- Simple forms with workflow: [count]
- Medium forms: [count]
- Medium forms with workflow: [count]
- Complex forms: [count]
- Complex forms with workflow: [count]

**Example:**
```
Simple forms: 2 → $9,200
Medium with workflow: 1 → $14,720
Complex with workflow: 1 → $22,080

Total: $46,000 for 4 forms
```

**Recommendation**: Implement Option B (counts) initially for MVP, add Option A (detailed list) in Phase 2.
```

---

## Part 6: Recommended Action Plan

### Immediate Changes (This Week)

1. **✅ Keep**: Organization Setup, Project Management, Training endpoints (these are correct)

2. **❌ Deprecate Current SaaS Endpoint**: The current `/preview/saas-products` endpoint is fundamentally wrong

3. **🔨 Rebuild SaaS Configuration**:
   - Create `/preview/saas-configuration` endpoint
   - Accept module-based configuration
   - Accept named integrations (not counts)
   - Link to ApplicationModule table
   - Link to MatureIntegration table

4. **🔨 Fix Online Forms**:
   - Change from single-form to multi-form model
   - Accept counts at each complexity level
   - Keep workflow addon logic

5. **📝 Update Requirements Document**:
   - Section 2.2: Complete rewrite of SaaS configuration
   - Section 2.2.4: Add integration configuration details
   - Section 2.3.4: Update online forms to count-based model

### Data Seeding Required

1. **Populate ApplicationModules table**:
   - CHECK_RECOGNITION
   - IMAGE_CASH_LETTER
   - REVENUE_SUBMISSION
   - WORKFLOW
   - ONLINE_PORTAL
   - [Others from Excel]

2. **Populate MatureIntegrations table**:
   - Tyler Munis
   - Tyler Incode
   - Springbrook
   - Logos
   - Eden
   - CSDC Incode
   - [Others from Excel]

3. **Link SaaS Products to Modules**:
   - Update SaaSProduct.ProductCode to match module codes
   - Ensure pricing matches Excel ($1,030, $669.50, $570, etc.)

### Testing Priority

1. Test that module enablement drives correct setup SKU selection
2. Test that named integrations correctly map to MATURE vs CUSTOM SKUs
3. Test that online forms count-based model produces correct totals
4. Test that volume parameters are captured and could drive tiered pricing

---

## Appendix: Excel Sheet Structure Reference

### Parameters Sheet Key Sections

| Section | Rows | Purpose |
|---------|------|---------|
| Header | 1 | Version tracking (V11) |
| Client Info | 3-10 | Basic project parameters |
| Modules | 12-20 | Application module selection |
| Bi-Directional Integrations | 21-43 | Named integration selection |
| Payment Import | 44-63 | Payment import interfaces |
| Online Forms | 64-76 | Form complexity counts |
| Discount | 78+ | Discount parameters |

### Calculated Outputs

The Excel calculates and displays on other sheets:
- **SaaS Costs** (Sheet 4): Monthly recurring breakdown
- **Service Costs** (Sheet 5): One-time setup costs
- **Travel Costs** (Sheet 7): Travel expense calculations
- **Summation Costs** (Sheet 3): Grand totals and 10-year investment

---

## Conclusion

The current SaaS products implementation is **fundamentally misaligned** with how salespeople actually configure quotes. The Excel workbook reveals a much more sophisticated, module-driven model that requires:

1. **Module-based configuration** (not just base product selection)
2. **Named integration selection** (not generic counts)
3. **Multi-form quoting** (not single-form at a time)
4. **Volume parameter capture** (for future tiered pricing)

**Priority**: Fix the SaaS configuration endpoint and data model before building the frontend quote builder UI.
