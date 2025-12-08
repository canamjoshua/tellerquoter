"""Schemas for pricing version comparison."""

from typing import Any

from pydantic import BaseModel

from app.schemas.pricing import PricingVersionResponse
from app.schemas.referrer import ReferrerResponse
from app.schemas.saas import SaaSProductResponse
from app.schemas.sku import SKUDefinitionResponse
from app.schemas.text_snippet import TextSnippetResponse
from app.schemas.travel import TravelZoneResponse


class ComparisonItem(BaseModel):
    """A single comparison item showing what changed."""

    status: str  # "added", "removed", "modified", "unchanged"
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None


class VersionComparison(BaseModel):
    """Complete comparison between two pricing versions."""

    version1: PricingVersionResponse
    version2: PricingVersionResponse

    # SKU comparisons
    skus_added: list[SKUDefinitionResponse] = []
    skus_removed: list[SKUDefinitionResponse] = []
    skus_modified: list[dict[str, Any]] = []  # {sku_code, old, new, changed_fields}
    skus_unchanged: list[SKUDefinitionResponse] = []

    # SaaS product comparisons
    saas_added: list[SaaSProductResponse] = []
    saas_removed: list[SaaSProductResponse] = []
    saas_modified: list[dict[str, Any]] = []
    saas_unchanged: list[SaaSProductResponse] = []

    # Travel zone comparisons
    zones_added: list[TravelZoneResponse] = []
    zones_removed: list[TravelZoneResponse] = []
    zones_modified: list[dict[str, Any]] = []
    zones_unchanged: list[TravelZoneResponse] = []

    # Referrer comparisons
    referrers_added: list[ReferrerResponse] = []
    referrers_removed: list[ReferrerResponse] = []
    referrers_modified: list[dict[str, Any]] = []
    referrers_unchanged: list[ReferrerResponse] = []

    # Text snippet comparisons
    snippets_added: list[TextSnippetResponse] = []
    snippets_removed: list[TextSnippetResponse] = []
    snippets_modified: list[dict[str, Any]] = []
    snippets_unchanged: list[TextSnippetResponse] = []

    # Summary counts
    total_changes: int = 0
    has_differences: bool = False
