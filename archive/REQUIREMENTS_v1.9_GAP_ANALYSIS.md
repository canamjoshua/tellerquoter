# Requirements v1.9 Gap Analysis
**Date:** December 8, 2025
**Current Implementation Status:** Phase 2 (Admin UI) - Partial
**Requirements Version Analyzed:** v1.9 (2258 lines, ~116KB)
**Previous Version:** v1.5 (1347 lines, ~62KB)

---

## Executive Summary

The requirements document has **nearly doubled in size** from v1.5 to v1.9 (from 1,347 to 2,258 lines), representing a **67% increase**. This analysis identifies critical architectural gaps between the current implementation and the updated requirements.

### Critical Finding: FUNDAMENTAL ARCHITECTURAL MISMATCH

**The current implementation is based on a SKU-SELECTION model, but v1.9 requires a PARAMETER-DRIVEN model.**

From Section 3.0 of Requirements v1.9:

> **CRITICAL DESIGN PRINCIPLE:** The quoting system is **parameter-driven**, not SKU-selection-driven. Users enter client requirements and configuration options; the system automatically determines which SKUs to include and calculates pricing. Users should NOT manually pick SKUs from a list.

**Current State:** The `EnhancedQuoteBuilder` component allows users to manually select SaaS products and SKUs from lists.

**Required State:** Users answer questions about client needs (number of departments, modules required, integrations needed), and the system automatically determines which SKUs to include.

### Impact Assessment

| Category | Status | Impact |
|----------|--------|--------|
| **Data Model** | ⚠️ Partially Complete | Medium - Missing SKU attributes, module configs |
| **Quote Builder UX** | ❌ Wrong Architecture | **CRITICAL** - Complete redesign required |
| **SKU Auto-Selection Logic** | ❌ Not Implemented | **CRITICAL** - Core business logic missing |
| **SaaS Configuration** | ⚠️ Partially Complete | Medium - Volume tiers exist, module logic missing |
| **Document Generation** | ❌ Not Started | High - Phase 5 work |
| **Pricing Versioning** | ✅ Implemented | Low - Already working |
| **Quote Versioning** | ✅ Implemented | Low - Already working with auto-create V1 |

---

## Part 1: Data Model Analysis

### 1.1 SKU Definitions - Missing Attributes

The current `SKUDefinition` model is missing several critical attributes required by v1.9:

| Attribute (v1.9 Required) | Current Model | Status | Impact |
|---------------------------|---------------|--------|--------|
| `SkuId` | `SKUCode` | ✅ | Exists (different name) |
| `Name` | `Name` | ✅ | Exists |
| `Category` | `Category` | ✅ | Exists |
| `FixedPrice` | `FixedPrice` | ✅ | Exists |
| `EstimatedHours` | ❌ Missing | **Required** | Needed for internal tracking |
| `TypicalDuration` | ❌ Missing | Optional | Nice to have for scheduling |
| `QuickbooksCategory` | ❌ Missing | **Required** | Finance integration |
| `SalesDescription` | `Description` | ⚠️ Exists | May need separate field |
| `ScopeText` | `ScopeDescription` | ✅ | Exists (v1.7 field) |
| `Deliverables` | `Deliverables` | ✅ | Exists (v1.7 field, JSONB array) |
| `AcceptanceCriteria` | `AcceptanceCriteria` | ✅ | Exists (v1.7 field) |
| `Dependencies` | ❌ Missing | **Required** | SKU dependency validation |
| `IsRepeatable` | ❌ Missing | **Required** | Allows multiple instances |
| `IsActive` | `IsActive` | ✅ | Exists |

**Database Migration Needed:**
```sql
ALTER TABLE "SKUDefinitions"
  ADD COLUMN "EstimatedHours" INTEGER,
  ADD COLUMN "TypicalDuration" INTEGER,
  ADD COLUMN "QuickbooksCategory" VARCHAR(100),
  ADD COLUMN "Dependencies" JSONB DEFAULT '[]',
  ADD COLUMN "IsRepeatable" BOOLEAN DEFAULT FALSE;
```

### 1.2 SaaS Products - Missing Module Configuration

The current `SaaSProduct` model handles tiered pricing but doesn't capture **module configuration logic**.

**Missing Concept:** Application modules (Check Recognition, Revenue Submission, Teller Online, etc.) need to be modeled as distinct entities with:
- Module enablement checkboxes
- Sub-parameters per module
- Automatic SKU determination based on module selections

