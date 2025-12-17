"""Comprehensive seeder for v1.9 database schema."""

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.deps import SessionLocal
from app.models import (
    ApplicationModule,
    MatureIntegration,
    PricingVersion,
    Referrer,
    SaaSProduct,
    SKUDefinition,
    TextSnippet,
    TravelZone,
)
from app.seed_data.configuration_seed import seed_configuration_all
from app.seed_data.modules_seed import get_module_seed_data


def seed_pricing_version(session: Session) -> UUID:
    """Create initial pricing version v1.0."""
    pricing_version = PricingVersion(
        VersionNumber="1.0",
        Description="Initial pricing version based on v1.9 requirements",
        EffectiveDate=date(2025, 1, 1),
        ExpirationDate=None,
        IsCurrent=True,
        IsLocked=False,
        CreatedBy="System Seeder",
    )
    session.add(pricing_version)
    session.flush()
    print(f"✅ Created Pricing Version: {pricing_version.VersionNumber} (ID: {pricing_version.Id})")
    return pricing_version.Id


def seed_skus(session: Session, pricing_version_id: UUID) -> dict[str, UUID]:
    """Create all 26 SKUs from v1.9 Section 2.3."""
    skus_data: list[dict[str, Any]] = [
        # Organization Setup SKUs
        {
            "SKUCode": "ORG-SETUP-BASIC",
            "Name": "Organization Setup - Basic",
            "Category": "Service",
            "FixedPrice": Decimal("3680.00"),
            "EstimatedHours": 40,
            "ScopeDescription": "Single department configuration",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "ORG-SETUP-ENTERPRISE",
            "Name": "Organization Setup - Enterprise",
            "Category": "Service",
            "FixedPrice": Decimal("5520.00"),
            "EstimatedHours": 60,
            "ScopeDescription": "Multi-department configuration",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "ORG-SETUP-ADDITIONAL-DEPT",
            "Name": "Additional Department Setup",
            "Category": "Service",
            "FixedPrice": Decimal("1840.00"),
            "EstimatedHours": 20,
            "ScopeDescription": "Configuration for each additional department beyond initial",
            "IsRepeatable": True,
        },
        # Check Recognition SKUs
        {
            "SKUCode": "CHECK-ICL-SETUP",
            "Name": "Check Scanning with ICL Setup",
            "Category": "Service",
            "FixedPrice": Decimal("12880.00"),
            "EstimatedHours": 140,
            "ScopeDescription": "Check recognition and Image Cash Letter submission configuration",
            "IsRepeatable": False,
        },
        # Revenue Submission SKUs
        {
            "SKUCode": "REV-SUB-BASE",
            "Name": "Revenue Submission - Base (up to 10 templates)",
            "Category": "Service",
            "FixedPrice": Decimal("9200.00"),
            "EstimatedHours": 100,
            "ScopeDescription": "Web-based revenue submission portal with up to 10 templates",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "REV-SUB-TEMPLATE-BLOCK",
            "Name": "Additional Template Block (10 templates)",
            "Category": "Service",
            "FixedPrice": Decimal("4600.00"),
            "EstimatedHours": 50,
            "ScopeDescription": "Each additional block of 10 submission templates",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "WORKFLOW-SUBMISSION",
            "Name": "Workflow Add-on for Revenue Submission",
            "Category": "Service",
            "FixedPrice": Decimal("5520.00"),
            "EstimatedHours": 60,
            "ScopeDescription": "Approval workflow capability for revenue submissions",
            "IsRepeatable": False,
        },
        # Teller Online SKUs
        {
            "SKUCode": "TELLER-ONLINE-SETUP",
            "Name": "Teller Online Portal Setup",
            "Category": "Service",
            "FixedPrice": Decimal("6440.00"),
            "EstimatedHours": 70,
            "ScopeDescription": "Customer-facing web payment portal configuration",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "TELLER-ONLINE-THIRD-PARTY-REDIRECT",
            "Name": "Third-Party Portal Redirect Configuration",
            "Category": "Service",
            "FixedPrice": Decimal("5520.00"),
            "EstimatedHours": 60,
            "ScopeDescription": "Configuration for external systems to redirect to Teller Online",
            "IsRepeatable": False,
        },
        # Online Forms SKUs
        {
            "SKUCode": "ONLINE-FORM-TIER1",
            "Name": "Online Form - Tier 1",
            "Category": "Service",
            "FixedPrice": Decimal("4600.00"),
            "EstimatedHours": 50,
            "ScopeDescription": "Basic form (<15 fields, no complex calculations)",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "ONLINE-FORM-TIER2",
            "Name": "Online Form - Tier 2",
            "Category": "Service",
            "FixedPrice": Decimal("9200.00"),
            "EstimatedHours": 100,
            "ScopeDescription": "Moderate complexity form (15-30 fields or complex calculations)",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "ONLINE-FORM-TIER3",
            "Name": "Online Form - Tier 3",
            "Category": "Service",
            "FixedPrice": Decimal("16560.00"),
            "EstimatedHours": 180,
            "ScopeDescription": "Complex form (>30 fields, custom code, complex logic)",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "ONLINE-FORM-WORKFLOW-ADDON",
            "Name": "Workflow Add-on for Online Form",
            "Category": "Service",
            "FixedPrice": Decimal("5520.00"),
            "EstimatedHours": 60,
            "ScopeDescription": "Approval workflow for form submissions",
            "IsRepeatable": True,
        },
        # Credit Card Integration SKUs
        {
            "SKUCode": "CREDIT-INTEGRATION-EXISTING",
            "Name": "Credit Card Integration - Existing Processor",
            "Category": "Service",
            "FixedPrice": Decimal("5520.00"),
            "EstimatedHours": 60,
            "ScopeDescription": "Integration with processor already supported by Teller",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "CREDIT-INTEGRATION-NEW",
            "Name": "Credit Card Integration - New Processor",
            "Category": "Service",
            "FixedPrice": Decimal("27600.00"),
            "EstimatedHours": 300,
            "ScopeDescription": "Custom integration development for new processor",
            "IsRepeatable": False,
        },
        # Integration SKUs
        {
            "SKUCode": "INTEGRATION-MATURE",
            "Name": "System Integration - Mature",
            "Category": "Service",
            "FixedPrice": Decimal("7360.00"),
            "EstimatedHours": 80,
            "ScopeDescription": "Integration with mature/pre-built adapter",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "INTEGRATION-CUSTOM",
            "Name": "System Integration - Custom",
            "Category": "Service",
            "FixedPrice": Decimal("28520.00"),
            "EstimatedHours": 310,
            "ScopeDescription": "Custom integration development from scratch",
            "IsRepeatable": True,
        },
        # Project Management SKUs
        {
            "SKUCode": "PM-STANDARD",
            "Name": "Project Management - Standard (per month)",
            "Category": "Service",
            "FixedPrice": Decimal("5520.00"),
            "EstimatedHours": 60,
            "ScopeDescription": "Standard project management for projects <3 months or low complexity",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "PM-ENTERPRISE",
            "Name": "Project Management - Enterprise (per month)",
            "Category": "Service",
            "FixedPrice": Decimal("9200.00"),
            "EstimatedHours": 100,
            "ScopeDescription": "Enterprise project management for projects >3 months or high complexity",
            "IsRepeatable": True,
        },
        # Training SKUs
        {
            "SKUCode": "TRAINING-SUITE",
            "Name": "Training Suite - Standard",
            "Category": "Service",
            "FixedPrice": Decimal("8280.00"),
            "EstimatedHours": 90,
            "ScopeDescription": "Standard train-the-trainer and end-user training",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "TRAINING-REVENUE-ADDON",
            "Name": "Revenue Submission Training Add-on",
            "Category": "Service",
            "FixedPrice": Decimal("3680.00"),
            "EstimatedHours": 40,
            "ScopeDescription": "Additional training for revenue submission module",
            "IsRepeatable": False,
        },
        {
            "SKUCode": "TRAINING-END-USER-CASHIERING",
            "Name": "Additional End-User Cashiering Session",
            "Category": "Service",
            "FixedPrice": Decimal("1840.00"),
            "EstimatedHours": 20,
            "ScopeDescription": "Extra end-user cashiering training session",
            "IsRepeatable": True,
        },
        # Travel SKUs
        {
            "SKUCode": "TRAVEL-DAY",
            "Name": "Travel Day",
            "Category": "Travel",
            "FixedPrice": None,  # Calculated based on travel zone
            "EstimatedHours": 8,
            "RequiresTravelZone": True,
            "ScopeDescription": "One travel day to/from client site",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "ONSITE-DAY",
            "Name": "On-site Day",
            "Category": "Travel",
            "FixedPrice": None,  # Calculated based on travel zone
            "EstimatedHours": 8,
            "RequiresTravelZone": True,
            "ScopeDescription": "One day of on-site work at client location",
            "IsRepeatable": True,
        },
        # Hardware SKUs (examples)
        {
            "SKUCode": "SCANNER-PANINI-MYVU",
            "Name": "Panini MyVu Check Scanner",
            "Category": "Hardware",
            "FixedPrice": Decimal("2500.00"),
            "EstimatedHours": None,
            "ScopeDescription": "Panini MyVu check scanning device with MICR reader",
            "IsRepeatable": True,
        },
        {
            "SKUCode": "RECEIPT-PRINTER-THERMAL",
            "Name": "Thermal Receipt Printer",
            "Category": "Hardware",
            "FixedPrice": Decimal("450.00"),
            "EstimatedHours": None,
            "ScopeDescription": "Standard thermal receipt printer for cashiering",
            "IsRepeatable": True,
        },
    ]

    sku_map = {}
    for sku_data in skus_data:
        # Extract fields that shouldn't be passed via **sku_data
        is_repeatable = sku_data.pop("IsRepeatable", False)
        requires_travel_zone = sku_data.pop("RequiresTravelZone", False)

        sku = SKUDefinition(
            PricingVersionId=pricing_version_id,
            **sku_data,
            RequiresQuantity=is_repeatable,
            RequiresTravelZone=requires_travel_zone,
            RequiresConfiguration=False,
            IsActive=True,
            SortOrder=0,
            EarmarkedStatus=False,
        )
        session.add(sku)
        session.flush()
        sku_map[sku.SKUCode] = sku.Id
        print(f"  ✅ Created SKU: {sku.SKUCode} - {sku.Name}")

    print(f"✅ Created {len(skus_data)} SKUs")
    return sku_map


