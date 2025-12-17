# Configuration-Driven SaaS Model Design

**Date:** December 9, 2025
**Purpose:** Design a flexible, rule-based architecture where administrators can configure SaaS products, parameters, and pricing logic without code changes

---

## Design Principles

1. **Business Logic as Data**: All pricing rules, parameters, and calculations stored in database
2. **No Hardcoded Rules**: Application reads configuration and executes rules dynamically
3. **Admin-Configurable**: GUI for non-technical users to modify products, parameters, and rules
4. **Versioned**: All configuration tied to PricingVersion for historical accuracy
5. **Extensible**: New parameters and products can be added without code deployment

---

## Part 1: Data Model

### 1.1 SaaSProduct Table (Already Exists - Needs Enhancement)

Current table handles tiered pricing. We'll enhance it with configuration fields:

```sql
-- Already exists, but let's add new columns
ALTER TABLE "SaaSProducts"
  ADD COLUMN "ProductType" VARCHAR(50) DEFAULT 'module',  -- 'base', 'module', 'addon', 'interface'
  ADD COLUMN "RequiredParameters" JSONB DEFAULT '[]',     -- List of parameter definitions
  ADD COLUMN "SelectionRules" JSONB DEFAULT '{}',         -- When to include this product
  ADD COLUMN "PricingFormula" JSONB DEFAULT '{}',         -- How to calculate price
  ADD COLUMN "RelatedSetupSKUs" JSONB DEFAULT '[]',       -- Setup SKUs to include
  ADD COLUMN "Dependencies" JSONB DEFAULT '[]';           -- Other products this depends on
```

**Column Purposes:**

- **ProductType**: Categorizes the product
  - `base`: Teller Standard or Basic (mutually exclusive base products)
  - `module`: Application modules (Check Recognition, Revenue Submission, etc.)
  - `addon`: Additional users, support packages
  - `interface`: Bi-directional or Payment Import interfaces

- **RequiredParameters**: Defines what inputs are needed for this product
  ```json
  [
    {
      "name": "scan_volume",
      "label": "Monthly Scan Volume",
      "type": "integer",
      "required": false,
      "default": 0,
      "validation": {
        "min": 0,
        "max": 10000000
      },
      "helpText": "Estimated monthly check scans"
    }
  ]
  ```

- **SelectionRules**: Conditions for when this product applies
  ```json
  {
    "autoInclude": false,
    "conditions": [
      {
        "type": "parameter_equals",
        "parameter": "modules.check_recognition.enabled",
        "value": true
      }
    ],
    "operator": "AND"
  }
  ```

- **PricingFormula**: How to calculate the monthly cost
  ```json
  {
    "type": "tiered",
    "basePrice": 1030.00,
    "tiers": [
      {
        "minVolume": 0,
        "maxVolume": 50000,
        "price": 1030.00
      },
      {
        "minVolume": 50001,
        "maxVolume": 200000,
        "price": 1500.00
      },
      {
        "minVolume": 200001,
        "maxVolume": null,
        "price": 2000.00
      }
    ],
    "volumeParameter": "scan_volume"
  }
  ```

  Or for simple fixed pricing:
  ```json
  {
    "type": "fixed",
    "price": 2950.00
  }
  ```

  Or for quantity-based:
  ```json
  {
    "type": "quantity_based",
    "pricePerUnit": 60.00,
    "quantityParameter": "additional_users"
  }
  ```

- **RelatedSetupSKUs**: Setup SKUs to auto-include when product is selected
  ```json
  [
    {
      "condition": {
        "type": "parameter_equals",
        "parameter": "is_new",
        "value": true
      },
      "skuCode": "CHECK-ICL-SETUP",
      "quantity": 1,
      "reason": "Initial setup for Check Recognition module"
    }
  ]
  ```

### 1.2 ApplicationModule Table (Already Exists - Perfect!)

This table already exists with the right structure:

```sql
CREATE TABLE "ApplicationModules" (
  "Id" UUID PRIMARY KEY,
  "PricingVersionId" UUID NOT NULL REFERENCES "PricingVersions"("Id"),
  "ModuleCode" VARCHAR(50) NOT NULL,
  "ModuleName" VARCHAR(255) NOT NULL,
  "Description" TEXT,
  "SaaSProductCode" VARCHAR(50),           -- Link to SaaSProduct.ProductCode
  "SelectionRules" JSONB DEFAULT '{}',     -- ✅ Already has this!
  "IsActive" BOOLEAN DEFAULT TRUE,
  "SortOrder" INTEGER DEFAULT 0,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW()
);
```

**Usage:**
- Each module links to a SaaSProduct via `SaaSProductCode`
- Module's `SelectionRules` can define setup SKU auto-selection
- Modules can define required parameters in their SelectionRules

**Example Module Configuration:**
```sql
INSERT INTO "ApplicationModules" VALUES (
  gen_random_uuid(),
  '<pricing_version_id>',
  'CHECK_RECOGNITION',
  'Check Recognition/Bulk Scanning',
  'MICR recognition and bulk check scanning capabilities',
  'CHECK-RECOGNITION-SAAS',
  '{
    "parameters": [
      {
        "name": "scan_volume",
        "label": "Monthly Scan Volume",
        "type": "integer",
        "required": false,
        "helpText": "Estimated monthly check scans"
      },
      {
        "name": "is_new",
        "label": "New Implementation",
        "type": "boolean",
        "default": false
      }
    ],
    "setupSKUs": [
      {
        "condition": {
          "type": "parameter_equals",
          "parameter": "is_new",
          "value": true
        },
        "skuCode": "CHECK-ICL-SETUP",
        "quantity": 1,
        "reason": "Initial setup and configuration for Check Recognition"
      }
    ]
  }',
  true,
  10,
  NOW(),
  NOW()
);
```

### 1.3 IntegrationType Table (NEW)

Define types of integrations with their pricing and rules:

```sql
CREATE TABLE "IntegrationTypes" (
  "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "PricingVersionId" UUID NOT NULL REFERENCES "PricingVersions"("Id"),
  "TypeCode" VARCHAR(50) NOT NULL,                    -- 'BIDIRECTIONAL', 'PAYMENT_IMPORT'
  "TypeName" VARCHAR(255) NOT NULL,                   -- 'Bi-Directional Interface'
  "Description" TEXT,
  "MonthlyCost" DECIMAL(10,2) NOT NULL,               -- $285 or $170
  "MatureSetupSKU" VARCHAR(50),                       -- 'INTEGRATION-MATURE'
  "CustomSetupSKU" VARCHAR(50),                       -- 'INTEGRATION-CUSTOM'
  "RequiredParameters" JSONB DEFAULT '[]',            -- What inputs needed
  "IsActive" BOOLEAN DEFAULT TRUE,
  "SortOrder" INTEGER DEFAULT 0,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("PricingVersionId", "TypeCode")
);
```

**Example Data:**
```sql
INSERT INTO "IntegrationTypes" VALUES
(
  gen_random_uuid(),
  '<pricing_version_id>',
  'BIDIRECTIONAL',
  'Bi-Directional Interface',
  'Two-way data synchronization with external system',
  285.00,
  'INTEGRATION-MATURE',
  'INTEGRATION-CUSTOM',
  '[
    {
      "name": "system_name",
      "label": "System Name",
      "type": "string",
      "required": true
    },
    {
      "name": "vendor",
      "label": "Vendor",
      "type": "string",
      "required": false
    },
    {
      "name": "is_new",
      "label": "New Integration",
      "type": "boolean",
      "default": true,
      "helpText": "Check if this integration needs to be built"
    }
  ]',
  true,
  1,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '<pricing_version_id>',
  'PAYMENT_IMPORT',
  'Payment Import Interface',
  'One-way import of payment data from external system',
  170.00,
  'INTEGRATION-MATURE',
  'INTEGRATION-CUSTOM',
  '[
    {
      "name": "system_name",
      "label": "System Name",
      "type": "string",
      "required": true
    },
    {
      "name": "vendor",
      "label": "Vendor",
      "type": "string",
      "required": false
    },
    {
      "name": "is_new",
      "label": "New Integration",
      "type": "boolean",
      "default": true
    }
  ]',
  true,
  2,
  NOW(),
  NOW()
);
```