**New Table Needed:**
```sql
CREATE TABLE "ApplicationModules" (
  "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "PricingVersionId" UUID NOT NULL REFERENCES "PricingVersions"("Id"),
  "ModuleCode" VARCHAR(50) NOT NULL, -- 'CHECK_RECOGNITION', 'REVENUE_SUBMISSION', etc.
  "ModuleName" VARCHAR(255) NOT NULL,
  "SaaSProductId" UUID REFERENCES "SaaSProducts"("Id"), -- Link to SaaS pricing
  "RequiredSKUs" JSONB DEFAULT '[]', -- Auto-add these SKUs when enabled
  "SubParameters" JSONB DEFAULT '{}', -- Configuration questions
  "IsActive" BOOLEAN DEFAULT TRUE,
  UNIQUE ("PricingVersionId", "ModuleCode")
);
```

### 1.3 Quote Version - Missing Configuration Fields

The `QuoteVersion` model needs additional fields to store user answers to configuration questions:

| Field Needed (v1.9) | Current Model | Status |
|---------------------|---------------|--------|
| Deal Type (New/Expansion) | ❌ Missing | Add to `ClientData` JSON |
| Teller Edition (Standard/Basic) | ❌ Missing | Add to `ClientData` JSON |
| User Type (Named/Concurrent) | ❌ Missing | Add to `ClientData` JSON |
| Number of Departments | ❌ Missing | **Critical** - Drives Org Setup SKU |
| Project Duration (months) | `ProjectDurationMonths` | ✅ Exists |
| Project Complexity | ❌ Missing | Add to `ClientData` JSON |
| 24/7 Support Required | ❌ Missing | Add to `ClientData` JSON |
| Module Selections | ❌ Missing | **Critical** - Need structured storage |

**Recommendation:** Expand `ClientData` JSONB to include:
```json
{
  "ClientName": "...",
  "ClientOrganization": "...",
  "DealType": "NEW_CLIENT" | "EXPANSION",
  "TellerEdition": "STANDARD" | "BASIC",
  "UserType": "NAMED" | "CONCURRENT",
  "NumberOfDepartments": 3,
  "ProjectComplexity": "STANDARD" | "ENTERPRISE",
  "Support24x7": false,
  "ModulesEnabled": {
    "CHECK_RECOGNITION": {
      "enabled": true,
      "monthlyScans": 5000,
      "ICLEnabled": true,
      "bankName": "First National Bank"
    },
    "REVENUE_SUBMISSION": {
      "enabled": true,
      "numberOfTemplates": 15,
      "workflowNeeded": true
    }
    // ... other modules
  }
}
```

---

## Part 2: Architectural Gaps

### 2.1 Quote Builder UX - Wrong Pattern

**Current Implementation (EnhancedQuoteBuilder.tsx):**
```
Step 1: Select pricing version
Step 2: Manually select SaaS products from list
Step 3: Manually select SKUs from list
Step 4: Enter discounts
Step 5: Review totals
```

**Required Implementation (v1.9 Section 3.1):**
```
Step 1: Organization & Project Parameters
  → Auto-determines: Org Setup SKU, PM months, Travel zone

Step 2: Application Modules (checkboxes)
  → Auto-determines: Module SKUs, SaaS line items

Step 3: Integrations (add/configure each)
  → Auto-determines: Integration SKUs (Mature vs Custom vs Credit)

Step 4: Online Forms (if applicable)
  → Auto-determines: Online Forms SKUs by tier + workflow add-ons

Step 5: Training (auto-calculated with adjustments)
  → Auto-determines: Training Suite + add-ons

Step 6: Travel Configuration
  → Determines: Travel costs

Step 7: Discounts & Adjustments
  → Applies: SaaS and/or Services discounts

Step 8: Review & Generate
  → Shows: Complete SKU list with prices, generates documents
```

**Impact:** The entire Quote Builder UI must be redesigned from scratch.

### 2.2 SKU Auto-Selection Logic - Not Implemented

The system needs business rules to automatically select SKUs based on user inputs:

#### 2.2.1 Organization Setup Auto-Selection
```
IF Number of Departments = 1:
    SELECT "Basic Teller Setup" ($23,920)
ELSE IF Number of Departments > 1:
    SELECT "Enterprise Setup - Medium" ($23,920)
    FOR each department > 1:
        ADD "Additional Department Setup" ($3,680)
```

**Current:** No such logic exists. Users manually select SKUs.
**Required:** Backend service layer that implements these rules.

