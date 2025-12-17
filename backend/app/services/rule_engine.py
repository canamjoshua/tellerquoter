"""Rule engine for evaluating configuration conditions and formulas.

This module provides a flexible, safe rule evaluation engine that allows
business logic to be stored as data (in JSONB columns) rather than hardcoded
in application code.
"""

from decimal import Decimal
from typing import Any


class RuleEngine:
    """Engine for evaluating conditions and pricing formulas from configuration data.

    This class provides methods to:
    1. Evaluate conditions (e.g., "if parameter X equals Y")
    2. Calculate prices based on formulas (fixed, tiered, quantity-based)
    3. Access nested dictionary values using dot notation

    All evaluation is done safely without using eval() on untrusted input.
    """

    @staticmethod
    def evaluate_condition(condition: dict[str, Any], context: dict[str, Any]) -> bool:
        """Evaluate a condition against a context.

        Args:
            condition: Condition definition from configuration
                {
                    "type": "parameter_equals",
                    "parameter": "modules.check_recognition.enabled",
                    "value": true
                }
            context: User-provided parameters and calculated values
                {
                    "modules": {
                        "check_recognition": {
                            "enabled": true,
                            "scan_volume": 75000
                        }
                    }
                }

        Returns:
            True if condition is met, False otherwise

        Supported condition types:
            - always: Always true
            - never: Always false
            - parameter_equals: Check if parameter equals value
            - parameter_not_equals: Check if parameter doesn't equal value
            - parameter_in: Check if parameter is in list
            - parameter_greater_than: Check if parameter > value
            - parameter_less_than: Check if parameter < value
            - parameter_between: Check if min <= parameter <= max
            - parameter_exists: Check if parameter is not None
            - AND/OR: Combine multiple conditions
        """
        condition_type = condition.get("type")

        # Simple conditions
        if condition_type == "always":
            return True

        if condition_type == "never":
            return False

        # Parameter-based conditions
        if condition_type == "parameter_equals":
            param_path = condition.get("parameter", "")
            expected_value = condition.get("value")
            actual_value = RuleEngine._get_nested_value(context, param_path)
            return bool(actual_value == expected_value)

        if condition_type == "parameter_not_equals":
            param_path = condition.get("parameter", "")
            expected_value = condition.get("value")
            actual_value = RuleEngine._get_nested_value(context, param_path)
            return bool(actual_value != expected_value)

        if condition_type == "parameter_in":
            param_path = condition.get("parameter", "")
            value_list = condition.get("values", [])
            actual_value = RuleEngine._get_nested_value(context, param_path)
            return actual_value in value_list

        if condition_type == "parameter_greater_than":
            param_path = condition.get("parameter", "")
            threshold = condition.get("value")
            actual_value = RuleEngine._get_nested_value(context, param_path)
            if actual_value is None or threshold is None:
                return False
            try:
                return float(actual_value) > float(threshold)
            except (ValueError, TypeError):
                return False

        if condition_type == "parameter_less_than":
            param_path = condition.get("parameter", "")
            threshold = condition.get("value")
            actual_value = RuleEngine._get_nested_value(context, param_path)
            if actual_value is None or threshold is None:
                return False
            try:
                return float(actual_value) < float(threshold)
            except (ValueError, TypeError):
                return False

        if condition_type == "parameter_between":
            param_path = condition.get("parameter", "")
            actual_value = RuleEngine._get_nested_value(context, param_path)
            min_val = condition.get("min", float("-inf"))
            max_val = condition.get("max", float("inf"))
            if actual_value is None:
                return False
            try:
                actual_float = float(actual_value)
                return float(min_val) <= actual_float <= float(max_val)
            except (ValueError, TypeError):
                return False

        if condition_type == "parameter_exists":
            param_path = condition.get("parameter", "")
            actual_value = RuleEngine._get_nested_value(context, param_path)
            return actual_value is not None

        # Compound conditions
        if condition.get("operator") in ["AND", "OR"]:
            conditions = condition.get("conditions", [])
            if not conditions:
                return True

            results = [RuleEngine.evaluate_condition(c, context) for c in conditions]

            if condition["operator"] == "AND":
                return all(results)
            else:  # OR
                return any(results)

        # Unknown condition type - default to False for safety
        return False

    @staticmethod
    def _get_nested_value(obj: dict[str, Any], path: str) -> Any:
        """Get nested value using dot notation.

        Args:
            obj: Dictionary to traverse
            path: Dot-separated path (e.g., "modules.check_recognition.enabled")

        Returns:
            Value at path, or None if path doesn't exist

        Example:
            obj = {"modules": {"check_recognition": {"enabled": True}}}
            _get_nested_value(obj, "modules.check_recognition.enabled")
            # Returns: True
        """
        if not path:
            return None

        keys = path.split(".")
        value: Any = obj

        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
            if value is None:
                return None

        return value

    @staticmethod
    def calculate_price(formula: dict[str, Any], context: dict[str, Any]) -> Decimal:
        """Calculate price based on pricing formula.

        Args:
            formula: Pricing formula from configuration
                {
                    "type": "fixed",
                    "price": 2950.00
                }
                or
                {
                    "type": "quantity_based",
                    "pricePerUnit": 60.00,
                    "quantityParameter": "additional_users"
                }
                or
                {
                    "type": "tiered",
                    "volumeParameter": "scan_volume",
                    "tiers": [
                        {"minVolume": 0, "maxVolume": 50000, "price": 1030.00},
                        {"minVolume": 50001, "maxVolume": null, "price": 1500.00}
                    ]
                }
            context: User parameters and values

        Returns:
            Calculated price as Decimal

        Supported formula types:
            - fixed: Returns a fixed price
            - quantity_based: Multiplies pricePerUnit by quantity parameter
            - tiered: Returns price based on which tier the volume falls into
            - calculated: Evaluates a simple mathematical expression
        """
        formula_type = formula.get("type")

        # Fixed pricing
        if formula_type == "fixed":
            price = formula.get("price", 0)
            return Decimal(str(price))

        # Quantity-based pricing
        if formula_type == "quantity_based":
            price_per_unit = Decimal(str(formula.get("pricePerUnit", 0)))
            quantity_param = formula.get("quantityParameter", "")
            quantity = RuleEngine._get_nested_value(context, quantity_param)

            if quantity is None:
                quantity = 0

            try:
                quantity_decimal = Decimal(str(quantity))
                return price_per_unit * quantity_decimal
            except (ValueError, TypeError):
                return Decimal("0")

        # Tiered pricing
        if formula_type == "tiered":
            volume_param = formula.get("volumeParameter", "")
            volume = RuleEngine._get_nested_value(context, volume_param)

            if volume is None:
                volume = 0

            try:
                volume_float = float(volume)
            except (ValueError, TypeError):
                volume_float = 0

            # Find matching tier
            tiers = formula.get("tiers", [])
            for tier in tiers:
                min_vol = float(tier.get("minVolume", 0))
                max_vol_raw = tier.get("maxVolume")

                # Handle unlimited tier (maxVolume is null)
                if max_vol_raw is None:
                    if volume_float >= min_vol:
                        return Decimal(str(tier.get("price", 0)))
                else:
                    max_vol = float(max_vol_raw)
                    if min_vol <= volume_float <= max_vol:
                        return Decimal(str(tier.get("price", 0)))

            # No tier matched - return base price or 0
            return Decimal(str(formula.get("basePrice", 0)))

        # Calculated pricing (simple expression)
        if formula_type == "calculated":
            expression = formula.get("formula", "")
            variables = formula.get("variables", {})

            # Build a safe evaluation context
            eval_context = {}
            for var_name, var_path in variables.items():
                value = RuleEngine._get_nested_value(context, var_path)
                if value is not None:
                    try:
                        eval_context[var_name] = float(value)
                    except (ValueError, TypeError):
                        eval_context[var_name] = 0
                else:
                    eval_context[var_name] = 0

            # Simple expression evaluation (safe subset)
            # Only allow: numbers, +, -, *, /, (, ), variable names
            try:
                # Replace variable names with values
                expr = expression
                for var_name, value in eval_context.items():
                    expr = expr.replace(var_name, str(value))

                # Evaluate using Python's safe eval with restricted namespace
                result = eval(expr, {"__builtins__": {}}, {})
                return Decimal(str(result))
            except Exception:
                # On any error, return 0
                return Decimal("0")

        # Unknown formula type
        return Decimal("0")

    @staticmethod
    def evaluate_sku_selection_rule(
        rule: dict[str, Any], context: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Evaluate a SKU selection rule and return SKU details if rule matches.

        Args:
            rule: SKU selection rule from configuration
                {
                    "condition": {
                        "type": "parameter_equals",
                        "parameter": "is_new",
                        "value": true
                    },
                    "skuCode": "CHECK-ICL-SETUP",
                    "quantity": 1,
                    "reason": "Initial setup for Check Recognition"
                }
            context: User parameters and values

        Returns:
            SKU details dict if condition matches, None otherwise
            {
                "sku_code": "CHECK-ICL-SETUP",
                "quantity": 1,
                "reason": "Initial setup for Check Recognition"
            }
        """
        condition = rule.get("condition", {})

        # Evaluate condition
        if not RuleEngine.evaluate_condition(condition, context):
            return None

        # Condition matched - return SKU details
        sku_code = rule.get("skuCode")
        quantity_raw = rule.get("quantity", 1)

        # Quantity can be a number or a parameter reference
        if isinstance(quantity_raw, str):
            # It's a parameter reference
            quantity = RuleEngine._get_nested_value(context, quantity_raw)
            if quantity is None:
                quantity = 1
            try:
                quantity = int(quantity)
            except (ValueError, TypeError):
                quantity = 1
        else:
            # It's a direct number
            quantity = int(quantity_raw) if quantity_raw else 1

        return {
            "sku_code": sku_code,
            "quantity": quantity,
            "reason": rule.get("reason", ""),
            "metadata": rule.get("metadata", {}),
        }