### 1.4 MatureIntegration Table (Already Exists - Perfect!)

```sql
-- Already exists, no changes needed
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

### 1.5 OnlineFormTier Table (NEW)

Define online form complexity tiers and pricing:

```sql
CREATE TABLE "OnlineFormTiers" (
  "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "PricingVersionId" UUID NOT NULL REFERENCES "PricingVersions"("Id"),
  "TierCode" VARCHAR(50) NOT NULL,                    -- 'TIER1', 'TIER2', 'TIER3'
  "TierName" VARCHAR(255) NOT NULL,                   -- 'Simple', 'Medium', 'Complex'
  "Description" TEXT,
  "SetupSKU" VARCHAR(50) NOT NULL,                    -- 'ONLINE-FORM-TIER1'
  "SetupCost" DECIMAL(10,2) NOT NULL,                 -- $4600, $9200, $16560
  "WorkflowAddonSKU" VARCHAR(50),                     -- 'ONLINE-FORM-WORKFLOW-ADDON'
  "WorkflowAddonCost" DECIMAL(10,2),                  -- $5520
  "SelectionCriteria" JSONB DEFAULT '{}',             -- Rules for auto-tier-selection
  "IsActive" BOOLEAN DEFAULT TRUE,
  "SortOrder" INTEGER DEFAULT 0,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("PricingVersionId", "TierCode")
);
```

**Example Data:**
```sql
INSERT INTO "OnlineFormTiers" VALUES
(
  gen_random_uuid(),
  '<pricing_version_id>',
  'TIER1',
  'Simple',
  'Basic online form with minimal complexity',
  'ONLINE-FORM-TIER1',
  4600.00,
  'ONLINE-FORM-WORKFLOW-ADDON',
  5520.00,
  '{
    "autoSelect": {
      "conditions": [
        {
          "parameter": "num_fields",
          "operator": "less_than",
          "value": 15
        },
        {
          "parameter": "complex_calculations",
          "operator": "equals",
          "value": false
        },
        {
          "parameter": "custom_code",
          "operator": "equals",
          "value": false
        }
      ],
      "operator": "AND"
    }
  }',
  true,
  1,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '<pricing_version_id>',
  'TIER2',
  'Medium',
  'Moderate complexity form with some advanced features',
  'ONLINE-FORM-TIER2',
  9200.00,
  'ONLINE-FORM-WORKFLOW-ADDON',
  5520.00,
  '{
    "autoSelect": {
      "conditions": [
        {
          "parameter": "num_fields",
          "operator": "between",
          "min": 15,
          "max": 30
        },
        {
          "parameter": "custom_code",
          "operator": "equals",
          "value": false
        }
      ],
      "operator": "OR",
      "alternateConditions": [
        {
          "parameter": "complex_calculations",
          "operator": "equals",
          "value": true
        }
      ]
    }
  }',
  true,
  2,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '<pricing_version_id>',
  'TIER3',
  'Complex',
  'Complex form with custom code or extensive fields',
  'ONLINE-FORM-TIER3',
  16560.00,
  'ONLINE-FORM-WORKFLOW-ADDON',
  5520.00,
  '{
    "autoSelect": {
      "conditions": [
        {
          "parameter": "num_fields",
          "operator": "greater_than",
          "value": 30
        }
      ],
      "operator": "OR",
      "alternateConditions": [
        {
          "parameter": "custom_code",
          "operator": "equals",
          "value": true
        }
      ]
    }
  }',
  true,
  3,
  NOW(),
  NOW()
);
```

---

## Part 2: Configuration Structure

### 2.1 Parameter Definition Schema

All parameters are defined using a standard JSON schema:

```typescript
interface ParameterDefinition {
  name: string;                    // Parameter key
  label: string;                   // Display label
  type: 'string' | 'integer' | 'decimal' | 'boolean' | 'array' | 'object';
  required: boolean;               // Is this parameter required?
  default?: any;                   // Default value
  validation?: {                   // Validation rules
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  helpText?: string;               // User guidance
  dependsOn?: string;              // Another parameter this depends on
  showIf?: Condition;              // Conditional display logic
}
```

### 2.2 Condition Schema

Conditions are used throughout for rules and logic:

```typescript
interface Condition {
  type: 'parameter_equals' | 'parameter_not_equals' | 'parameter_in' |
        'parameter_greater_than' | 'parameter_less_than' | 'parameter_between' |
        'parameter_exists' | 'always' | 'never' | 'expression';
  parameter?: string;              // Dot-notation path: "modules.check_recognition.enabled"
  operator?: 'AND' | 'OR';         // For multiple conditions
  value?: any;
  min?: number;
  max?: number;
  expression?: string;             // For complex logic (evaluated safely)
  conditions?: Condition[];        // Nested conditions
}
```

### 2.3 Pricing Formula Schema

```typescript
interface PricingFormula {
  type: 'fixed' | 'quantity_based' | 'tiered' | 'calculated' | 'lookup';