#### 2.2.2 Project Management Auto-Selection
```
PM_MONTHS = Project Duration value

IF Project Complexity = "Standard":
    ADD PM_MONTHS × "PM Month - Standard" ($2,300/mo)
ELSE IF Project Complexity = "Enterprise":
    ADD PM_MONTHS × "PM Month - Enterprise" ($6,900/mo)
```

**Current:** PM SKUs not modeled as monthly repeatable.
**Required:** SKU quantity logic for monthly SKUs.

#### 2.2.3 Integration Auto-Selection
```
FOR each integration:
  IF integration in Mature Integrations List:
    IF integration type = "Credit Card":
      ADD "Credit Integration - Existing" ($9,200)
    ELSE:
      ADD "Integration - Configuration" ($7,360)
  ELSE:
    IF integration type = "Credit Card":
      ADD "Credit Integration - New" ($28,520)
    ELSE:
      ADD "Integration - Custom Development" ($28,520)
```

**Current:** Integrations table exists but no auto-selection logic.
**Required:** Integration type classification + selection rules.

#### 2.2.4 Module-Driven SKU Selection
```
IF CHECK_RECOGNITION module enabled:
  ADD "Check Recognition & ICL Setup" ($3,680)
  ADD SaaS line item for Check Scanning (volume-based pricing)

IF REVENUE_SUBMISSION module enabled:
  ADD "Revenue Submission Setup - Base" ($5,520)
  IF numberOfTemplates > 10:
    ADD ((numberOfTemplates - 10) / 10) × "Revenue Submission - Template Block" ($2,760)
  IF workflowNeeded:
    ADD "Workflow Submission Setup" (TBD pricing)
  ADD SaaS line item for Revenue Submission
```

**Current:** None of this logic exists.
**Required:** New service layer: `QuoteConfigurationService` or `SKUSelectionEngine`.

### 2.3 Missing Configuration Service Layer

**Architecture Needed:**

```
┌──────────────────────────────────────┐
│   QuoteBuilder UI (React)            │
│   - Collects parameters               │
│   - Shows results                     │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   FastAPI Endpoints                   │
│   POST /api/quote-configs/preview     │  ← **NEW**
│   POST /api/quote-versions/           │  (existing, enhanced)
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   QuoteConfigurationService           │  ← **NEW SERVICE**
│   - applyOrgSetupRules()              │
│   - applyPMRules()                    │
│   - applyModuleRules()                │
│   - applyIntegrationRules()           │
│   - applyTrainingRules()              │
│   - calculateTotals()                 │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   SKURepository                       │
│   SaaSProductRepository               │
│   ApplicationModuleRepository         │  ← **NEW**
│   IntegrationRepository               │
└──────────────────────────────────────┘
```

**Files to Create:**
1. `backend/app/services/quote_configuration_service.py` - Core business logic
2. `backend/app/services/sku_selection_engine.py` - Rule engine
3. `backend/app/models/application_module.py` - New model
4. `backend/app/api/quote_configuration.py` - New API endpoints
5. `frontend/src/components/ParameterDrivenQuoteBuilder.tsx` - New UI

---

## Part 3: Current Implementation Status

### 3.1 What We Have (Completed)

✅ **Database Foundation:**
- PricingVersions table with versioning support
- SKUDefinitions table (needs field additions)
- SaaSProducts table with tiered pricing
- TravelZones table
- MatureIntegrations table
- Referrers table
- TextSnippets table
- AuditLog table
- Quotes table
- QuoteVersions table with:
  - Auto-create Version 1 ✅ (fixed today)
  - Version history ✅
  - Pricing version linkage ✅
  - Discount configuration (JSONB) ✅
  - Travel configuration (JSONB) ✅

✅ **Admin UI (Partially Complete):**
- Pricing Version management (CRUD, comparison, set current)
- SKU management (CRUD, but missing v1.9 fields)
- SaaS Product management (CRUD)
- Travel Zone management (CRUD)
- Referrer management (CRUD)
- Text Snippet management (CRUD)
- Teller branding applied to all admin pages ✅ (completed today)

✅ **Quote Management:**
- Quote CRUD operations
- Quote versioning with auto-increment
- Quote version comparison UI (basic)
- Version 1 auto-creation ✅ (completed today)

✅ **API Layer:**
- FastAPI backend with proper structure
- PostgreSQL with Alembic migrations
- CORS configuration
- RESTful endpoints for all entities

### 3.2 What We're Missing (Gaps)

