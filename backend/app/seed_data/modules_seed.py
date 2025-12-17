"""Seed data for Application Modules based on v1.9 requirements Section 3.3."""

from typing import Any

# Module configurations from v1.9 Section 3.3
# These represent the checkboxes and sub-parameters in the quote builder

APPLICATION_MODULES = [
    {
        "ModuleCode": "CHECK_RECOGNITION",
        "ModuleName": "Check Recognition & Bulk Scanning",
        "Description": "Check scanning with MICR recognition and bulk processing",
        "SortOrder": 1,
        "SubParameters": {
            "monthlyScans": {
                "type": "number",
                "label": "Estimated monthly scans",
                "required": True,
                "min": 0,
            },
            "ICLEnabled": {
                "type": "boolean",
                "label": "Image Cash Letter (ICL) submission required?",
                "required": False,
                "default": False,
            },
            "bankName": {
                "type": "text",
                "label": "Bank name (for ICL assumptions)",
                "required": False,
                "dependsOn": {"field": "ICLEnabled", "value": True},
            },
        },
        "SelectionRules": {
            "SKUs": [
                {
                    "SKUCode": "CHECK-ICL-SETUP",
                    "condition": "always",  # Always add this SKU
                    "quantity": 1,
                }
            ],
            "SaaSProducts": [
                {
                    "ProductCode": "CHECK-SCANNING",
                    "quantityFrom": "monthlyScans",  # Use monthlyScans parameter
                }
            ],
        },
    },
    {
        "ModuleCode": "REVENUE_SUBMISSION",
        "ModuleName": "Revenue Submission",
        "Description": "Web-based portal for department revenue submission",
        "SortOrder": 2,
        "SubParameters": {
            "numberOfTemplates": {
                "type": "number",
                "label": "Number of submission templates",
                "required": True,
                "min": 1,
                "default": 10,
            },
            "workflowNeeded": {
                "type": "boolean",
                "label": "Workflow capability required?",
                "required": False,
                "default": False,
            },
        },
        "SelectionRules": {
            "SKUs": [
                {
                    "SKUCode": "REV-SUB-BASE",
                    "condition": "always",
                    "quantity": 1,
                },
                {
                    "SKUCode": "REV-SUB-TEMPLATE-BLOCK",
                    "condition": "numberOfTemplates > 10",
                    "quantity": "Math.ceil((numberOfTemplates - 10) / 10)",
                },
                {
                    "SKUCode": "WORKFLOW-SUBMISSION",
                    "condition": "workflowNeeded === true",
                    "quantity": 1,
                },
            ],
            "SaaSProducts": [
                {
                    "ProductCode": "REVENUE-SUBMISSION",
                    "quantityFrom": None,  # Fixed SaaS product
                }
            ],
        },
    },
    {
        "ModuleCode": "TELLER_ONLINE",
        "ModuleName": "Teller Online",
        "Description": "Customer-facing web portal for online payments",
        "SortOrder": 3,
        "SubParameters": {
            "numberOfIntegrations": {
                "type": "number",
                "label": "Number of system integrations",
                "required": False,
                "min": 0,
                "default": 0,
                "help": "Systems customers can search/pay from the online portal",
            },
            "thirdPartyRedirect": {
                "type": "boolean",
                "label": "Third-party portal redirect required?",
                "required": False,
                "default": False,
                "help": "External systems redirect to Teller Online for payment processing",
            },
        },
        "SelectionRules": {
            "SKUs": [
                {
                    "SKUCode": "TELLER-ONLINE-SETUP",
                    "condition": "always",
                    "quantity": 1,
                },
                {
                    "SKUCode": "TELLER-ONLINE-THIRD-PARTY-REDIRECT",
                    "condition": "thirdPartyRedirect === true",
                    "quantity": 1,
                },
            ],
            "SaaSProducts": [
                {
                    "ProductCode": "TELLER-ONLINE",
                    "quantityFrom": None,
                }
            ],
            "Notes": "Integration SKUs added separately in Step 3 (Integrations)",
        },
    },
    {
        "ModuleCode": "ONLINE_FORMS",
        "ModuleName": "Online Forms",
        "Description": "Configurable web forms with calculations and workflows",
        "SortOrder": 4,
        "SubParameters": {
            "forms": {
                "type": "array",
                "label": "Forms configuration",
                "required": False,
                "itemSchema": {
                    "formName": {"type": "text", "label": "Form name"},
                    "numberOfFields": {
                        "type": "number",
                        "label": "Number of fields",
                        "min": 1,
                    },
                    "complexCalculations": {
                        "type": "boolean",
                        "label": "Complex calculations required?",
                    },
                    "customCode": {
                        "type": "boolean",
                        "label": "Custom code/logic required?",
                    },
                    "workflowRequired": {
                        "type": "boolean",
                        "label": "Workflow required?",
                    },
                },
            },
        },
        "SelectionRules": {
            "SKUs": "computed_per_form",  # Special case: each form generates SKUs
            "Logic": """
                For each form in forms array:
                    IF numberOfFields < 15 AND !complexCalculations AND !customCode:
                        ADD "ONLINE-FORM-TIER1"
                    ELSE IF numberOfFields < 30 AND !customCode:
                        ADD "ONLINE-FORM-TIER2"
                    ELSE:
                        ADD "ONLINE-FORM-TIER3"

                    IF workflowRequired:
                        ADD "ONLINE-FORM-WORKFLOW-ADDON"
            """,
        },
    },
    {
        "ModuleCode": "CREDIT_INTEGRATION",
        "ModuleName": "Credit Card / Electronic Payments",
        "Description": "Credit card and electronic payment processing",
        "SortOrder": 5,
        "SubParameters": {
            "processor": {
                "type": "text",
                "label": "Payment processor",
                "required": True,
                "help": "e.g., CORE, Paymentus, Stripe, etc.",
            },
            "processorType": {
                "type": "select",
                "label": "Processor integration type",
                "required": True,
                "options": [
                    {
                        "value": "EXISTING",
                        "label": "Existing (processor already integrated with Teller)",
                    },
                    {"value": "NEW", "label": "New (custom integration required)"},
                ],
            },
        },
        "SelectionRules": {
            "SKUs": [
                {
                    "SKUCode": "CREDIT-INTEGRATION-EXISTING",
                    "condition": "processorType === 'EXISTING'",
                    "quantity": 1,
                },
                {
                    "SKUCode": "CREDIT-INTEGRATION-NEW",
                    "condition": "processorType === 'NEW'",
                    "quantity": 1,
                },
            ],
        },
    },
]

# Training modules are auto-calculated based on other selections
TRAINING_MODULE = {
    "ModuleCode": "TRAINING",
    "ModuleName": "Training",
    "Description": "Train-the-trainer and end-user training sessions",
    "SortOrder": 10,
    "SubParameters": {
        "additionalSessions": {
            "type": "number",
            "label": "Additional end-user cashiering sessions",
            "required": False,
            "min": 0,
            "default": 0,
            "help": "Beyond the standard training suite",
        },
    },
    "SelectionRules": {
        "SKUs": [
            {
                "SKUCode": "TRAINING-SUITE",
                "condition": "always",
                "quantity": 1,
            },
            {
                "SKUCode": "TRAINING-REVENUE-ADDON",
                "condition": "REVENUE_SUBMISSION module enabled",
                "quantity": 1,
            },
            {
                "SKUCode": "TRAINING-END-USER-CASHIERING",
                "condition": "additionalSessions > 0",
                "quantity": "additionalSessions",
            },
        ],
    },
}

APPLICATION_MODULES.append(TRAINING_MODULE)


def get_module_seed_data() -> list[dict[str, Any]]:
    """Return module seed data for insertion."""
    return APPLICATION_MODULES