  // For fixed pricing
  price?: number;

  // For quantity-based pricing
  pricePerUnit?: number;
  quantityParameter?: string;

  // For tiered pricing
  tiers?: Array<{
    minVolume: number;
    maxVolume: number | null;
    price: number;
  }>;
  volumeParameter?: string;

  // For calculated pricing
  formula?: string;                // e.g., "base_price * duration_months"
  variables?: Record<string, any>;

  // For lookup pricing
  lookupTable?: Array<{
    condition: Condition;
    price: number;
  }>;
}
```

### 2.4 SKU Selection Rule Schema

```typescript
interface SKUSelectionRule {
  condition: Condition;            // When to include this SKU
  skuCode: string;                 // Which SKU to include
  quantity?: number | string;      // Fixed number or parameter reference
  reason?: string;                 // Explanation for selection
  metadata?: Record<string, any>;  // Additional context
}
```

---

## Part 3: Example Configurations

### 3.1 Base Teller Product Configuration

**Teller Standard SaaS Product:**
```json
{
  "ProductCode": "TELLER-STANDARD",
  "Name": "Teller Standard",
  "Category": "Core",
  "ProductType": "base",
  "PricingModel": "Fixed",
  "Tier1Price": 2950.00,
  "RequiredParameters": [
    {
      "name": "selected",
      "label": "Select Teller Standard",
      "type": "boolean",
      "required": false,
      "default": false
    }
  ],
  "SelectionRules": {
    "autoInclude": false,
    "mutuallyExclusiveWith": ["TELLER-BASIC"],
    "conditions": [
      {
        "type": "parameter_equals",
        "parameter": "base_product",
        "value": "standard"
      }
    ]
  },
  "PricingFormula": {
    "type": "fixed",
    "price": 2950.00
  },
  "RelatedSetupSKUs": [
    {
      "condition": {
        "type": "always"
      },
      "skuCode": "TELLER-IMPLEMENTATION",
      "quantity": 1,
      "reason": "Base Teller implementation and setup"
    }
  ],
  "Dependencies": []
}
```

### 3.2 Application Module Configuration

**Check Recognition Module:**
```json
{
  "ModuleCode": "CHECK_RECOGNITION",
  "ModuleName": "Check Recognition/Bulk Scanning",
  "Description": "MICR recognition and bulk check scanning",
  "SaaSProductCode": "CHECK-RECOGNITION-SAAS",
  "SelectionRules": {
    "parameters": [
      {
        "name": "enabled",
        "label": "Enable Check Recognition",
        "type": "boolean",
        "required": false,
        "default": false
      },
      {
        "name": "is_new",
        "label": "New Implementation",
        "type": "boolean",
        "required": false,
        "default": true,
        "showIf": {
          "type": "parameter_equals",
          "parameter": "enabled",
          "value": true
        }
      },
      {
        "name": "scan_volume",
        "label": "Monthly Scan Volume",
        "type": "integer",
        "required": false,
        "default": 0,
        "validation": {
          "min": 0,
          "max": 10000000
        },
        "helpText": "Estimated monthly check scans",
        "showIf": {
          "type": "parameter_equals",
          "parameter": "enabled",
          "value": true
        }
      }
    ],
    "setupSKUs": [
      {
        "condition": {
          "type": "parameter_equals",
          "parameter": "is_new",
          "value": true
        },
        "skuCode": "CHECK-ICL-SETUP",
        "quantity": 1,
        "reason": "Initial setup and configuration for Check Recognition module"
      }
    ]
  },
  "IsActive": true,
  "SortOrder": 10
}
```

**Linked SaaS Product:**
```json
{
  "ProductCode": "CHECK-RECOGNITION-SAAS",
  "Name": "Check Recognition SaaS",
  "Category": "Module",
  "ProductType": "module",
  "RequiredParameters": [],
  "SelectionRules": {
    "autoInclude": false,
    "conditions": [
      {
        "type": "parameter_equals",
        "parameter": "modules.check_recognition.enabled",
        "value": true
      }
    ]
  },
  "PricingFormula": {
    "type": "tiered",
    "volumeParameter": "modules.check_recognition.scan_volume",
    "tiers": [
      {
        "minVolume": 0,
        "maxVolume": 50000,
        "price": 1030.00
      },
      {
        "minVolume": 50001,
        "maxVolume": 200000,
        "price": 1500.00
      },
      {
        "minVolume": 200001,
        "maxVolume": null,
        "price": 2000.00
      }
    ]
  },
  "RelatedSetupSKUs": [],
  "Dependencies": [],
  "IsActive": true
}
```

### 3.3 Additional Users Configuration

```json
{
  "ProductCode": "ADDITIONAL-USER",
  "Name": "Additional Named User",
  "Category": "Add-on",
  "ProductType": "addon",
  "RequiredParameters": [
    {
      "name": "additional_users",
      "label": "Additional Users (beyond 5 included)",
      "type": "integer",
      "required": false,
      "default": 0,
      "validation": {
        "min": 0,
        "max": 999
      },
      "helpText": "Number of additional named users needed"
    }
  ],
  "SelectionRules": {
    "autoInclude": false,
    "conditions": [
      {
        "type": "parameter_greater_than",
        "parameter": "additional_users",
        "value": 0
      }
    ]
  },
  "PricingFormula": {
    "type": "quantity_based",
    "pricePerUnit": 60.00,
    "quantityParameter": "additional_users"
  },
  "RelatedSetupSKUs": [],
  "Dependencies": [],
  "IsActive": true
}
```

### 3.4 Integration Configuration

**Integration Type Configuration:**
```json
{
  "TypeCode": "BIDIRECTIONAL",
  "TypeName": "Bi-Directional Interface",
  "Description": "Two-way data synchronization",
  "MonthlyCost": 285.00,
  "MatureSetupSKU": "INTEGRATION-MATURE",
  "CustomSetupSKU": "INTEGRATION-CUSTOM",
  "RequiredParameters": [
    {
      "name": "integrations",
      "label": "Bi-Directional Integrations",
      "type": "array",
      "required": false,
      "items": {
        "type": "object",
        "properties": {
          "system_name": {
            "type": "string",
            "label": "System Name",
            "required": true
          },
          "vendor": {
            "type": "string",
            "label": "Vendor",
            "required": false
          },
          "is_new": {
            "type": "boolean",
            "label": "New Integration",
            "default": true,
            "helpText": "Check if this integration needs to be built"
          }
        }
      }
    }
  ],
  "IsActive": true,
  "SortOrder": 1
}
```

**Setup SKU Selection Logic:**
```javascript
// For each integration in bidirectional array:
for (integration of bidirectional_integrations) {
  // Check if system is in MatureIntegrations table
  const isMature = await db.matureIntegrations.findOne({
    SystemName: integration.system_name
  });

  if (integration.is_new) {
    if (isMature) {
      addSKU({
        skuCode: "INTEGRATION-MATURE",
        quantity: 1,
        reason: `${integration.system_name} uses existing Teller interface`
      });
    } else {
      addSKU({
        skuCode: "INTEGRATION-CUSTOM",
        quantity: 1,
        reason: `Custom integration development for ${integration.system_name}`
      });
    }
  }

  addMonthlyCost({
    productCode: "BIDIRECTIONAL-INTERFACE",
    quantity: 1,
    monthlyPrice: 285.00,
    description: `Bi-directional interface: ${integration.system_name}`
  });
}
```

---

## Part 4: Implementation Architecture

### 4.1 Configuration Service

```python
class ConfigurationService:
    """Service for reading and evaluating configuration rules."""

