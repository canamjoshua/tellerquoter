"""Pydantic schemas for API request/response models."""

from app.schemas.comparison import (
    ComparisonItem,
    VersionComparison,
)
from app.schemas.pricing import (
    PricingVersionCreate,
    PricingVersionResponse,
    PricingVersionUpdate,
)
from app.schemas.quote import (
    QuoteCreate,
    QuoteResponse,
    QuoteUpdate,
    QuoteVersionCreate,
    QuoteVersionResponse,
    QuoteVersionUpdate,
    QuoteWithVersionsResponse,
)
from app.schemas.referrer import (
    ReferrerCreate,
    ReferrerResponse,
    ReferrerUpdate,
)
from app.schemas.saas import (
    SaaSProductCreate,
    SaaSProductResponse,
    SaaSProductUpdate,
)
from app.schemas.sku import (
    SKUDefinitionCreate,
    SKUDefinitionResponse,
    SKUDefinitionUpdate,
)
from app.schemas.text_snippet import (
    TextSnippetCreate,
    TextSnippetResponse,
    TextSnippetUpdate,
)
from app.schemas.travel import (
    TravelZoneCreate,
    TravelZoneResponse,
    TravelZoneUpdate,
)

__all__ = [
    "PricingVersionCreate",
    "PricingVersionResponse",
    "PricingVersionUpdate",
    "SaaSProductCreate",
    "SaaSProductResponse",
    "SaaSProductUpdate",
    "SKUDefinitionCreate",
    "SKUDefinitionResponse",
    "SKUDefinitionUpdate",
    "TravelZoneCreate",
    "TravelZoneResponse",
    "TravelZoneUpdate",
    "ReferrerCreate",
    "ReferrerResponse",
    "ReferrerUpdate",
    "TextSnippetCreate",
    "TextSnippetResponse",
    "TextSnippetUpdate",
    "ComparisonItem",
    "VersionComparison",
    "QuoteCreate",
    "QuoteResponse",
    "QuoteUpdate",
    "QuoteVersionCreate",
    "QuoteVersionResponse",
    "QuoteVersionUpdate",
    "QuoteWithVersionsResponse",
]