❌ **Core Business Logic:**
- SKU auto-selection rules (CRITICAL)
- Module configuration logic (CRITICAL)
- Integration type classification (CRITICAL)
- Parameter-driven quote building (CRITICAL)
- Training auto-calculation
- Hardware catalog management

❌ **Data Model Enhancements:**
- ApplicationModules table
- SKU dependency validation
- SKU repeatability flags
- QuickBooks category fields
- Estimated hours tracking
- Module sub-parameters storage

❌ **Quote Builder UI:**
- Parameter-driven wizard (must replace current)
- Module selection checkboxes
- Integration configuration flow
- Online Forms tier selection
- Training configuration
- Real-time SKU preview based on parameters
- Progress indicator for 8-step flow

❌ **Document Generation (Phase 5):**
- Order Form generation (python-docx)
- Implementation Plan / Exhibit C generation
- Internal Quote Detail generation
- Word template management
- PDF conversion (optional)

❌ **External Integrations (Phase 6):**
- Census API for population lookup
- GSA API for per diem rates
- Auto-suggest logic based on thresholds

---

## Part 4: Recommended Action Plan

### Phase 2A: Data Model Completion (1-2 days)

**Priority: HIGH** - Foundation for everything else

1. **Add Missing SKU Fields** (4 hours)
   ```sql
   ALTER TABLE "SKUDefinitions"
     ADD COLUMN "EstimatedHours" INTEGER,
     ADD COLUMN "QuickbooksCategory" VARCHAR(100),
     ADD COLUMN "Dependencies" JSONB DEFAULT '[]',
     ADD COLUMN "IsRepeatable" BOOLEAN DEFAULT FALSE;
   ```

2. **Create ApplicationModules Table** (2 hours)
   - Define schema
   - Create Alembic migration
   - Add model class
   - Add CRUD endpoints
   - Add Admin UI page

3. **Seed Initial Module Configurations** (2 hours)
   - Create seed data for modules from v1.9 Section 3.3
   - Link modules to SaaS products and SKUs
   - Define sub-parameter schemas

### Phase 2B: Business Logic Layer (3-5 days)

**Priority: CRITICAL** - Core functionality

1. **Create QuoteConfigurationService** (1 day)
   ```python
   class QuoteConfigurationService:
       def preview_configuration(self, params: QuoteParameters) -> QuotePreview:
           """Preview SKUs and pricing without saving."""

       def apply_org_setup_rules(self, params) -> List[SKUSelection]:
           """Determine Organization Setup SKUs."""

       def apply_pm_rules(self, params) -> List[SKUSelection]:
           """Determine PM SKUs (monthly repeatable)."""

       def apply_module_rules(self, params) -> List[SKUSelection]:
           """Determine module-related SKUs."""

       def apply_integration_rules(self, params) -> List[SKUSelection]:
           """Determine integration SKUs (Mature vs Custom)."""

       def calculate_totals(self, selections: List[SKUSelection]) -> QuoteTotals:
           """Calculate all totals with discounts."""
   ```

2. **Create SKUSelectionEngine** (1 day)
   - Rule engine for dependency validation
   - Repeatability handling
   - Conflict detection (e.g., mutually exclusive SKUs)

3. **Add Preview Endpoint** (0.5 day)
   ```python
   @router.post("/api/quote-configs/preview", response_model=QuotePreview)
   def preview_quote_configuration(params: QuoteParameters):
       """Preview SKUs and pricing before creating quote version."""
   ```

4. **Enhance QuoteVersion Creation** (0.5 day)
   - Accept `QuoteParameters` input
   - Run through configuration service
   - Auto-populate `SetupPackages` based on rules
   - Auto-populate `SaaSProducts` based on modules

5. **Testing** (1 day)
   - Unit tests for each rule set
   - Integration tests for full flow
   - Test cases from v1.9 examples

### Phase 2C: Parameter-Driven Quote Builder UI (5-7 days)

**Priority: CRITICAL** - User-facing functionality

1. **Design New Component Structure** (0.5 day)
   ```
   ParameterDrivenQuoteBuilder/
   ├── Step1_OrganizationAndProject.tsx
   ├── Step2_ApplicationModules.tsx
   ├── Step3_Integrations.tsx
   ├── Step4_OnlineForms.tsx
   ├── Step5_Training.tsx
   ├── Step6_TravelConfiguration.tsx
   ├── Step7_DiscountsAndAdjustments.tsx
   ├── Step8_ReviewAndGenerate.tsx
   ├── ParameterDrivenQuoteBuilder.tsx (container)
   └── QuotePreviewPanel.tsx (shows live SKU list)
   ```