def seed_saas_products(session: Session, pricing_version_id: UUID) -> dict[str, UUID]:
    """Create SaaS products."""
    saas_products_data = [
        {
            "ProductCode": "TELLER-STANDARD",
            "Name": "Teller Standard",
            "Description": "Standard Teller cashiering platform",
            "Category": "Core",
            "PricingModel": "Tiered",
            "Tier1Min": 0,
            "Tier1Max": 10,
            "Tier1Price": Decimal("25.00"),
            "Tier2Min": 11,
            "Tier2Max": 50,
            "Tier2Price": Decimal("22.00"),
            "Tier3Min": 51,
            "Tier3Max": None,
            "Tier3Price": Decimal("20.00"),
            "IsRequired": True,
        },
        {
            "ProductCode": "TELLER-BASIC",
            "Name": "Teller Basic",
            "Description": "Basic Teller cashiering platform",
            "Category": "Core",
            "PricingModel": "Tiered",
            "Tier1Min": 0,
            "Tier1Max": 10,
            "Tier1Price": Decimal("15.00"),
            "Tier2Min": 11,
            "Tier2Max": 50,
            "Tier2Price": Decimal("13.00"),
            "Tier3Min": 51,
            "Tier3Max": None,
            "Tier3Price": Decimal("12.00"),
            "IsRequired": False,
        },
        {
            "ProductCode": "CHECK-SCANNING",
            "Name": "Check Scanning Module",
            "Description": "Check recognition with MICR and bulk scanning",
            "Category": "Optional",
            "PricingModel": "Usage-based",
            "Tier1Min": 0,
            "Tier1Max": 999999,
            "Tier1Price": Decimal("0.10"),
            "Tier2Min": None,
            "Tier2Max": None,
            "Tier2Price": None,
            "Tier3Min": None,
            "Tier3Max": None,
            "Tier3Price": None,
            "IsRequired": False,
        },
        {
            "ProductCode": "REVENUE-SUBMISSION",
            "Name": "Revenue Submission Portal",
            "Description": "Web-based revenue submission for departments",
            "Category": "Optional",
            "PricingModel": "Flat",
            "Tier1Min": 1,
            "Tier1Max": 999999,
            "Tier1Price": Decimal("200.00"),
            "Tier2Min": None,
            "Tier2Max": None,
            "Tier2Price": None,
            "Tier3Min": None,
            "Tier3Max": None,
            "Tier3Price": None,
            "IsRequired": False,
        },
        {
            "ProductCode": "TELLER-ONLINE",
            "Name": "Teller Online",
            "Description": "Customer-facing web payment portal",
            "Category": "Optional",
            "PricingModel": "Flat",
            "Tier1Min": 1,
            "Tier1Max": 999999,
            "Tier1Price": Decimal("300.00"),
            "Tier2Min": None,
            "Tier2Max": None,
            "Tier2Price": None,
            "Tier3Min": None,
            "Tier3Max": None,
            "Tier3Price": None,
            "IsRequired": False,
        },
    ]

    saas_map = {}
    for saas_data in saas_products_data:
        saas = SaaSProduct(
            PricingVersionId=pricing_version_id,
            **saas_data,
            IsActive=True,
            SortOrder=0,
        )
        session.add(saas)
        session.flush()
        saas_map[saas.ProductCode] = saas.Id
        print(f"  ✅ Created SaaS Product: {saas.ProductCode} - {saas.Name}")

    print(f"✅ Created {len(saas_products_data)} SaaS Products")
    return saas_map


