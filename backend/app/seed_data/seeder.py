"""
Data Seeder for Teller Quoting System.

This module provides functionality to seed the database with initial/test data.
Can be used to:
- Initialize a fresh database with production-ready data
- Reset database to known good state for testing
- Load specific data sets for different scenarios

Usage:
    python -m app.seed_data.seeder --reset-all  # Clear and reseed all data
    python -m app.seed_data.seeder --pricing-only  # Seed pricing data only
    python -m app.seed_data.seeder --referrers-only  # Seed referrers only
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import argparse
import logging
from typing import Any, cast

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.pricing import PricingVersion
from app.models.referrer import Referrer
from app.models.saas import SaaSProduct
from app.models.sku import SKUDefinition
from app.models.text_snippet import TextSnippet
from app.models.travel import TravelZone
from app.seed_data.pricing_v1_7 import (
    DEPRECATED_SKUS,
    PRICING_VERSION,
    REFERRERS,
    SAAS_PRODUCTS,
    SKU_DEFINITIONS,
    TEXT_SNIPPETS,
    TRAVEL_ZONES,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class DataSeeder:
    """Handles database seeding operations."""

    def __init__(self, db_url: str | None = None):
        """Initialize seeder with database connection."""
        self.db_url = db_url or str(settings.database_url)
        self.engine = create_engine(self.db_url)
        logger.info(f"Initialized seeder with database: {self.db_url}")

    def clear_all_data(self) -> None:
        """Clear all data from the database (keeps schema)."""
        logger.warning("Clearing all data from database...")
        with Session(self.engine) as session:
            try:
                # Order matters due to foreign key constraints
                session.execute(text('DELETE FROM "TextSnippets"'))
                session.execute(text('DELETE FROM "SaaSProducts"'))
                session.execute(text('DELETE FROM "TravelZones"'))
                session.execute(text('DELETE FROM "SKUDefinitions"'))
                session.execute(text('DELETE FROM "PricingVersions"'))
                session.execute(text('DELETE FROM "Referrers"'))
                session.commit()
                logger.info("✅ All data cleared successfully")
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error clearing data: {e}")
                raise

    def seed_pricing_version(self) -> str:
        """Seed the pricing version. Returns the version ID."""
        logger.info("Seeding pricing version...")
        with Session(self.engine) as session:
            try:
                # Check if version already exists
                existing = (
                    session.query(PricingVersion)
                    .filter_by(VersionNumber=PRICING_VERSION["VersionNumber"])
                    .first()
                )
                if existing:
                    logger.info(
                        f"✓ Pricing version {PRICING_VERSION['VersionNumber']} already exists"
                    )
                    return str(existing.Id)

                # Create new version
                version = PricingVersion(**PRICING_VERSION)
                session.add(version)
                session.commit()
                session.refresh(version)
                logger.info(
                    f"✅ Created pricing version: {version.VersionNumber} (ID: {version.Id})"
                )
                return str(version.Id)
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding pricing version: {e}")
                raise

    def seed_skus(self, pricing_version_id: str) -> None:
        """Seed SKU definitions."""
        logger.info(f"Seeding {len(SKU_DEFINITIONS)} active SKUs...")
        with Session(self.engine) as session:
            try:
                created = 0
                skipped = 0

                for sku_data in SKU_DEFINITIONS:
                    # Type assertion for mypy
                    sku_dict = cast(dict[str, Any], sku_data)
                    # Check if SKU already exists
                    existing = (
                        session.query(SKUDefinition)
                        .filter_by(
                            PricingVersionId=pricing_version_id,
                            SKUCode=sku_dict["SKUCode"],
                        )
                        .first()
                    )
                    if existing:
                        logger.debug(f"  ✓ SKU {sku_dict['SKUCode']} already exists")
                        skipped += 1
                        continue

                    # Create new SKU
                    sku = SKUDefinition(PricingVersionId=pricing_version_id, **sku_dict)
                    session.add(sku)
                    created += 1
                    logger.debug(
                        f"  + Created SKU: {sku.SKUCode} - {sku.Name} "
                        f"({'⚠️ EARMARKED' if sku.EarmarkedStatus else '✓'})"
                    )

                session.commit()
                logger.info(f"✅ SKUs seeded: {created} created, {skipped} already existed")
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding SKUs: {e}")
                raise

    def seed_deprecated_skus(self, pricing_version_id: str) -> None:
        """Seed deprecated SKUs for historical quote support."""
        logger.info(f"Seeding {len(DEPRECATED_SKUS)} deprecated SKUs...")
        with Session(self.engine) as session:
            try:
                created = 0
                skipped = 0

                for sku_data in DEPRECATED_SKUS:
                    # Type assertion for mypy
                    sku_dict = cast(dict[str, Any], sku_data)
                    # Check if SKU already exists
                    existing = (
                        session.query(SKUDefinition)
                        .filter_by(
                            PricingVersionId=pricing_version_id,
                            SKUCode=sku_dict["SKUCode"],
                        )
                        .first()
                    )
                    if existing:
                        logger.debug(f"  ✓ Deprecated SKU {sku_dict['SKUCode']} already exists")
                        skipped += 1
                        continue

                    # Create deprecated SKU
                    sku = SKUDefinition(PricingVersionId=pricing_version_id, **sku_dict)
                    session.add(sku)
                    created += 1
                    logger.debug(f"  + Created deprecated SKU: {sku.SKUCode} - {sku.Name}")

                session.commit()
                logger.info(
                    f"✅ Deprecated SKUs seeded: {created} created, {skipped} already existed"
                )
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding deprecated SKUs: {e}")
                raise

    def seed_referrers(self) -> None:
        """Seed referrers (global, not versioned)."""
        logger.info(f"Seeding {len(REFERRERS)} referrers...")
        with Session(self.engine) as session:
            try:
                created = 0
                skipped = 0

                for ref_data in REFERRERS:
                    # Type assertion for mypy
                    ref_dict = cast(dict[str, Any], ref_data)
                    # Check if referrer already exists
                    existing = (
                        session.query(Referrer)
                        .filter_by(ReferrerName=ref_dict["ReferrerName"])
                        .first()
                    )
                    if existing:
                        logger.debug(f"  ✓ Referrer {ref_dict['ReferrerName']} already exists")
                        skipped += 1
                        continue

                    # Create new referrer
                    referrer = Referrer(**ref_dict)
                    session.add(referrer)
                    created += 1
                    logger.debug(
                        f"  + Created referrer: {referrer.ReferrerName} ({referrer.StandardRate}%)"
                    )

                session.commit()
                logger.info(f"✅ Referrers seeded: {created} created, {skipped} already existed")
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding referrers: {e}")
                raise

    def seed_travel_zones(self, pricing_version_id: str) -> None:
        """Seed travel zones."""
        logger.info(f"Seeding {len(TRAVEL_ZONES)} travel zones...")
        with Session(self.engine) as session:
            try:
                created = 0
                skipped = 0

                for zone_data in TRAVEL_ZONES:
                    # Type assertion for mypy
                    zone_dict = cast(dict[str, Any], zone_data)
                    # Check if zone already exists
                    existing = (
                        session.query(TravelZone)
                        .filter_by(
                            PricingVersionId=pricing_version_id,
                            ZoneCode=zone_dict["ZoneCode"],
                        )
                        .first()
                    )
                    if existing:
                        logger.debug(f"  ✓ Travel zone {zone_dict['ZoneCode']} already exists")
                        skipped += 1
                        continue

                    # Create new zone
                    zone = TravelZone(PricingVersionId=pricing_version_id, **zone_dict)
                    session.add(zone)
                    created += 1
                    logger.debug(
                        f"  + Created zone: {zone.ZoneCode} - {zone.Name} (${zone.DailyRate}/day)"
                    )

                session.commit()
                logger.info(f"✅ Travel zones seeded: {created} created, {skipped} already existed")
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding travel zones: {e}")
                raise

    def seed_saas_products(self, pricing_version_id: str) -> None:
        """Seed SaaS products."""
        logger.info(f"Seeding {len(SAAS_PRODUCTS)} SaaS products...")
        with Session(self.engine) as session:
            try:
                created = 0
                skipped = 0

                for product_data in SAAS_PRODUCTS:
                    # Type assertion for mypy
                    product_dict = cast(dict[str, Any], product_data)
                    # Check if product already exists
                    existing = (
                        session.query(SaaSProduct)
                        .filter_by(
                            PricingVersionId=pricing_version_id,
                            ProductCode=product_dict["ProductCode"],
                        )
                        .first()
                    )
                    if existing:
                        logger.debug(
                            f"  ✓ SaaS product {product_dict['ProductCode']} already exists"
                        )
                        skipped += 1
                        continue

                    # Create new product
                    product = SaaSProduct(PricingVersionId=pricing_version_id, **product_dict)
                    session.add(product)
                    created += 1
                    logger.debug(
                        f"  + Created product: {product.ProductCode} - {product.Name} "
                        f"({'REQUIRED' if product.IsRequired else 'Optional'})"
                    )

                session.commit()
                logger.info(
                    f"✅ SaaS products seeded: {created} created, {skipped} already existed"
                )
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding SaaS products: {e}")
                raise

    def seed_text_snippets(self, pricing_version_id: str) -> None:
        """Seed text snippets."""
        logger.info(f"Seeding {len(TEXT_SNIPPETS)} text snippets...")
        with Session(self.engine) as session:
            try:
                created = 0
                skipped = 0

                for snippet_data in TEXT_SNIPPETS:
                    # Type assertion for mypy
                    snippet_dict = cast(dict[str, Any], snippet_data)
                    # Check if snippet already exists
                    existing = (
                        session.query(TextSnippet)
                        .filter_by(
                            PricingVersionId=pricing_version_id,
                            SnippetKey=snippet_dict["SnippetKey"],
                        )
                        .first()
                    )
                    if existing:
                        logger.debug(
                            f"  ✓ Text snippet {snippet_dict['SnippetKey']} already exists"
                        )
                        skipped += 1
                        continue

                    # Create new snippet
                    snippet = TextSnippet(PricingVersionId=pricing_version_id, **snippet_dict)
                    session.add(snippet)
                    created += 1
                    logger.debug(
                        f"  + Created snippet: {snippet.SnippetKey} - {snippet.SnippetLabel}"
                    )

                session.commit()
                logger.info(
                    f"✅ Text snippets seeded: {created} created, {skipped} already existed"
                )
            except Exception as e:
                session.rollback()
                logger.error(f"❌ Error seeding text snippets: {e}")
                raise

    def seed_all(self, clear_first: bool = False) -> None:
        """Seed all data in the correct order."""
        logger.info("=" * 70)
        logger.info("TELLER QUOTING SYSTEM - DATA SEEDER")
        logger.info("=" * 70)

        if clear_first:
            self.clear_all_data()

        # Seed in dependency order
        version_id = self.seed_pricing_version()
        self.seed_referrers()  # Global, not versioned
        self.seed_skus(version_id)
        self.seed_deprecated_skus(version_id)
        self.seed_travel_zones(version_id)
        self.seed_saas_products(version_id)
        self.seed_text_snippets(version_id)

        logger.info("=" * 70)
        logger.info("✅ ALL DATA SEEDED SUCCESSFULLY!")
        logger.info("=" * 70)
        logger.info(f"Pricing Version: {PRICING_VERSION['VersionNumber']}")
        logger.info(f"Active SKUs: {len(SKU_DEFINITIONS)}")
        logger.info(f"Deprecated SKUs: {len(DEPRECATED_SKUS)}")
        logger.info(f"Referrers: {len(REFERRERS)}")
        logger.info(f"Travel Zones: {len(TRAVEL_ZONES)}")
        logger.info(f"SaaS Products: {len(SAAS_PRODUCTS)}")
        logger.info(f"Text Snippets: {len(TEXT_SNIPPETS)}")
        logger.info("=" * 70)


def main() -> None:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Seed the Teller Quoting System database with initial data"
    )
    parser.add_argument(
        "--reset-all",
        action="store_true",
        help="Clear all existing data before seeding",
    )
    parser.add_argument("--pricing-only", action="store_true", help="Seed pricing data only")
    parser.add_argument("--referrers-only", action="store_true", help="Seed referrers only")
    parser.add_argument("--db-url", type=str, help="Database URL (overrides settings)")

    args = parser.parse_args()

    try:
        seeder = DataSeeder(db_url=args.db_url)

        if args.pricing_only:
            version_id = seeder.seed_pricing_version()
            seeder.seed_skus(version_id)
            seeder.seed_deprecated_skus(version_id)
            seeder.seed_travel_zones(version_id)
            seeder.seed_saas_products(version_id)
            seeder.seed_text_snippets(version_id)
        elif args.referrers_only:
            seeder.seed_referrers()
        else:
            # Seed all data
            seeder.seed_all(clear_first=args.reset_all)

    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
