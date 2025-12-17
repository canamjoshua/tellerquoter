"""Configuration-driven architecture seed data.

Seeds IntegrationTypes and updates SaaSProducts with configuration.
"""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import (
    IntegrationType,
    MatureIntegration,
    SaaSProduct,
)


def seed_integration_types(session: Session, pricing_version_id: UUID) -> None:
    """Create integration types with pricing and SKU references."""
    integration_types_data = [
        {
            "TypeCode": "BIDIRECTIONAL",
            "TypeName": "Bi-Directional Interface",
            "Description": "Real-time bi-directional data sync between systems",
            "MonthlyCost": Decimal("285.00"),
            "MatureSetupSKU": "INTEGRATION-MATURE",
            "CustomSetupSKU": "INTEGRATION-CUSTOM",
            "RequiredParameters": [
                {
                    "name": "system_name",
                    "type": "string",
                    "label": "System Name",
                    "required": True,
                },
                {
                    "name": "vendor",
                    "type": "string",
                    "label": "Vendor",
                    "required": True,
                },
                {
                    "name": "is_new",
                    "type": "boolean",
                    "label": "Is this a new integration?",
                    "default": True,
                },
            ],
            "SortOrder": 1,
        },
        {
            "TypeCode": "PAYMENT_IMPORT",
            "TypeName": "Payment Import Interface",
            "Description": "One-way payment import from external system",
            "MonthlyCost": Decimal("170.00"),
            "MatureSetupSKU": "INTEGRATION-MATURE",
            "CustomSetupSKU": "INTEGRATION-CUSTOM",
            "RequiredParameters": [
                {
                    "name": "system_name",
                    "type": "string",
                    "label": "System Name",
                    "required": True,
                },
                {
                    "name": "vendor",
                    "type": "string",
                    "label": "Vendor",
                    "required": True,
                },
                {
                    "name": "is_new",
                    "type": "boolean",
                    "label": "Is this a new integration?",
                    "default": True,
                },
            ],
            "SortOrder": 2,
        },
    ]

    for int_type_data in integration_types_data:
        int_type = IntegrationType(
            PricingVersionId=pricing_version_id,
            **int_type_data,
            IsActive=True,
        )
        session.add(int_type)
        print(f"  ✅ Created Integration Type: {int_type.TypeName}")

    session.flush()
    print(f"✅ Created {len(integration_types_data)} Integration Types")


def update_mature_integrations(session: Session) -> None:
    """Update mature integrations list based on Excel spreadsheet."""
    # First, clear existing mature integrations
    session.query(MatureIntegration).delete()

    # Add integrations from Excel "Parameters" sheet
    integrations_data = [
        {
            "IntegrationCode": "TYLER-MUNIS",
            "SystemName": "Tyler Munis",
            "Vendor": "Tyler Technologies",
            "Comments": "ERP and financial management system",
        },
        {
            "IntegrationCode": "TYLER-INCODE",
            "SystemName": "Tyler Incode",
            "Vendor": "Tyler Technologies",
            "Comments": "Financial and HR system",
        },
        {
            "IntegrationCode": "SPRINGBROOK",
            "SystemName": "Springbrook",
            "Vendor": "Springbrook Software",
            "Comments": "Municipal financial management",
        },
        {
            "IntegrationCode": "LOGOS",
            "SystemName": "Logos",
            "Vendor": "Logos Technologies",
            "Comments": "Financial management system",
        },
        {
            "IntegrationCode": "EDEN",
            "SystemName": "Eden",
            "Vendor": "Eden Software",
            "Comments": "Financial management system",
        },
        {
            "IntegrationCode": "CSDC-INCODE",
            "SystemName": "CSDC Incode",
            "Vendor": "CSDC Systems",
            "Comments": "Financial management system",
        },
    ]

    for integration_data in integrations_data:
        integration = MatureIntegration(**integration_data, IsActive=True)
        session.add(integration)
        print(f"  ✅ Created Mature Integration: {integration.SystemName}")

    session.flush()
    print(f"✅ Updated with {len(integrations_data)} Mature Integrations")