def seed_application_modules(
    session: Session,
    pricing_version_id: UUID,
    saas_map: dict[str, UUID],
) -> None:
    """Create application modules from modules_seed.py."""
    modules_data = get_module_seed_data()

    for module_data in modules_data:
        # Map SaaS product codes to IDs if applicable
        saas_product_id = None
        if "SelectionRules" in module_data and "SaaSProducts" in module_data["SelectionRules"]:
            saas_products = module_data["SelectionRules"]["SaaSProducts"]
            if saas_products and len(saas_products) > 0:
                product_code = saas_products[0].get("ProductCode")
                if product_code and product_code in saas_map:
                    saas_product_id = saas_map[product_code]

        module = ApplicationModule(
            PricingVersionId=pricing_version_id,
            ModuleCode=module_data["ModuleCode"],
            ModuleName=module_data["ModuleName"],
            Description=module_data.get("Description"),
            SaaSProductId=saas_product_id,
            SubParameters=module_data.get("SubParameters"),
            SelectionRules=module_data.get("SelectionRules"),
            IsActive=True,
            SortOrder=module_data.get("SortOrder", 0),
        )
        session.add(module)
        print(f"  ✅ Created Module: {module.ModuleCode} - {module.ModuleName}")

    session.flush()
    print(f"✅ Created {len(modules_data)} Application Modules")


