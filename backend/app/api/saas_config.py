"""API endpoints for configuration-driven SaaS product configuration.

This module provides the new configuration-driven API for SaaS products,
replacing the old hardcoded quote-config/preview/saas-products endpoint.
"""

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.services.saas_configuration_service import SaaSConfigurationService

router = APIRouter(prefix="/saas-config", tags=["saas-configuration"])


# Request Models


class ModuleConfigRequest(BaseModel):
    """Configuration for an application module."""

    enabled: bool = Field(False, description="Whether this module is enabled")
    is_new: bool = Field(True, description="Whether this is a new implementation (requires setup)")
    # Additional fields are dynamic based on module type
    # These will be captured in the dict and passed through


class IntegrationRequest(BaseModel):
    """Configuration for an integration."""

    system_name: str = Field(..., description="Name of the system to integrate with")
    vendor: str | None = Field(None, description="Vendor name")
    is_new: bool = Field(True, description="Whether this is a new integration")


class SaaSConfigurationRequest(BaseModel):
    """Request for comprehensive SaaS configuration.

    This is the new configuration-driven model that replaces the old
    hardcoded approach.
    """

    base_product: str = Field(
        "standard",
        description="Base Teller product: 'standard' or 'basic'",
        pattern="^(standard|basic)$",
    )

    additional_users: int = Field(
        0,
        ge=0,
        le=999,
        description="Number of additional named users beyond 5 included",
    )

    modules: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Application modules configuration",
        examples=[
            {
                "check_recognition": {
                    "enabled": True,
                    "is_new": True,
                    "scan_volume": 75000,
                },
                "revenue_submission": {
                    "enabled": True,
                    "is_new": False,
                    "num_submitters": 15,
                },
            }
        ],
    )

    integrations: dict[str, list[dict[str, Any]]] = Field(
        default_factory=dict,
        description="Integrations configuration",
        examples=[
            {
                "bidirectional": [
                    {
                        "system_name": "Tyler Munis",
                        "vendor": "Tyler Technologies",
                        "is_new": True,
                    }
                ],
                "payment_import": [
                    {
                        "system_name": "Financials A/R",
                        "vendor": "Various",
                        "is_new": True,
                    }
                ],
            }
        ],
    )


# Response Models


class SaaSProductResponse(BaseModel):
    """Response for a selected SaaS product."""

    product_id: str  # UUID as string for saving
    product_code: str
    name: str
    category: str
    monthly_cost: float
    quantity: int
    total_monthly_cost: float
    reason: str
    volume: int | None = None
    volume_unit: str | None = None
    integration_details: dict[str, Any] | None = None


class SetupSKUResponse(BaseModel):
    """Response for a selected setup SKU."""

    sku_id: str  # UUID as string for saving
    sku_code: str
    name: str
    quantity: int
    unit_price: float
    total_price: float
    reason: str


class SaaSConfigurationResponse(BaseModel):
    """Response for SaaS configuration."""

    selected_products: list[SaaSProductResponse]
    setup_skus: list[SetupSKUResponse]
    total_monthly_cost: float
    total_setup_cost: float
    summary: str


# Endpoints


@router.post("/configure", response_model=SaaSConfigurationResponse)
def configure_saas(
    request: SaaSConfigurationRequest, db: Session = Depends(get_db)
) -> SaaSConfigurationResponse:
    """Configure SaaS products based on user parameters.

    This is the new configuration-driven endpoint that replaces the old
    `/quote-config/preview/saas-products` endpoint.

    **Key Differences from Old Endpoint:**
    - Module-based configuration (not just interface counts)
    - Named integrations (not generic counts)
    - Dynamic pricing based on configuration rules
    - Setup SKUs auto-selected based on rules
    - All configuration stored in database (no hardcoded logic)

    **Example Request:**
    ```json
    {
      "base_product": "standard",
      "additional_users": 3,
      "modules": {
        "check_recognition": {
          "enabled": true,
          "is_new": true,
          "scan_volume": 75000
        },
        "revenue_submission": {
          "enabled": true,
          "is_new": false,
          "num_submitters": 15
        }
      },
      "integrations": {
        "bidirectional": [
          {
            "system_name": "Tyler Munis",
            "vendor": "Tyler Technologies",
            "is_new": true
          }
        ]
      }
    }
    ```

    **Example Response:**
    ```json
    {
      "selected_products": [
        {
          "product_code": "TELLER-STANDARD",
          "name": "Teller Standard",
          "category": "Core",
          "monthly_cost": 2950.00,
          "quantity": 1,
          "total_monthly_cost": 2950.00,
          "reason": "Base Teller Standard product"
        },
        {
          "product_code": "ADDITIONAL-USER",
          "name": "Additional Named User",
          "category": "Add-on",
          "monthly_cost": 60.00,
          "quantity": 3,
          "total_monthly_cost": 180.00,
          "reason": "3 Additional Named User"
        },
        {
          "product_code": "CHECK-RECOGNITION-SAAS",
          "name": "Check Recognition/Bulk Scanning",
          "category": "Module",
          "monthly_cost": 1030.00,
          "quantity": 1,
          "total_monthly_cost": 1030.00,
          "reason": "Check Recognition/Bulk Scanning module enabled",
          "volume": 75000,
          "volume_unit": "scan volume"
        }
      ],
      "setup_skus": [
        {
          "sku_code": "CHECK-ICL-SETUP",
          "name": "Check Recognition Setup",
          "quantity": 1,
          "unit_price": 12880.00,
          "total_price": 12880.00,
          "reason": "Required for Check Recognition module"
        },
        {
          "sku_code": "INTEGRATION-MATURE",
          "name": "Mature Integration Setup",
          "quantity": 1,
          "unit_price": 2000.00,
          "total_price": 2000.00,
          "reason": "Tyler Munis uses existing Teller interface"
        }
      ],
      "total_monthly_cost": 4445.00,
      "total_setup_cost": 14880.00,
      "summary": "Teller Standard, 2 modules, 1 integration: $4,445.00/mo, $14,880.00 setup"
    }
    ```

    Args:
        request: SaaS configuration parameters
        db: Database session

    Returns:
        Selected products, setup SKUs, and totals

    Raises:
        HTTPException: If configuration is invalid or pricing version not found
    """
    # Convert request to dict for service
    parameters = request.model_dump()

    # Create service and configure
    service = SaaSConfigurationService(db)
    result = service.configure_saas(parameters)

    return SaaSConfigurationResponse(**result)


