"""Standalone script to seed configuration-driven architecture data."""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from app.core.deps import SessionLocal  # noqa: E402
from app.models import PricingVersion  # noqa: E402
from app.seed_data.configuration_seed import seed_configuration_all  # noqa: E402


def main() -> None:
    """Seed configuration-driven data for existing database."""
    print("\n" + "=" * 60)
    print("🌱 Seeding Configuration-Driven Architecture Data")
    print("=" * 60 + "\n")

    session = SessionLocal()
    try:
        # Get current pricing version
        pricing_version = (
            session.query(PricingVersion).filter(PricingVersion.IsCurrent.is_(True)).first()
        )

        if not pricing_version:
            print("❌ No current pricing version found. Please run main seeder first.")
            return

        print(f"📦 Using Pricing Version: {pricing_version.VersionNumber}")
        print(f"   ID: {pricing_version.Id}\n")

        # Seed configuration data
        seed_configuration_all(session, pricing_version.Id)

        # Commit changes
        session.commit()

        print("\n" + "=" * 60)
        print("✅ Configuration Data Seeding Complete!")
        print("=" * 60)
        print("\n📊 Summary:")
        print("  - 2 Integration Types (Bi-Directional, Payment Import)")
        print("  - 3 Online Form Tiers (Simple, Medium, Complex)")
        print("  - 6 Mature Integrations (Tyler Munis, Springbrook, etc.)")
        print("  - Updated SaaS Products with configuration")
        print()

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error during seeding: {e}")
        import traceback

        traceback.print_exc()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
