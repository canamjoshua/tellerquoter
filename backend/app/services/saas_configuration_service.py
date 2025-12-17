"""SaaS configuration service for configuring quotes based on user parameters.

This service applies configuration rules to user parameters and determines
which SaaS products and setup SKUs should be included in a quote.
"""

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.services.configuration_service import ConfigurationService
from app.services.rule_engine import RuleEngine


class SaaSConfigurationService:
    """Service for configuring SaaS products based on user parameters.

    This service uses the ConfigurationService to load configuration
    and the RuleEngine to evaluate rules and calculate prices.
    """

    def __init__(self, db: Session, pricing_version_id: UUID | None = None):
        """Initialize SaaS configuration service.

        Args:
            db: Database session
            pricing_version_id: Specific pricing version to use, or None for current
        """
        self.db = db
        self.config = ConfigurationService(db, pricing_version_id)
        self.rule_engine = RuleEngine()

    def configure_saas(self, parameters: dict[str, Any]) -> dict[str, Any]:
        """Configure SaaS products based on user parameters.

        Args:
            parameters: User-provided configuration
                {
                    "base_product": "standard",
                    "additional_users": 3,
                    "modules": {
                        "check_recognition": {
                            "enabled": true,
                            "is_new": true,
                            "scan_volume": 75000
                        }
                    },
                    "integrations": {
                        "bidirectional": [
                            {
                                "system_name": "Tyler Munis",
                                "vendor": "Tyler Technologies",
                                "is_new": true
                            }
                        ],
                        "payment_import": [...]
                    }
                }

        Returns:
            Configuration result
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
                        ...
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
                        ...
                    ],
                    "total_monthly_cost": 5000.00,
                    "total_setup_cost": 15000.00,
                    "summary": "Teller Standard with 3 modules, 2 integrations: $5,000/mo, $15,000 setup"
                }
        """
        selected_products = []
        setup_skus = []

        # 1. Process base product
        base_result = self._process_base_product(parameters)
        if base_result["product"]:
            selected_products.append(base_result["product"])
        setup_skus.extend(base_result.get("setup_skus", []))

        # 2. Process additional users addon
        addon_results = self._process_addons(parameters)
        selected_products.extend(addon_results["products"])

        # 3. Process application modules
        module_results = self._process_modules(parameters)
        selected_products.extend(module_results["products"])
        setup_skus.extend(module_results.get("setup_skus", []))

        # 4. Process integrations
        integration_results = self._process_integrations(parameters)
        selected_products.extend(integration_results["products"])
        setup_skus.extend(integration_results.get("setup_skus", []))

        # Calculate totals
        total_monthly = sum(Decimal(str(p.get("total_monthly_cost", 0))) for p in selected_products)
        total_setup = sum(Decimal(str(s.get("total_price", 0))) for s in setup_skus)

        # Build summary
        module_count = len(module_results["products"])
        integration_count = len(integration_results["products"])
        base_name = base_result["product"]["name"] if base_result["product"] else "Teller"

        summary_parts = [base_name]
        if module_count > 0:
            summary_parts.append(f"{module_count} module{'s' if module_count != 1 else ''}")
        if integration_count > 0:
            summary_parts.append(
                f"{integration_count} integration{'s' if integration_count != 1 else ''}"
            )

        summary = (
            f"{', '.join(summary_parts)}: "
            f"${float(total_monthly):,.2f}/mo, ${float(total_setup):,.2f} setup"
        )

        return {
            "selected_products": selected_products,
            "setup_skus": setup_skus,
            "total_monthly_cost": float(total_monthly),
            "total_setup_cost": float(total_setup),
            "summary": summary,
        }

    def _process_base_product(self, parameters: dict[str, Any]) -> dict[str, Any]:
        """Process base Teller product selection.

        Args:
            parameters: User parameters

        Returns:
            {
                "product": {...} or None,
                "setup_skus": [...]
            }
        """
        base_product_type = parameters.get("base_product", "standard").lower()

        # Determine product code
        if base_product_type == "basic":
            product_code = "TELLER-BASIC"
        else:
            product_code = "TELLER-STANDARD"

        # Get product configuration
        product = self.config.get_saas_product(product_code)
        if not product:
            return {"product": None, "setup_skus": []}

        # Build context for rule evaluation
        context = {**parameters}

        # Calculate price using pricing formula
        pricing_formula = product.PricingFormula or {
            "type": "fixed",
            "price": float(product.Tier1Price),
        }
        monthly_cost = self.rule_engine.calculate_price(pricing_formula, context)

        # Build product result
        product_result = {
            "product_id": str(product.Id),
            "product_code": product.ProductCode,
            "name": product.Name,
            "category": product.Category,
            "monthly_cost": float(monthly_cost),
            "quantity": 1,
            "total_monthly_cost": float(monthly_cost),
            "reason": f"Base {product.Name} product",
        }

        # Process related setup SKUs
        setup_skus = []
        for sku_rule in product.RelatedSetupSKUs or []:
            sku_result = self.rule_engine.evaluate_sku_selection_rule(sku_rule, context)
            if sku_result:
                # Get SKU details from database
                sku = self.config.get_sku(sku_result["sku_code"])
                if sku:
                    quantity = sku_result["quantity"]
                    unit_price = float(sku.FixedPrice or 0)
                    setup_skus.append(
                        {
                            "sku_id": str(sku.Id),
                            "sku_code": sku.SKUCode,
                            "name": sku.Name,
                            "quantity": quantity,
                            "unit_price": unit_price,
                            "total_price": unit_price * quantity,
                            "reason": sku_result.get("reason", ""),
                        }
                    )

        return {"product": product_result, "setup_skus": setup_skus}

    def _process_addons(self, parameters: dict[str, Any]) -> dict[str, Any]:
        """Process addon products (e.g., additional users).

        Args:
            parameters: User parameters

        Returns:
            {"products": [...]}
        """
        products = []
        context = {**parameters}

        # Get all addon-type SaaS products
        all_products = self.config.get_all_saas_products()
        addon_products = [p for p in all_products if p.ProductType == "addon"]

        for product in addon_products:
            # Evaluate selection rules
            selection_rules = product.SelectionRules or {}
            conditions = selection_rules.get("conditions", [])

            should_include = False
            if not conditions:
                # No conditions - check if it has a quantity parameter
                pricing_formula = product.PricingFormula or {}
                if pricing_formula.get("type") == "quantity_based":
                    quantity_param = pricing_formula.get("quantityParameter", "")
                    quantity = self.rule_engine._get_nested_value(context, quantity_param)
                    should_include = quantity is not None and quantity > 0
            else:
                # Evaluate conditions
                operator = selection_rules.get("operator", "AND")
                if operator == "AND":
                    should_include = all(
                        self.rule_engine.evaluate_condition(cond, context) for cond in conditions
                    )
                else:  # OR
                    should_include = any(
                        self.rule_engine.evaluate_condition(cond, context) for cond in conditions
                    )

            if should_include:
                # Calculate price
                pricing_formula = product.PricingFormula or {
                    "type": "fixed",
                    "price": float(product.Tier1Price),
                }
                monthly_cost = self.rule_engine.calculate_price(pricing_formula, context)

                # Determine quantity (for quantity-based pricing)
                quantity = 1
                if pricing_formula.get("type") == "quantity_based":
                    quantity_param = pricing_formula.get("quantityParameter", "")
                    quantity_value = self.rule_engine._get_nested_value(context, quantity_param)
                    if quantity_value:
                        quantity = int(quantity_value)

                total_monthly = monthly_cost * Decimal(str(quantity))

                products.append(
                    {
                        "product_id": str(product.Id),
                        "product_code": product.ProductCode,
                        "name": product.Name,
                        "category": product.Category,
                        "monthly_cost": float(monthly_cost),
                        "quantity": quantity,
                        "total_monthly_cost": float(total_monthly),
                        "reason": f"{quantity} {product.Name}",
                    }
                )

        return {"products": products}

    def _process_modules(self, parameters: dict[str, Any]) -> dict[str, Any]:
        """Process application modules.

        Args:
            parameters: User parameters

        Returns:
            {
                "products": [...],
                "setup_skus": [...]
            }
        """
        products = []
        setup_skus = []

        modules_config = parameters.get("modules", {})

        # Get all active modules
        all_modules = self.config.get_all_application_modules()

        for module in all_modules:
            module_code_lower = module.ModuleCode.lower()
            module_params = modules_config.get(module_code_lower, {})

            # Check if module is enabled
            if not module_params.get("enabled", False):
                continue

            # Build context for rule evaluation
            context = {
                "modules": {module_code_lower: module_params},
                **parameters,
            }

            # Get linked SaaS product
            saas_product = None
            if module.SaaSProductId:
                # Get from all products list
                all_products = self.config.get_all_saas_products()
                saas_product = next((p for p in all_products if p.Id == module.SaaSProductId), None)

                if saas_product:
                    # Calculate monthly cost
                    pricing_formula = saas_product.PricingFormula or {
                        "type": "fixed",
                        "price": float(saas_product.Tier1Price),
                    }
                    monthly_cost = self.rule_engine.calculate_price(pricing_formula, context)

                    # Extract volume parameter for display
                    volume_param_path = pricing_formula.get("volumeParameter", "")
                    volume = None
                    volume_unit = None
                    if volume_param_path:
                        volume = self.rule_engine._get_nested_value(context, volume_param_path)
                        # Extract unit name from parameter path
                        volume_unit = volume_param_path.split(".")[-1].replace("_", " ")

                    product_result = {
                        "product_id": str(saas_product.Id),
                        "product_code": saas_product.ProductCode,
                        "name": module.ModuleName,
                        "category": "Module",
                        "monthly_cost": float(monthly_cost),
                        "quantity": 1,
                        "total_monthly_cost": float(monthly_cost),
                        "reason": f"{module.ModuleName} module enabled",
                    }

                    if volume is not None:
                        product_result["volume"] = volume
                        product_result["volume_unit"] = volume_unit

                    products.append(product_result)

            # Process setup SKUs from module configuration
            selection_rules = module.SelectionRules or {}
            setup_sku_rules = selection_rules.get("setupSKUs", [])

            for sku_rule in setup_sku_rules:
                sku_result = self.rule_engine.evaluate_sku_selection_rule(sku_rule, context)
                if sku_result:
                    # Get SKU details
                    sku = self.config.get_sku(sku_result["sku_code"])
                    if sku:
                        quantity = sku_result["quantity"]
                        unit_price = float(sku.FixedPrice or 0)
                        setup_skus.append(
                            {
                                "sku_id": str(sku.Id),
                                "sku_code": sku.SKUCode,
                                "name": sku.Name,
                                "quantity": quantity,
                                "unit_price": unit_price,
                                "total_price": unit_price * quantity,
                                "reason": sku_result.get(
                                    "reason", f"Required for {module.ModuleName}"
                                ),
                            }
                        )

        return {"products": products, "setup_skus": setup_skus}

    def _process_integrations(self, parameters: dict[str, Any]) -> dict[str, Any]:
        """Process integrations (bidirectional and payment import).

        Args:
            parameters: User parameters

        Returns:
            {
                "products": [...],
                "setup_skus": [...]
            }
        """
        products = []
        setup_skus = []

        integrations_config = parameters.get("integrations", {})

        # Process bi-directional integrations
        bidirectional = integrations_config.get("bidirectional", [])
        if bidirectional:
            int_type = self.config.get_integration_type("BIDIRECTIONAL")
            if int_type:
                # Get the bidirectional interface SaaS product for saving
                bidir_product = self.config.get_saas_product("INTERFACE-BIDIRECTIONAL")
                bidir_product_id = str(bidir_product.Id) if bidir_product else ""

                for integration in bidirectional:
                    # Add monthly cost
                    products.append(
                        {
                            "product_id": bidir_product_id,
                            "product_code": "INTERFACE-BIDIRECTIONAL",
                            "name": f"Bi-Directional Interface: {integration.get('system_name', 'Unknown')}",
                            "category": "Interface",
                            "monthly_cost": float(int_type.MonthlyCost),
                            "quantity": 1,
                            "total_monthly_cost": float(int_type.MonthlyCost),
                            "reason": f"Bi-directional interface for {integration.get('system_name', 'Unknown')}",
                            "integration_details": integration,
                        }
                    )

                    # Check if setup is needed
                    if integration.get("is_new", True):
                        # Check if it's a mature integration
                        is_mature = self.config.get_mature_integration(
                            integration.get("system_name", "")
                        )

                        if is_mature:
                            sku_code = int_type.MatureSetupSKU
                            reason = (
                                f"{integration.get('system_name')} uses existing Teller interface"
                            )
                        else:
                            sku_code = int_type.CustomSetupSKU
                            reason = f"Custom integration development for {integration.get('system_name')}"

                        if sku_code:
                            sku = self.config.get_sku(sku_code)
                            if sku:
                                setup_skus.append(
                                    {
                                        "sku_id": str(sku.Id),
                                        "sku_code": sku.SKUCode,
                                        "name": sku.Name,
                                        "quantity": 1,
                                        "unit_price": float(sku.FixedPrice or 0),
                                        "total_price": float(sku.FixedPrice or 0),
                                        "reason": reason,
                                    }
                                )

        # Process payment import integrations
        payment_import = integrations_config.get("payment_import", [])
        if payment_import:
            int_type = self.config.get_integration_type("PAYMENT_IMPORT")
            if int_type:
                # Get the payment import interface SaaS product for saving
                pi_product = self.config.get_saas_product("INTERFACE-PAYMENT-IMPORT")
                pi_product_id = str(pi_product.Id) if pi_product else ""

                for integration in payment_import:
                    # Add monthly cost
                    products.append(
                        {
                            "product_id": pi_product_id,
                            "product_code": "INTERFACE-PAYMENT-IMPORT",
                            "name": f"Payment Import: {integration.get('system_name', 'Unknown')}",
                            "category": "Interface",
                            "monthly_cost": float(int_type.MonthlyCost),
                            "quantity": 1,
                            "total_monthly_cost": float(int_type.MonthlyCost),
                            "reason": f"Payment import interface for {integration.get('system_name', 'Unknown')}",
                            "integration_details": integration,
                        }
                    )

                    # Check if setup is needed
                    if integration.get("is_new", True):
                        # Check if it's a mature integration
                        is_mature = self.config.get_mature_integration(
                            integration.get("system_name", "")
                        )

                        if is_mature:
                            sku_code = int_type.MatureSetupSKU
                            reason = (
                                f"{integration.get('system_name')} uses existing Teller interface"
                            )
                        else:
                            sku_code = int_type.CustomSetupSKU
                            reason = f"Custom integration development for {integration.get('system_name')}"

                        if sku_code:
                            sku = self.config.get_sku(sku_code)
                            if sku:
                                setup_skus.append(
                                    {
                                        "sku_id": str(sku.Id),
                                        "sku_code": sku.SKUCode,
                                        "name": sku.Name,
                                        "quantity": 1,
                                        "unit_price": float(sku.FixedPrice or 0),
                                        "total_price": float(sku.FixedPrice or 0),
                                        "reason": reason,
                                    }
                                )

        return {"products": products, "setup_skus": setup_skus}