    def __init__(self, db: Session, pricing_version_id: UUID):
        self.db = db
        self.pricing_version_id = pricing_version_id
        self._cache = {}

    def get_saas_product(self, product_code: str) -> SaaSProduct:
        """Get SaaS product configuration."""
        if product_code not in self._cache:
            self._cache[product_code] = self.db.query(SaaSProduct).filter_by(
                PricingVersionId=self.pricing_version_id,
                ProductCode=product_code,
                IsActive=True
            ).first()
        return self._cache[product_code]

    def get_application_modules(self) -> List[ApplicationModule]:
        """Get all active application modules."""
        return self.db.query(ApplicationModule).filter_by(
            PricingVersionId=self.pricing_version_id,
            IsActive=True
        ).order_by(ApplicationModule.SortOrder).all()

    def get_integration_types(self) -> List[IntegrationType]:
        """Get all integration types."""
        return self.db.query(IntegrationType).filter_by(
            PricingVersionId=self.pricing_version_id,
            IsActive=True
        ).order_by(IntegrationType.SortOrder).all()

    def get_online_form_tiers(self) -> List[OnlineFormTier]:
        """Get all online form tiers."""
        return self.db.query(OnlineFormTier).filter_by(
            PricingVersionId=self.pricing_version_id,
            IsActive=True
        ).order_by(OnlineFormTier.SortOrder).all()
```

### 4.2 Rule Evaluation Engine

```python
class RuleEngine:
    """Engine for evaluating conditions and formulas."""