2. **Implement Step 1: Org & Project** (1 day)
   - Input fields for all parameters
   - Validation
   - Real-time preview API call

3. **Implement Step 2: Application Modules** (1 day)
   - Fetch modules from API
   - Checkbox UI with sub-parameters
   - Conditional rendering based on module enablement
   - Real-time preview update

4. **Implement Step 3: Integrations** (1 day)
   - Add/remove integration entries
   - Mature Integrations dropdown
   - Custom integration text input
   - Integration type classification (Credit vs General)
   - Real-time preview update

5. **Implement Steps 4-7** (2 days)
   - Online Forms tier selection
   - Training configuration
   - Travel configuration
   - Discounts (already mostly implemented)

6. **Implement Step 8: Review** (0.5 day)
   - Final SKU list display
   - Pricing breakdown
   - Save/generate buttons

7. **Replace Old Quote Builder** (0.5 day)
   - Update routing
   - Remove `EnhancedQuoteBuilder.tsx` (or rename to legacy)
   - Update navigation

8. **Testing & Polish** (1 day)
   - Browser testing
   - Mobile responsive
   - Error handling
   - Loading states

### Phase 3: Document Generation (Later - Phase 5)

**Priority: HIGH (but after Phase 2 completion)**

- Defer until parameter-driven quote building is working
- Will require python-docx integration
- Word template design
- Placeholder substitution logic

---

## Part 5: SKU Count Update

**Requirements v1.9 Section 2.1:** 26 SKUs total (18 Confirmed ✓ + 8 Earmarked ⚠️)

**Change from v1.5:** Likely fewer than 26 previously (need to check v1.5 for exact count)

**Notable Changes:**
1. **Teller Online - Third-Party Redirect added** ($28,520, 124 hrs) - New SKU not in v1.5
2. **Teller Online Integration split** into Mature ($2,760) vs New ($6,440)
3. **PM "Complex" renamed** to "Enterprise"
4. **Hours specified** for all SKUs (enables effort tracking)

**Impact on Current System:**
- Need to seed 26 SKUs (currently unknown how many are seeded)
- Need to update SKU seed data to match v1.9 pricing
- Need to add `EstimatedHours` field to all SKUs

---

## Part 6: Critical Decisions Needed

### Decision 1: Incremental vs Clean Slate

**Option A: Incremental Enhancement**
- Keep existing `EnhancedQuoteBuilder` as "Manual Mode"
- Build new `ParameterDrivenQuoteBuilder` alongside it
- Allow users to choose mode (parameter-driven vs manual)
- Pros: Backward compatibility, gradual transition
- Cons: Two UIs to maintain, complexity

**Option B: Clean Slate**
- Replace `EnhancedQuoteBuilder` entirely
- Force parameter-driven flow for all new quotes
- Pros: Simpler codebase, aligned with v1.9
- Cons: More disruptive, requires migration plan

**Recommendation:** **Option B (Clean Slate)** - The requirements explicitly state users should NOT manually pick SKUs. The manual selection UI violates the core design principle.

### Decision 2: Quote Version Compatibility

**Question:** What happens to existing quote versions created with the old (manual) UI?

**Options:**
1. Leave them as-is, display them read-only
2. Attempt to reverse-engineer parameters from SKU selections (complex)
3. Mark them as "Legacy" and require re-creation for editing

**Recommendation:** **Option 1 (Read-Only)** - Preserve old quotes as-is, but new versions use parameter-driven flow.

### Decision 3: Module Configuration Storage

**Question:** Where do we store the module configuration answers?

**Options:**
1. In `QuoteVersion.ClientData` JSONB (expanding existing field)
2. In new table `QuoteVersionModuleConfigs` (normalized)
3. Hybrid: Parameters in `ClientData`, derived SKUs in existing `quote_version_setup_packages`

**Recommendation:** **Option 1 (ClientData JSONB)** - Simpler, flexible, already established pattern.

---

## Part 7: Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Fundamental architecture mismatch** | HIGH | Already happened | This analysis + action plan |
| **Requirements continue to evolve** | HIGH | HIGH | Implement flexible/configurable system |
| **SKU rules become too complex** | MEDIUM | MEDIUM | Use rule engine pattern, externalize rules |
| **Document generation takes longer than expected** | MEDIUM | HIGH | Defer to Phase 5 after core working |
| **Module configurations vary by client** | HIGH | MEDIUM | Make module configs part of pricing version |
| **Integration classification ambiguous** | MEDIUM | HIGH | Work with business users to refine rules |