def update_saas_products_configuration(session: Session, pricing_version_id: UUID) -> None:
    """Update existing SaaS products with configuration-driven fields."""

    # Get existing products
    products = (
        session.query(SaaSProduct).filter(SaaSProduct.PricingVersionId == pricing_version_id).all()
    )

    updates_applied = 0

    for product in products:
        if product.ProductCode == "TELLER-STANDARD":
            product.ProductType = "base"
            product.PricingFormula = {
                "type": "fixed",
                "price": 2950.00,
            }
            product.SelectionRules = {
                "operator": "AND",
                "conditions": [
                    {
                        "type": "parameter_equals",
                        "parameter": "base_product",
                        "value": "standard",
                    }
                ],
            }
            product.RequiredParameters = [
                {
                    "name": "base_product",
                    "type": "string",
                    "label": "Base Product",
                    "options": ["standard", "basic"],
                    "default": "standard",
                }
            ]
            product.RelatedSetupSKUs = [
                {
                    "condition": {"type": "always"},
                    "skuCode": "ORG-SETUP-BASIC",
                    "quantity": 1,
                    "reason": "Organization setup required for Teller Standard",
                }
            ]
            updates_applied += 1
            print(f"  ✅ Updated: {product.ProductCode} with base product configuration")

        elif product.ProductCode == "TELLER-BASIC":
            product.ProductType = "base"
            product.PricingFormula = {
                "type": "fixed",
                "price": 1950.00,
            }
            product.SelectionRules = {
                "operator": "AND",
                "conditions": [
                    {
                        "type": "parameter_equals",
                        "parameter": "base_product",
                        "value": "basic",
                    }
                ],
            }
            product.RequiredParameters = [
                {
                    "name": "base_product",
                    "type": "string",
                    "label": "Base Product",
                    "options": ["standard", "basic"],
                    "default": "standard",
                }
            ]
            product.RelatedSetupSKUs = [
                {
                    "condition": {"type": "always"},
                    "skuCode": "ORG-SETUP-BASIC",
                    "quantity": 1,
                    "reason": "Organization setup required for Teller Basic",
                }
            ]
            updates_applied += 1
            print(f"  ✅ Updated: {product.ProductCode} with base product configuration")

    # Create new SaaS products for addons
    addon_products = [
        {
            "ProductCode": "ADDITIONAL-USERS",
            "Name": "Additional Users",
            "Description": "Additional concurrent users beyond base package",
            "Category": "Add-on",
            "PricingModel": "Quantity-based",
            "ProductType": "addon",
            "Tier1Min": 0,
            "Tier1Max": 999999,
            "Tier1Price": Decimal("60.00"),
            "PricingFormula": {
                "type": "quantity_based",
                "pricePerUnit": 60.00,
                "quantityParameter": "additional_users",
            },
            "RequiredParameters": [
                {
                    "name": "additional_users",
                    "type": "number",
                    "label": "Number of Additional Users",
                    "min": 0,
                    "default": 0,
                }
            ],
            "SelectionRules": {
                "conditions": [
                    {
                        "type": "parameter_greater_than",
                        "parameter": "additional_users",
                        "value": 0,
                    }
                ]
            },
        },
    ]

    for addon_data in addon_products:
        addon = SaaSProduct(
            PricingVersionId=pricing_version_id,
            **addon_data,
            IsActive=True,
            IsRequired=False,
            SortOrder=10,
        )
        session.add(addon)
        updates_applied += 1
        print(f"  ✅ Created addon: {addon.ProductCode}")

    session.flush()
    print(f"✅ Applied {updates_applied} SaaS product configuration updates")


def seed_configuration_all(session: Session, pricing_version_id: UUID) -> None:
    """Seed all configuration-driven data."""
    print("\n" + "=" * 60)
    print("🌱 Seeding Configuration-Driven Architecture Data")
    print("=" * 60 + "\n")

    seed_integration_types(session, pricing_version_id)
    update_mature_integrations(session)
    update_saas_products_configuration(session, pricing_version_id)

    print("\n" + "=" * 60)
    print("✅ Configuration-Driven Data Seeding Complete!")
    print("=" * 60 + "\n")