def seed_travel_zones(session: Session, pricing_version_id: UUID) -> None:
    """Create travel zones."""
    zones_data = [
        {
            "ZoneCode": "LOCAL",
            "Name": "Local",
            "Description": "Same city/metro area (no travel required)",
            "MileageRate": Decimal("0.65"),
            "DailyRate": Decimal("0.00"),
            "HourlyRate": Decimal("115.00"),
            "OnsiteDaysIncluded": 0,
        },
        {
            "ZoneCode": "ZONE-2",
            "Name": "Zone 2 - Regional",
            "Description": "Regional (1-2 hour flight)",
            "MileageRate": Decimal("0.65"),
            "DailyRate": Decimal("920.00"),
            "HourlyRate": Decimal("143.75"),
            "OnsiteDaysIncluded": 0,
        },
        {
            "ZoneCode": "ZONE-3",
            "Name": "Zone 3 - Cross-Country",
            "Description": "Cross-country (2-4 hour flight)",
            "MileageRate": Decimal("0.65"),
            "DailyRate": Decimal("1150.00"),
            "HourlyRate": Decimal("172.50"),
            "OnsiteDaysIncluded": 0,
        },
        {
            "ZoneCode": "REMOTE",
            "Name": "Remote/International",
            "Description": "International or very remote locations",
            "MileageRate": Decimal("0.65"),
            "DailyRate": Decimal("1610.00"),
            "HourlyRate": Decimal("201.25"),
            "OnsiteDaysIncluded": 0,
        },
    ]

    for zone_data in zones_data:
        zone = TravelZone(
            PricingVersionId=pricing_version_id, **zone_data, IsActive=True, SortOrder=0
        )
        session.add(zone)
        print(f"  ✅ Created Travel Zone: {zone.Name}")

    session.flush()
    print(f"✅ Created {len(zones_data)} Travel Zones")


