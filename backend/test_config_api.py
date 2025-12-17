"""Test the configuration-driven SaaS API endpoint."""

import json

import requests


def test_saas_configuration() -> None:
    """Test the /api/saas-config/configure endpoint."""
    url = "http://localhost:8000/api/saas-config/configure"

    payload = {
        "base_product": "standard",
        "additional_users": 3,
        "modules": {
            "check_recognition": {
                "enabled": True,
                "is_new": True,
                "scan_volume": 75000,
            },
            "revenue_submission": {
                "enabled": True,
                "is_new": True,
                "num_submitters": 50,
            },
        },
        "integrations": {
            "bidirectional": [
                {
                    "system_name": "Tyler Munis",
                    "vendor": "Tyler Technologies",
                    "is_new": True,
                }
            ]
        },
    }

    print("\n" + "=" * 60)
    print("🧪 Testing SaaS Configuration API")
    print("=" * 60 + "\n")

    print("📤 Request:")
    print(json.dumps(payload, indent=2))
    print()

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()

        print(f"📥 Response (Status: {response.status_code}):\n")
        result = response.json()
        print(json.dumps(result, indent=2))

        print("\n" + "=" * 60)
        print("✅ API Test Successful!")
        print("=" * 60 + "\n")

        # Print summary
        print("📊 Configuration Summary:")
        print(f"  - Selected {len(result['selected_products'])} products")
        print(f"  - Selected {len(result['setup_skus'])} setup SKUs")
        print(f"  - Total Monthly: ${result['total_monthly_cost']:,.2f}")
        print(f"  - Total Setup: ${result['total_setup_cost']:,.2f}")
        print(f"  - {result['summary']}")
        print()

    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"Response: {e.response.text}")


if __name__ == "__main__":
    test_saas_configuration()