---

## Part 8: Success Criteria

The implementation will be considered aligned with v1.9 when:

✅ Users can create a quote by answering configuration questions, not selecting SKUs
✅ System automatically determines which SKUs to include based on answers
✅ Organization Setup SKU is auto-selected based on number of departments
✅ PM SKUs are auto-calculated based on duration and complexity
✅ Module selections automatically add corresponding SKUs and SaaS products
✅ Integration type (Mature vs Custom) determines correct SKU price ($7,360 vs $28,520)
✅ Real-time preview shows SKU list and pricing as user configures
✅ All v1.9 SKU attributes are captured in database
✅ Quote versions store configuration parameters, not just final SKU selections
✅ Admin can configure module rules without code changes

---

## Part 9: Effort Estimate

| Phase | Tasks | Estimated Effort | Priority |
|-------|-------|------------------|----------|
| **Phase 2A: Data Model** | 3 tasks | 1-2 days | HIGH |
| **Phase 2B: Business Logic** | 5 tasks | 3-5 days | CRITICAL |
| **Phase 2C: New Quote Builder UI** | 8 tasks | 5-7 days | CRITICAL |
| **Phase 3: Document Generation** | Deferred | 7-10 days | HIGH (later) |
| **Testing & Refinement** | All phases | 2-3 days | HIGH |
| **TOTAL (Phases 2A-2C)** | - | **9-14 days** | - |

**Assumptions:**
- One developer working full-time
- Includes testing and bug fixes
- Does not include document generation (Phase 5)
- Does not include external API integrations (Phase 6)

---

## Part 10: Immediate Next Steps (Today)

1. ✅ **Read and analyze requirements v1.9** - DONE (this document)
2. **User approval** - Get user confirmation on:
   - Clean slate vs incremental approach (recommend clean slate)
   - Action plan priority (recommend Phase 2A → 2B → 2C)
   - Acceptance of 9-14 day effort estimate
3. **Begin Phase 2A** - Once approved:
   - Create database migration for missing SKU fields
   - Create ApplicationModules table
   - Start building seed data for modules

---

## Appendix A: Key Requirements Excerpts

### From Section 1.8: Configurability Principle
> **IMPORTANT:** All prices, amounts, formulas, tier thresholds, and calculation logic specified in this document are **examples only**. The system must allow Admin users to configure all of these values through the Admin UI without code changes.

**Impact:** Our rule engine must be data-driven, not hard-coded.

### From Section 3.0: Critical Design Principle
> **CRITICAL DESIGN PRINCIPLE:** The quoting system is **parameter-driven**, not SKU-selection-driven. Users enter client requirements and configuration options; the system automatically determines which SKUs to include and calculates pricing. Users should NOT manually pick SKUs from a list.

**Impact:** Complete UI redesign required.

### From Section 2.3: Integration Pricing Differential
> **⚠️ Critical:** The Configuration vs Custom Development price difference is **3.9x** ($7,360 vs $28,520). This makes the "Mature Integrations List" essential for accurate quoting.

**Impact:** Integration classification logic is financially critical.

---

## Appendix B: Database Schema Changes Summary

```sql
-- Phase 2A: Missing SKU Fields
ALTER TABLE "SKUDefinitions"
  ADD COLUMN "EstimatedHours" INTEGER,
  ADD COLUMN "TypicalDuration" INTEGER,
  ADD COLUMN "QuickbooksCategory" VARCHAR(100),
  ADD COLUMN "Dependencies" JSONB DEFAULT '[]',
  ADD COLUMN "IsRepeatable" BOOLEAN DEFAULT FALSE;

-- Phase 2A: Application Modules Table
CREATE TABLE "ApplicationModules" (
  "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "PricingVersionId" UUID NOT NULL REFERENCES "PricingVersions"("Id"),
  "ModuleCode" VARCHAR(50) NOT NULL,
  "ModuleName" VARCHAR(255) NOT NULL,
  "SaaSProductId" UUID REFERENCES "SaaSProducts"("Id"),
  "RequiredSKUs" JSONB DEFAULT '[]',
  "SubParameters" JSONB DEFAULT '{}',
  "IsActive" BOOLEAN DEFAULT TRUE,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("PricingVersionId", "ModuleCode")
);

-- No changes needed to QuoteVersions (ClientData JSONB is sufficient)
```

---

## Document Version History

- **v1.0** - December 8, 2025 - Initial analysis of requirements v1.9