def seed_mature_integrations(session: Session) -> None:
    """Create mature integrations list."""
    integrations_data = [
        {
            "IntegrationCode": "TYLER-MUNIS",
            "SystemName": "Tyler Munis",
            "Vendor": "Tyler Technologies",
            "Comments": "ERP and financial management system",
        },
        {
            "IntegrationCode": "TYLER-ENERGOV",
            "SystemName": "Tyler EnerGov",
            "Vendor": "Tyler Technologies",
            "Comments": "Land management and permit tracking",
        },
        {
            "IntegrationCode": "INFOR-LAWSON",
            "SystemName": "Infor Lawson",
            "Vendor": "Infor",
            "Comments": "Human capital management and financials",
        },
        {
            "IntegrationCode": "ORACLE-EBS",
            "SystemName": "Oracle E-Business Suite",
            "Vendor": "Oracle",
            "Comments": "ERP and business applications",
        },
        {
            "IntegrationCode": "SAP-ERP",
            "SystemName": "SAP ERP",
            "Vendor": "SAP",
            "Comments": "Enterprise resource planning system",
        },
    ]

    for integration_data in integrations_data:
        integration = MatureIntegration(**integration_data, IsActive=True)
        session.add(integration)
        print(f"  ✅ Created Mature Integration: {integration.SystemName}")

    session.flush()
    print(f"✅ Created {len(integrations_data)} Mature Integrations")


def seed_referrers(session: Session) -> None:
    """Create sample referrers."""
    referrers_data = [
        {"ReferrerName": "Tyler Technologies", "StandardRate": Decimal("10.00"), "IsActive": True},
        {"ReferrerName": "Direct Outreach", "StandardRate": Decimal("0.00"), "IsActive": True},
        {
            "ReferrerName": "Conference/Trade Show",
            "StandardRate": Decimal("0.00"),
            "IsActive": True,
        },
        {
            "ReferrerName": "Existing Client Referral",
            "StandardRate": Decimal("5.00"),
            "IsActive": True,
        },
    ]

    for referrer_data in referrers_data:
        referrer = Referrer(**referrer_data)
        session.add(referrer)
        print(f"  ✅ Created Referrer: {referrer.ReferrerName}")

    session.flush()
    print(f"✅ Created {len(referrers_data)} Referrers")


def seed_text_snippets(session: Session, pricing_version_id: UUID) -> None:
    """Create text snippets for quote generation."""
    snippets_data = [
        {
            "SnippetKey": "WARRANTY_STANDARD",
            "SnippetLabel": "Standard Warranty",
            "Content": "All services include a 90-day warranty period from go-live date. "
            "Any defects or issues discovered within the warranty period will be resolved at no additional charge.",
            "Category": "Warranty",
        },
        {
            "SnippetKey": "ESCALATION_PATH",
            "SnippetLabel": "Escalation Path",
            "Content": "Project escalation path: Project Manager → Director of Implementation → VP of Operations",
            "Category": "Support",
        },
        {
            "SnippetKey": "PAYMENT_TERMS",
            "SnippetLabel": "Payment Terms",
            "Content": "Payment terms: Net 30 days. 50% due upon contract signing, 25% at UAT completion, 25% at go-live.",
            "Category": "Financial",
        },
    ]

    for snippet_data in snippets_data:
        snippet = TextSnippet(PricingVersionId=pricing_version_id, **snippet_data, IsActive=True)
        session.add(snippet)
        print(f"  ✅ Created Text Snippet: {snippet.SnippetKey}")

    session.flush()
    print(f"✅ Created {len(snippets_data)} Text Snippets")


def seed_all() -> None:
    """Main seeding function - populates all tables."""
    print("\n" + "=" * 60)
    print("🌱 Starting Database Seeding for v1.9 Schema")
    print("=" * 60 + "\n")

    session = SessionLocal()
    try:
        # Check if already seeded
        existing = session.query(PricingVersion).first()
        if existing:
            print("⚠️  Database already contains data. Skipping seed.")
            return

        # Seed in order (respecting foreign key dependencies)
        pricing_version_id = seed_pricing_version(session)
        sku_map = seed_skus(session, pricing_version_id)
        saas_map = seed_saas_products(session, pricing_version_id)
        seed_application_modules(session, pricing_version_id, saas_map)
        seed_travel_zones(session, pricing_version_id)
        seed_mature_integrations(session)
        seed_referrers(session)
        seed_text_snippets(session, pricing_version_id)

        # Seed configuration-driven architecture data
        seed_configuration_all(session, pricing_version_id)

        # Commit all changes
        session.commit()
        print("\n" + "=" * 60)
        print("✅ Database Seeding Complete!")
        print("=" * 60)
        print("\n📊 Summary:")
        print("  - 1 Pricing Version (v1.0)")
        print(f"  - {len(sku_map)} SKU Definitions")
        print(f"  - {len(saas_map)} SaaS Products")
        print("  - 6 Application Modules")
        print("  - 4 Travel Zones")
        print("  - 5 Mature Integrations")
        print("  - 4 Referrers")
        print("  - 3 Text Snippets")
        print()

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error during seeding: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_all()
