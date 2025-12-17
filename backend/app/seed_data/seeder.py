"""Comprehensive seeder for v5.1 database schema (updated from v1.9)."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.deps import SessionLocal
from app.models import (
    ApplicationModule,
    MatureIntegration,
    PricingRule,
    PricingVersion,
    Referrer,
    SaaSProduct,
    SKUDefinition,
    TextSnippet,
    TravelZone,
)
from app.seed_data.configuration_seed import seed_configuration_all
from app.seed_data.modules_seed import get_module_seed_data
from app.seed_data.v5_1_skus import (
    get_v5_1_pricing_rules,
    get_v5_1_saas_products,
    get_v5_1_skus,
    get_v5_1_travel_zones,
)


def seed_pricing_version(session: Session) -> UUID:
    """Create initial pricing version v5.1."""
    pricing_version = PricingVersion(
        VersionNumber="5.1",
        Description="Pricing version based on v5.1 Internal SKU Reference Key (December 2025)",
        EffectiveDate=date(2025, 12, 1),
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
    """Create all SKUs from v5.1 Internal SKU Reference Key."""
    skus_data = get_v5_1_skus()

    sku_map = {}
    for sku_data in skus_data:
        # Make a copy to avoid modifying the original
        data = sku_data.copy()

        # Extract fields that need special handling
        is_repeatable = data.pop("IsRepeatable", False)
        requires_travel_zone = data.pop("RequiresTravelZone", False)
        earmarked_status = data.pop("EarmarkedStatus", False)

        # Remove fields not in the SKUDefinition model
        data.pop("TypicalDuration", None)
        data.pop("QuickbooksCategory", None)
        data.pop("AcceptanceCriteria", None)
        data.pop("Deliverables", None)

        sku = SKUDefinition(
            PricingVersionId=pricing_version_id,
            **data,
            RequiresQuantity=is_repeatable,
            RequiresTravelZone=requires_travel_zone,
            RequiresConfiguration=False,
            IsActive=True,
            SortOrder=0,
            EarmarkedStatus=earmarked_status,
        )
        session.add(sku)
        session.flush()
        sku_map[sku.SKUCode] = sku.Id
        print(f"  ✅ Created SKU: {sku.SKUCode} - {sku.Name}")

    print(f"✅ Created {len(skus_data)} SKUs")
    return sku_map


def seed_saas_products(session: Session, pricing_version_id: UUID) -> dict[str, UUID]:
    """Create SaaS products from v5.1 pricing."""
    saas_products_data = get_v5_1_saas_products()

    saas_map = {}
    sort_order = 0
    for saas_data in saas_products_data:
        # Make a copy to avoid modifying the original
        data = saas_data.copy()

        # Set default values for tiered fields if not present
        data.setdefault("Tier1Min", None)
        data.setdefault("Tier1Max", None)
        data.setdefault("Tier2Min", None)
        data.setdefault("Tier2Max", None)
        data.setdefault("Tier2Price", None)
        data.setdefault("Tier3Min", None)
        data.setdefault("Tier3Max", None)
        data.setdefault("Tier3Price", None)

        saas = SaaSProduct(
            PricingVersionId=pricing_version_id,
            **data,
            IsActive=True,
            SortOrder=sort_order,
        )
        session.add(saas)
        session.flush()
        saas_map[saas.ProductCode] = saas.Id
        print(f"  ✅ Created SaaS Product: {saas.ProductCode} - {saas.Name}")
        sort_order += 1

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
    """Create travel zones from v5.1 with full rate breakdown."""
    zones_data = get_v5_1_travel_zones()

    for zone_data in zones_data:
        # Make a copy to avoid modifying the original
        data = zone_data.copy()
        sort_order = data.pop("SortOrder", 0)

        # Set default values for legacy fields (keeping backward compatibility)
        data.setdefault("MileageRate", Decimal("0.65"))
        data.setdefault("DailyRate", Decimal("0.00"))
        data.setdefault("HourlyRate", Decimal("115.00"))
        data.setdefault("OnsiteDaysIncluded", 0)

        zone = TravelZone(
            PricingVersionId=pricing_version_id,
            **data,
            IsActive=True,
            SortOrder=sort_order,
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


def seed_pricing_rules(session: Session, pricing_version_id: UUID) -> None:
    """Create pricing rules for configuration-driven calculations."""
    rules_data = get_v5_1_pricing_rules()

    for idx, rule_data in enumerate(rules_data):
        rule = PricingRule(
            PricingVersionId=pricing_version_id,
            RuleCode=rule_data["RuleCode"],
            RuleName=rule_data["RuleName"],
            Description=rule_data.get("Description"),
            RuleType=rule_data["RuleType"],
            Configuration=rule_data["Configuration"],
            IsActive=True,
            SortOrder=idx,
        )
        session.add(rule)
        print(f"  ✅ Created Pricing Rule: {rule.RuleCode} - {rule.RuleName}")

    session.flush()
    print(f"✅ Created {len(rules_data)} Pricing Rules")


def seed_all() -> None:
    """Main seeding function - populates all tables."""
    print("\n" + "=" * 60)
    print("🌱 Starting Database Seeding for v5.1 Schema")
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
        seed_pricing_rules(session, pricing_version_id)

        # Seed configuration-driven architecture data
        seed_configuration_all(session, pricing_version_id)

        # Commit all changes
        session.commit()
        print("\n" + "=" * 60)
        print("✅ Database Seeding Complete!")
        print("=" * 60)
        print("\n📊 Summary:")
        print("  - 1 Pricing Version (v5.1)")
        print(f"  - {len(sku_map)} SKU Definitions")
        print(f"  - {len(saas_map)} SaaS Products")
        print("  - 6 Application Modules")
        print("  - 6 Travel Zones (with full rate breakdown)")
        print("  - 5 Mature Integrations")
        print("  - 4 Referrers")
        print("  - 3 Text Snippets")
        print("  - 6 Pricing Rules")
        print()

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error during seeding: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_all()
