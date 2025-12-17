"""Update ApplicationModule entries with configuration data."""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from decimal import Decimal  # noqa: E402

from app.core.deps import SessionLocal  # noqa: E402
from app.models import ApplicationModule, PricingVersion, SaaSProduct  # noqa: E402


def update_modules_configuration() -> None:
    """Update application modules with proper configuration."""
    print("\n" + "=" * 60)
    print("🔧 Updating Application Modules Configuration")
    print("=" * 60 + "\n")

    session = SessionLocal()
    try:
        # Get current pricing version
        pricing_version = (
            session.query(PricingVersion).filter(PricingVersion.IsCurrent.is_(True)).first()
        )

        if not pricing_version:
            print("❌ No current pricing version found.")
            return

        # Create SaaS products for modules that don't have them yet
        module_saas_products = [
            {
                "ProductCode": "CHECK-RECOGNITION-SAAS",
                "Name": "Check Recognition",
                "Description": "Remote check deposit and ICL generation",
                "Category": "Module",
                "ProductType": "module",
                "PricingModel": "Tiered",
                "Tier1Min": 0,
                "Tier1Max": 50000,
                "Tier1Price": Decimal("1030.00"),
                "Tier2Min": 50001,
                "Tier2Max": 150000,
                "Tier2Price": Decimal("1500.00"),
                "Tier3Min": 150001,
                "Tier3Max": None,
                "Tier3Price": Decimal("2100.00"),
                "PricingFormula": {
                    "type": "tiered",
                    "volumeParameter": "modules.check_recognition.scan_volume",
                    "tiers": [
                        {"minVolume": 0, "maxVolume": 50000, "price": 1030.00},
                        {"minVolume": 50001, "maxVolume": 150000, "price": 1500.00},
                        {"minVolume": 150001, "maxVolume": None, "price": 2100.00},
                    ],
                },
                "SelectionRules": {
                    "operator": "AND",
                    "conditions": [
                        {
                            "type": "parameter_equals",
                            "parameter": "modules.check_recognition.enabled",
                            "value": True,
                        }
                    ],
                },
                "RequiredParameters": [
                    {
                        "name": "scan_volume",
                        "type": "number",
                        "label": "Annual Scan Volume",
                        "required": True,
                    }
                ],
                "RelatedSetupSKUs": [
                    {
                        "condition": {
                            "type": "parameter_equals",
                            "parameter": "modules.check_recognition.is_new",
                            "value": True,
                        },
                        "skuCode": "CHECK-ICL-SETUP",
                        "quantity": 1,
                        "reason": "Initial setup for Check Recognition",
                    }
                ],
            },
            {
                "ProductCode": "REVENUE-SUBMISSION-SAAS",
                "Name": "Revenue Submission",
                "Description": "Web-based revenue submission portal",
                "Category": "Module",
                "ProductType": "module",
                "PricingModel": "Tiered",
                "Tier1Min": 0,
                "Tier1Max": 25,
                "Tier1Price": Decimal("600.00"),
                "Tier2Min": 26,
                "Tier2Max": 100,
                "Tier2Price": Decimal("1000.00"),
                "Tier3Min": 101,
                "Tier3Max": None,
                "Tier3Price": Decimal("1500.00"),
                "PricingFormula": {
                    "type": "tiered",
                    "volumeParameter": "modules.revenue_submission.num_submitters",
                    "tiers": [
                        {"minVolume": 0, "maxVolume": 25, "price": 600.00},
                        {"minVolume": 26, "maxVolume": 100, "price": 1000.00},
                        {"minVolume": 101, "maxVolume": None, "price": 1500.00},
                    ],
                },
                "SelectionRules": {
                    "operator": "AND",
                    "conditions": [
                        {
                            "type": "parameter_equals",
                            "parameter": "modules.revenue_submission.enabled",
                            "value": True,
                        }
                    ],
                },
                "RequiredParameters": [
                    {
                        "name": "num_submitters",
                        "type": "number",
                        "label": "Number of Submitters",
                        "required": True,
                    }
                ],
                "RelatedSetupSKUs": [
                    {
                        "condition": {
                            "type": "parameter_equals",
                            "parameter": "modules.revenue_submission.is_new",
                            "value": True,
                        },
                        "skuCode": "REV-SUB-BASE",
                        "quantity": 1,
                        "reason": "Base revenue submission setup",
                    }
                ],
            },
            {
                "ProductCode": "TELLER-ONLINE-SAAS",
                "Name": "Teller Online",
                "Description": "Customer-facing web payment portal",
                "Category": "Module",
                "ProductType": "module",
                "PricingModel": "Tiered",
                "Tier1Min": 0,
                "Tier1Max": 50000,
                "Tier1Price": Decimal("800.00"),
                "Tier2Min": 50001,
                "Tier2Max": 150000,
                "Tier2Price": Decimal("1200.00"),
                "Tier3Min": 150001,
                "Tier3Max": None,
                "Tier3Price": Decimal("1600.00"),
                "PricingFormula": {
                    "type": "tiered",
                    "volumeParameter": "modules.teller_online.transactions_per_year",
                    "tiers": [
                        {"minVolume": 0, "maxVolume": 50000, "price": 800.00},
                        {"minVolume": 50001, "maxVolume": 150000, "price": 1200.00},
                        {"minVolume": 150001, "maxVolume": None, "price": 1600.00},
                    ],
                },
                "SelectionRules": {
                    "operator": "AND",
                    "conditions": [
                        {
                            "type": "parameter_equals",
                            "parameter": "modules.teller_online.enabled",
                            "value": True,
                        }
                    ],
                },
                "RequiredParameters": [
                    {
                        "name": "transactions_per_year",
                        "type": "number",
                        "label": "Estimated Transactions Per Year",
                        "required": True,
                    }
                ],
                "RelatedSetupSKUs": [
                    {
                        "condition": {
                            "type": "parameter_equals",
                            "parameter": "modules.teller_online.is_new",
                            "value": True,
                        },
                        "skuCode": "TELLER-ONLINE-SETUP",
                        "quantity": 1,
                        "reason": "Initial Teller Online portal setup",
                    }
                ],
            },
        ]

        # Create SaaS products
        saas_product_map = {}
        for saas_data in module_saas_products:
            # Check if already exists
            existing = (
                session.query(SaaSProduct)
                .filter(
                    SaaSProduct.PricingVersionId == pricing_version.Id,
                    SaaSProduct.ProductCode == saas_data["ProductCode"],
                )
                .first()
            )

            if existing:
                print(f"  ⏭️  Skipping existing: {saas_data['ProductCode']}")
                saas_product_map[saas_data["ProductCode"]] = existing.Id
            else:
                saas = SaaSProduct(
                    PricingVersionId=pricing_version.Id,
                    **saas_data,
                    IsActive=True,
                    IsRequired=False,
                    SortOrder=20,
                )
                session.add(saas)
                session.flush()
                saas_product_map[saas_data["ProductCode"]] = saas.Id
                print(f"  ✅ Created SaaS Product: {saas_data['ProductCode']}")

        # Update ApplicationModule entries to link to SaaS products
        module_mapping = {
            "CHECK_RECOGNITION": {
                "saas_product_id_key": "CHECK-RECOGNITION-SAAS",
                "selection_rules": {
                    "setupSKUs": [
                        {
                            "condition": {"type": "always"},
                            "skuCode": "CHECK-ICL-SETUP",
                            "quantity": 1,
                            "reason": "Check Recognition setup",
                        }
                    ]
                },
            },
            "REVENUE_SUBMISSION": {
                "saas_product_id_key": "REVENUE-SUBMISSION-SAAS",
                "selection_rules": {
                    "setupSKUs": [
                        {
                            "condition": {"type": "always"},
                            "skuCode": "REV-SUB-BASE",
                            "quantity": 1,
                            "reason": "Revenue Submission base setup",
                        }
                    ]
                },
            },
            "TELLER_ONLINE": {
                "saas_product_id_key": "TELLER-ONLINE-SAAS",
                "selection_rules": {
                    "setupSKUs": [
                        {
                            "condition": {"type": "always"},
                            "skuCode": "TELLER-ONLINE-SETUP",
                            "quantity": 1,
                            "reason": "Teller Online portal setup",
                        }
                    ]
                },
            },
        }

        modules = session.query(ApplicationModule).all()
        updated_count = 0

        for module in modules:
            if module.ModuleCode in module_mapping:
                mapping = module_mapping[module.ModuleCode]
                saas_product_id = saas_product_map.get(mapping["saas_product_id_key"])

                if saas_product_id:
                    module.SaaSProductId = saas_product_id
                    module.SelectionRules = mapping["selection_rules"]
                    updated_count += 1
                    product_code = mapping["saas_product_id_key"]
                    print(
                        f"  ✅ Updated Module: {module.ModuleCode} → {product_code} (ID: {saas_product_id})"
                    )

        session.commit()

        print("\n" + "=" * 60)
        print("✅ Module Configuration Update Complete!")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"  - Created {len(module_saas_products)} new SaaS products for modules")
        print(f"  - Updated {updated_count} application modules with SaaS product links")
        print()

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error during update: {e}")
        import traceback

        traceback.print_exc()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    update_modules_configuration()
