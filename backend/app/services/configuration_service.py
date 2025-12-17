"""Configuration service for loading and caching pricing configuration.

This service loads configuration data from the database and provides
efficient access to it. Configuration is cached per pricing version
for performance.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ApplicationModule,
    IntegrationType,
    MatureIntegration,
    PricingVersion,
    SaaSProduct,
    SKUDefinition,
)


class ConfigurationService:
    """Service for reading and caching configuration from database.

    This service provides efficient access to pricing configuration
    with caching to minimize database queries.
    """

    def __init__(self, db: Session, pricing_version_id: UUID | None = None):
        """Initialize configuration service.

        Args:
            db: Database session
            pricing_version_id: Specific pricing version to use, or None for current
        """
        self.db = db
        self._pricing_version_id = pricing_version_id
        self._cache: dict[str, Any] = {}

    def get_pricing_version_id(self) -> UUID:
        """Get the pricing version ID to use for configuration.

        Returns:
            UUID of pricing version (current version if not specified)

        Raises:
            ValueError: If no current pricing version exists
        """
        if self._pricing_version_id is not None:
            return self._pricing_version_id

        # Check cache
        if "pricing_version_id" in self._cache:
            return self._cache["pricing_version_id"]  # type: ignore[no-any-return]

        # Load current pricing version
        result = self.db.execute(
            select(PricingVersion.Id).where(PricingVersion.IsCurrent == True).limit(1)  # noqa: E712
        )
        version_id = result.scalar_one_or_none()

        if not version_id:
            raise ValueError("No current pricing version found")

        self._cache["pricing_version_id"] = version_id
        return version_id

    def get_saas_product(self, product_code: str) -> SaaSProduct | None:
        """Get SaaS product by product code.

        Args:
            product_code: Product code to look up

        Returns:
            SaaSProduct instance or None if not found
        """
        cache_key = f"saas_product_{product_code}"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        version_id = self.get_pricing_version_id()
        result = self.db.execute(
            select(SaaSProduct)
            .where(SaaSProduct.PricingVersionId == version_id)
            .where(SaaSProduct.ProductCode == product_code)
            .where(SaaSProduct.IsActive == True)  # noqa: E712
        )
        product = result.scalar_one_or_none()

        self._cache[cache_key] = product
        return product

    def get_all_saas_products(self) -> list[SaaSProduct]:
        """Get all active SaaS products.

        Returns:
            List of SaaSProduct instances
        """
        cache_key = "all_saas_products"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        version_id = self.get_pricing_version_id()
        result = self.db.execute(
            select(SaaSProduct)
            .where(SaaSProduct.PricingVersionId == version_id)
            .where(SaaSProduct.IsActive == True)  # noqa: E712
            .order_by(SaaSProduct.SortOrder)
        )
        products = list(result.scalars().all())

        self._cache[cache_key] = products
        return products

    def get_all_application_modules(self) -> list[ApplicationModule]:
        """Get all active application modules.

        Returns:
            List of ApplicationModule instances
        """
        cache_key = "all_app_modules"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        version_id = self.get_pricing_version_id()
        result = self.db.execute(
            select(ApplicationModule)
            .where(ApplicationModule.PricingVersionId == version_id)
            .where(ApplicationModule.IsActive == True)  # noqa: E712
            .order_by(ApplicationModule.SortOrder)
        )
        modules = list(result.scalars().all())

        self._cache[cache_key] = modules
        return modules

    def get_integration_type(self, type_code: str) -> IntegrationType | None:
        """Get integration type by code.

        Args:
            type_code: Type code to look up (e.g., 'BIDIRECTIONAL', 'PAYMENT_IMPORT')

        Returns:
            IntegrationType instance or None if not found
        """
        cache_key = f"integration_type_{type_code}"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        version_id = self.get_pricing_version_id()
        result = self.db.execute(
            select(IntegrationType)
            .where(IntegrationType.PricingVersionId == version_id)
            .where(IntegrationType.TypeCode == type_code)
            .where(IntegrationType.IsActive == True)  # noqa: E712
        )
        int_type = result.scalar_one_or_none()

        self._cache[cache_key] = int_type
        return int_type

    def get_all_integration_types(self) -> list[IntegrationType]:
        """Get all active integration types.

        Returns:
            List of IntegrationType instances
        """
        cache_key = "all_integration_types"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        version_id = self.get_pricing_version_id()
        result = self.db.execute(
            select(IntegrationType)
            .where(IntegrationType.PricingVersionId == version_id)
            .where(IntegrationType.IsActive == True)  # noqa: E712
            .order_by(IntegrationType.SortOrder)
        )
        int_types = list(result.scalars().all())

        self._cache[cache_key] = int_types
        return int_types

    def get_mature_integration(self, system_name: str) -> MatureIntegration | None:
        """Get mature integration by system name.

        Args:
            system_name: System name to look up

        Returns:
            MatureIntegration instance or None if not found
        """
        cache_key = f"mature_integration_{system_name}"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        result = self.db.execute(
            select(MatureIntegration)
            .where(MatureIntegration.SystemName == system_name)
            .where(MatureIntegration.IsActive == True)  # noqa: E712
        )
        integration = result.scalar_one_or_none()

        self._cache[cache_key] = integration
        return integration

    def get_all_mature_integrations(self) -> list[MatureIntegration]:
        """Get all active mature integrations.

        Returns:
            List of MatureIntegration instances
        """
        cache_key = "all_mature_integrations"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        result = self.db.execute(
            select(MatureIntegration)
            .where(MatureIntegration.IsActive == True)  # noqa: E712
            .order_by(MatureIntegration.SystemName)
        )
        integrations = list(result.scalars().all())

        self._cache[cache_key] = integrations
        return integrations

    def get_sku(self, sku_code: str) -> SKUDefinition | None:
        """Get SKU definition by code.

        Args:
            sku_code: SKU code to look up

        Returns:
            SKUDefinition instance or None if not found
        """
        cache_key = f"sku_{sku_code}"
        if cache_key in self._cache:
            return self._cache[cache_key]  # type: ignore[no-any-return]

        version_id = self.get_pricing_version_id()
        result = self.db.execute(
            select(SKUDefinition)
            .where(SKUDefinition.PricingVersionId == version_id)
            .where(SKUDefinition.SKUCode == sku_code)
            .where(SKUDefinition.IsActive == True)  # noqa: E712
        )
        sku = result.scalar_one_or_none()

        self._cache[cache_key] = sku
        return sku

    def clear_cache(self) -> None:
        """Clear the configuration cache.

        Useful if configuration has been updated during the session.
        """
        self._cache.clear()