@router.get("/available-modules")
def get_available_modules(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get list of available application modules with their parameters.

    This endpoint returns the available modules and their required parameters,
    allowing the frontend to dynamically build the configuration UI.

    Returns:
        Dictionary of available modules with parameter definitions

    Example Response:
    ```json
    {
      "modules": [
        {
          "module_code": "CHECK_RECOGNITION",
          "module_name": "Check Recognition/Bulk Scanning",
          "description": "MICR recognition and bulk check scanning",
          "parameters": [
            {
              "name": "enabled",
              "label": "Enable Check Recognition",
              "type": "boolean",
              "required": false,
              "default": false
            },
            {
              "name": "scan_volume",
              "label": "Monthly Scan Volume",
              "type": "integer",
              "required": false,
              "helpText": "Estimated monthly check scans"
            }
          ]
        }
      ]
    }
    ```
    """
    from app.services.configuration_service import ConfigurationService

    config = ConfigurationService(db)
    modules = config.get_all_application_modules()

    result_modules: list[dict[str, Any]] = []
    for module in modules:
        # Get sub-parameters for dynamic UI rendering
        sub_parameters = module.SubParameters or {}

        # Get selection rules for SKU/SaaS auto-selection logic
        selection_rules = module.SelectionRules or {}

        # Get the SaaS product code if there's a linked product
        saas_product_code = None
        if module.SaaSProductId:
            all_products = config.get_all_saas_products()
            saas_product = next((p for p in all_products if p.Id == module.SaaSProductId), None)
            if saas_product:
                saas_product_code = saas_product.ProductCode

        result_modules.append(
            {
                "module_code": module.ModuleCode,
                "module_name": module.ModuleName,
                "description": module.Description,
                "sub_parameters": sub_parameters,
                "selection_rules": selection_rules,
                "saas_product_code": saas_product_code,
                "sort_order": module.SortOrder,
            }
        )

    # Sort by sort_order
    result_modules.sort(key=lambda x: x.get("sort_order") or 0)

    return {"modules": result_modules}


@router.get("/available-integrations")
def get_available_integrations(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get list of available integration types and mature integrations.

    Returns:
        Dictionary of integration types and mature integrations

    Example Response:
    ```json
    {
      "integration_types": [
        {
          "type_code": "BIDIRECTIONAL",
          "type_name": "Bi-Directional Interface",
          "monthly_cost": 285.00,
          "description": "Two-way data synchronization"
        },
        {
          "type_code": "PAYMENT_IMPORT",
          "type_name": "Payment Import Interface",
          "monthly_cost": 170.00,
          "description": "One-way payment data import"
        }
      ],
      "mature_integrations": [
        {
          "integration_code": "TYLER-MUNIS",
          "system_name": "Tyler Munis",
          "vendor": "Tyler Technologies",
          "comments": "Financial management system"
        }
      ]
    }
    ```
    """
    from app.services.configuration_service import ConfigurationService

    config = ConfigurationService(db)
    int_types = config.get_all_integration_types()
    mature_integrations = config.get_all_mature_integrations()

    return {
        "integration_types": [
            {
                "type_code": it.TypeCode,
                "type_name": it.TypeName,
                "monthly_cost": float(it.MonthlyCost),
                "description": it.Description,
                "mature_setup_sku": it.MatureSetupSKU,
                "custom_setup_sku": it.CustomSetupSKU,
            }
            for it in int_types
        ],
        "mature_integrations": [
            {
                "integration_code": mi.IntegrationCode,
                "system_name": mi.SystemName,
                "vendor": mi.Vendor,
                "comments": mi.Comments,
            }
            for mi in mature_integrations
        ],
    }