    @staticmethod
    def evaluate_condition(condition: dict, context: dict) -> bool:
        """
        Evaluate a condition against a context.

        Args:
            condition: Condition definition from configuration
            context: User-provided parameters and calculated values

        Returns:
            True if condition is met, False otherwise
        """
        condition_type = condition.get('type')

        if condition_type == 'always':
            return True

        if condition_type == 'never':
            return False

        if condition_type == 'parameter_equals':
            param_path = condition['parameter']
            expected_value = condition['value']
            actual_value = RuleEngine._get_nested_value(context, param_path)
            return actual_value == expected_value

        if condition_type == 'parameter_greater_than':
            param_path = condition['parameter']
            threshold = condition['value']
            actual_value = RuleEngine._get_nested_value(context, param_path)
            return actual_value is not None and actual_value > threshold

        if condition_type == 'parameter_between':
            param_path = condition['parameter']
            actual_value = RuleEngine._get_nested_value(context, param_path)
            min_val = condition.get('min', float('-inf'))
            max_val = condition.get('max', float('inf'))
            return actual_value is not None and min_val <= actual_value <= max_val

        # Handle compound conditions
        if condition.get('operator') in ['AND', 'OR']:
            conditions = condition.get('conditions', [])
            results = [RuleEngine.evaluate_condition(c, context) for c in conditions]

            if condition['operator'] == 'AND':
                return all(results)
            else:  # OR
                return any(results)

        # Default to False for unknown condition types
        return False

    @staticmethod
    def _get_nested_value(obj: dict, path: str) -> any:
        """Get nested value using dot notation."""
        keys = path.split('.')
        value = obj
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
            if value is None:
                return None
        return value

    @staticmethod
    def calculate_price(formula: dict, context: dict) -> Decimal:
        """
        Calculate price based on pricing formula.

        Args:
            formula: Pricing formula from configuration
            context: User parameters and values

        Returns:
            Calculated price
        """
        formula_type = formula.get('type')

        if formula_type == 'fixed':
            return Decimal(str(formula['price']))

        if formula_type == 'quantity_based':
            price_per_unit = Decimal(str(formula['pricePerUnit']))
            quantity_param = formula['quantityParameter']
            quantity = RuleEngine._get_nested_value(context, quantity_param)
            if quantity is None:
                quantity = 0
            return price_per_unit * Decimal(str(quantity))

        if formula_type == 'tiered':
            volume_param = formula.get('volumeParameter')
            volume = RuleEngine._get_nested_value(context, volume_param) or 0

            for tier in formula.get('tiers', []):
                min_vol = tier['minVolume']
                max_vol = tier.get('maxVolume')

                if max_vol is None:  # Unlimited tier
                    if volume >= min_vol:
                        return Decimal(str(tier['price']))
                else:
                    if min_vol <= volume <= max_vol:
                        return Decimal(str(tier['price']))

            # Default to base price if no tier matches
            return Decimal(str(formula.get('basePrice', 0)))

        # Default to 0 for unknown formula types
        return Decimal('0')
```

### 4.3 SaaS Configuration Service (NEW)

```python
class SaaSConfigurationService:
    """Service for configuring SaaS products based on user parameters."""

    def __init__(self, db: Session, pricing_version_id: UUID):
        self.db = db
        self.config_service = ConfigurationService(db, pricing_version_id)
        self.rule_engine = RuleEngine()

    def configure_saas(self, parameters: dict) -> dict:
        """
        Configure SaaS products based on user parameters.

        Args:
            parameters: User-provided configuration
            {
                "base_product": "standard",
                "additional_users": 3,
                "modules": {
                    "check_recognition": {
                        "enabled": true,
                        "is_new": true,
                        "scan_volume": 75000
                    }
                },
                "integrations": {
                    "bidirectional": [...]
                }
            }

        Returns:
            {
                "selected_products": [...],
                "total_monthly_cost": 5000.00,
                "setup_skus": [...],
                "total_setup_cost": 15000.00
            }
        """
        selected_products = []
        setup_skus = []

        # 1. Process base product
        base_result = self._process_base_product(parameters)
        if base_result:
            selected_products.append(base_result['product'])
            setup_skus.extend(base_result.get('setup_skus', []))

        # 2. Process additional users
        addon_result = self._process_addons(parameters)
        selected_products.extend(addon_result['products'])

        # 3. Process application modules
        module_results = self._process_modules(parameters)
        selected_products.extend(module_results['products'])
        setup_skus.extend(module_results.get('setup_skus', []))

        # 4. Process integrations
        integration_results = self._process_integrations(parameters)
        selected_products.extend(integration_results['products'])
        setup_skus.extend(integration_results.get('setup_skus', []))

        # Calculate totals
        total_monthly = sum(
            Decimal(str(p.get('monthly_cost', 0)))
            for p in selected_products
        )
        total_setup = sum(
            Decimal(str(s.get('total_price', 0)))
            for s in setup_skus
        )

        return {
            "selected_products": selected_products,
            "total_monthly_cost": float(total_monthly),
            "setup_skus": setup_skus,
            "total_setup_cost": float(total_setup)
        }

    def _process_modules(self, parameters: dict) -> dict:
        """Process application modules."""
        modules_config = parameters.get('modules', {})
        selected_products = []
        setup_skus = []

        # Get all active modules
        all_modules = self.config_service.get_application_modules()

        for module in all_modules:
            module_code_lower = module.ModuleCode.lower()
            module_params = modules_config.get(module_code_lower, {})

            # Check if module is enabled
            if not module_params.get('enabled', False):
                continue

            # Build context for rule evaluation
            context = {
                'modules': {
                    module_code_lower: module_params
                },
                **parameters
            }

            # Get linked SaaS product
            if module.SaaSProductCode:
                saas_product = self.config_service.get_saas_product(module.SaaSProductCode)

                if saas_product:
                    # Calculate monthly cost
                    pricing_formula = saas_product.PricingFormula or {}
                    monthly_cost = self.rule_engine.calculate_price(
                        pricing_formula,
                        context
                    )

                    selected_products.append({
                        'product_code': saas_product.ProductCode,
                        'name': module.ModuleName,
                        'category': 'Module',
                        'monthly_cost': float(monthly_cost),
                        'volume': module_params.get(
                            pricing_formula.get('volumeParameter', '').split('.')[-1]
                        ),
                        'reason': f'{module.ModuleName} module enabled'
                    })

            # Process setup SKUs
            selection_rules = module.SelectionRules or {}
            setup_sku_rules = selection_rules.get('setupSKUs', [])

            for sku_rule in setup_sku_rules:
                condition = sku_rule.get('condition', {})

                # Evaluate condition
                if self.rule_engine.evaluate_condition(condition, context):
                    # Get SKU details
                    sku = self.db.query(SKUDefinition).filter_by(
                        PricingVersionId=self.config_service.pricing_version_id,
                        SKUCode=sku_rule['skuCode']
                    ).first()

                    if sku:
                        quantity = sku_rule.get('quantity', 1)
                        setup_skus.append({
                            'sku_code': sku.SKUCode,
                            'name': sku.Name,
                            'quantity': quantity,
                            'unit_price': float(sku.FixedPrice or 0),
                            'total_price': float((sku.FixedPrice or 0) * quantity),
                            'reason': sku_rule.get('reason', 'Required for module')
                        })

        return {
            'products': selected_products,
            'setup_skus': setup_skus
        }
```

---

## Part 5: Migration Plan

### Phase 1: Schema Updates
1. Add new columns to SaaSProducts table
2. Create IntegrationTypes table
3. Create OnlineFormTiers table
4. Populate with v1.9 pricing data

### Phase 2: Configuration Service
1. Implement ConfigurationService class
2. Implement RuleEngine class
3. Write unit tests for rule evaluation

### Phase 3: SaaS Configuration Service
1. Implement SaaSConfigurationService class
2. Migrate existing logic to use configuration
3. Write integration tests

### Phase 4: API Endpoints
1. Create new `/api/saas-config/configure` endpoint
2. Deprecate old `/api/quote-config/preview/saas-products`
3. Update documentation

### Phase 5: Admin UI
1. Create UI for managing SaaSProducts configuration
2. Create UI for managing ApplicationModules
3. Create UI for managing IntegrationTypes
4. Create UI for managing OnlineFormTiers

---

## Part 6: Benefits

### For Administrators
- ✅ Change pricing without code deployment
- ✅ Add new modules via admin UI
- ✅ Modify tier thresholds dynamically
- ✅ Update selection rules without developer

### For Developers
- ✅ No hardcoded business logic
- ✅ Testable rule engine
- ✅ Consistent evaluation across all products
- ✅ Easy to add new formula types

### For Salespeople
- ✅ Always using latest pricing
- ✅ Complex calculations handled automatically
- ✅ Flexible configuration options
- ✅ Confidence in quote accuracy

---

## Next Steps

1. **Review and Approve**: Get stakeholder buy-in on this architecture
2. **Create Migration**: Write Alembic migration for new schema
3. **Seed Configuration Data**: Populate tables with v1.9 pricing
4. **Implement Core Services**: Build ConfigurationService and RuleEngine
5. **Test Thoroughly**: Unit + integration tests for all rule types
6. **Build Admin UI**: Allow non-technical config management

Would you like me to proceed with creating the database migration?
