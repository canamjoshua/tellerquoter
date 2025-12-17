"""SKU definitions based on Internal SKU Reference Key V5.1 (December 2025).

This file contains the v5.1 SKU pricing which includes:
- Organization Setup restructured with Complexity Factor formula
- Training delivery bundled into Organization Setup
- 4 on-site trips included in Organization Setup
- Updated pricing across all SKUs
- 25 of 26 SKUs confirmed (Workflow Submission TBD)
"""

from decimal import Decimal
from typing import Any

# Organization Setup Complexity Factor:
# Complexity = Departments + (Revenue_Templates / 4) + Payment_Imports
#
# Tier thresholds:
# 0-10  -> Basic:  280 hrs / $64,400
# 11-20 -> Medium: 428 hrs / $98,440
# 21+   -> Large:  768 hrs / $176,640


V5_1_SKUS: list[dict[str, Any]] = [
    # =============================================================================
    # ORGANIZATION SETUP (4 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "ORG-SETUP-BASIC",
        "Name": "Teller Setup - Basic",
        "Category": "Organization",
        "FixedPrice": Decimal("64400.00"),
        "EstimatedHours": 280,
        "TypicalDuration": 16,  # weeks
        "QuickbooksCategory": "Setup-Organization",
        "ScopeDescription": (
            "Full Teller implementation for organizations with Complexity Factor 0-10. "
            "Includes planning, configuration, testing, training delivery, and go-live support. "
            "Four on-site trips included (Kickoff, Interface Analysis, Training, Go-Live)."
        ),
        "AcceptanceCriteria": (
            "CanAm has completed all configuration and Client has approved UAT sign-off for Go-Live."
        ),
        "Deliverables": [
            "Project planning & kickoff documentation",
            "Requirements gathering & documentation",
            "Solution design & configuration planning",
            "Environment setup & access",
            "Teller base configuration",
            "User roles & security setup",
            "Receipt template design",
            "Tender type configuration",
            "Bank reconciliation mapping",
            "Export configuration",
            "System integration testing (SIT)",
            "UAT support & issue resolution",
            "Go-live readiness validation",
            "Training delivery (train-the-trainer)",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "ORG-SETUP-MEDIUM",
        "Name": "Teller Setup - Medium",
        "Category": "Organization",
        "FixedPrice": Decimal("98440.00"),
        "EstimatedHours": 428,
        "TypicalDuration": 24,  # weeks
        "QuickbooksCategory": "Setup-Organization",
        "ScopeDescription": (
            "Full Teller implementation for organizations with Complexity Factor 11-20. "
            "Includes planning, configuration, testing, training delivery, and go-live support. "
            "Four on-site trips included (Kickoff, Interface Analysis, Training, Go-Live)."
        ),
        "AcceptanceCriteria": (
            "CanAm has completed all configuration and Client has approved UAT sign-off for Go-Live."
        ),
        "Deliverables": [
            "Project planning & kickoff documentation",
            "Requirements gathering & documentation",
            "Solution design & configuration planning",
            "Environment setup & access",
            "Teller base configuration",
            "User roles & security setup",
            "Receipt template design",
            "Tender type configuration",
            "Bank reconciliation mapping",
            "Export configuration",
            "System integration testing (SIT)",
            "UAT support & issue resolution",
            "Go-live readiness validation",
            "Training delivery (train-the-trainer)",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "ORG-SETUP-LARGE",
        "Name": "Teller Setup - Large",
        "Category": "Organization",
        "FixedPrice": Decimal("176640.00"),
        "EstimatedHours": 768,
        "TypicalDuration": 36,  # weeks
        "QuickbooksCategory": "Setup-Organization",
        "ScopeDescription": (
            "Full Teller implementation for organizations with Complexity Factor 21+. "
            "Includes planning, configuration, testing, training delivery, and go-live support. "
            "Four on-site trips with expanded staffing (3 people x 3 days each)."
        ),
        "AcceptanceCriteria": (
            "CanAm has completed all configuration and Client has approved UAT sign-off for Go-Live."
        ),
        "Deliverables": [
            "Project planning & kickoff documentation",
            "Requirements gathering & documentation",
            "Solution design & configuration planning",
            "Environment setup & access",
            "Teller base configuration",
            "User roles & security setup",
            "Receipt template design",
            "Tender type configuration",
            "Bank reconciliation mapping",
            "Export configuration",
            "Multi-entity/fund configuration",
            "System integration testing (SIT)",
            "UAT support & issue resolution",
            "Go-live readiness validation",
            "Training delivery (train-the-trainer)",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "ORG-ADDITIONAL-DEPT",
        "Name": "Additional Department",
        "Category": "Organization",
        "FixedPrice": Decimal("4140.00"),
        "EstimatedHours": 18,
        "TypicalDuration": 2,  # weeks
        "QuickbooksCategory": "Setup-Organization",
        "ScopeDescription": (
            "Configuration of one additional cashiering department. Includes core config (8 hrs), "
            "bank reconciliation/DBB staging (6 hrs), credit config (2 hrs), and functional/integration "
            "lead/cohesion (2 hrs). ICL quoted separately."
        ),
        "AcceptanceCriteria": (
            "Department configured and demonstrated working in Client Test environment. "
            "Department staff connected to existing training resources and internal champions."
        ),
        "Deliverables": [
            "Department core configuration",
            "Bank reconciliation/DBB staging",
            "Credit configuration",
            "Functional lead integration",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # INTEGRATION SETUP (3 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "INTEGRATION-CONFIG",
        "Name": "Integration - Configuration",
        "Category": "Integration",
        "FixedPrice": Decimal("7360.00"),
        "EstimatedHours": 32,
        "TypicalDuration": 4,  # weeks
        "QuickbooksCategory": "Setup-Integration",
        "ScopeDescription": (
            "Configuration of Teller interface using pre-existing integration capabilities. "
            "Includes review of existing specifications, configuration, and testing. "
            "Assumes usage of mature Teller connector with 2-3+ successful client implementations."
        ),
        "AcceptanceCriteria": (
            "CanAm has reviewed existing specifications with Client and demonstrated "
            "working integration in Client Test environment."
        ),
        "Deliverables": [
            "Review of existing specifications",
            "Interface configuration",
            "Integration testing",
            "Client Test environment demonstration",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "INTEGRATION-CUSTOM",
        "Name": "Integration - Custom Development",
        "Category": "Integration",
        "FixedPrice": Decimal("28520.00"),
        "EstimatedHours": 124,
        "TypicalDuration": 8,  # weeks
        "QuickbooksCategory": "Setup-Integration",
        "ScopeDescription": (
            "Development of new bi-directional Teller interface to specified third-party system. "
            "Includes requirements gathering workshops, interface specification documentation, "
            "custom development, and testing. For systems where Teller has not previously "
            "integrated or where existing connector requires significant enhancement."
        ),
        "AcceptanceCriteria": (
            "CanAm has delivered finalized Interface Requirements document and demonstrated "
            "working integration in Client Test environment."
        ),
        "Deliverables": [
            "Requirements gathering workshops",
            "Interface specification documentation",
            "Custom development",
            "Integration testing",
            "Client Test environment demonstration",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "INTEGRATION-PAYMENT-IMPORT",
        "Name": "Integration - Payment Import",
        "Category": "Integration",
        "FixedPrice": Decimal("5520.00"),
        "EstimatedHours": 24,
        "TypicalDuration": 3,  # weeks
        "QuickbooksCategory": "Setup-Integration",
        "ScopeDescription": (
            "Configuration of end-of-day payment import interface using existing Teller import "
            "specifications. Enables automatic or manual import of transactions from a batch file. "
            "Includes review of existing file format specifications, configuration, and testing."
        ),
        "AcceptanceCriteria": (
            "CanAm has reviewed existing specifications with Client and demonstrated "
            "working payment import in Client Test environment."
        ),
        "Deliverables": [
            "File format specification review",
            "Import configuration",
            "Testing",
            "Client Test environment demonstration",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # CREDIT INTEGRATION (2 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "CREDIT-EXISTING",
        "Name": "Credit Integration - Existing",
        "Category": "Credit",
        "FixedPrice": Decimal("9200.00"),
        "EstimatedHours": 40,
        "TypicalDuration": 4,  # weeks
        "QuickbooksCategory": "Setup-Credit",
        "ScopeDescription": (
            "Configuration of credit card and electronic payment processing using existing "
            "Teller integration specifications. For processors already integrated with Teller "
            "(e.g., CORE, Paymentus). Includes review of existing specifications and configuration."
        ),
        "AcceptanceCriteria": (
            "CanAm has reviewed existing specifications and demonstrated working payment "
            "processing in Client Test environment."
        ),
        "Deliverables": [
            "Existing specification review",
            "Payment processor configuration",
            "Testing",
            "Client Test environment demonstration",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "CREDIT-NEW",
        "Name": "Credit Integration - New",
        "Category": "Credit",
        "FixedPrice": Decimal("28520.00"),
        "EstimatedHours": 124,
        "TypicalDuration": 8,  # weeks
        "QuickbooksCategory": "Setup-Credit",
        "ScopeDescription": (
            "Development of credit card and electronic payment processing integration with "
            "processor not previously integrated with Teller. Includes requirements gathering, "
            "specification documentation, custom development, and testing."
        ),
        "AcceptanceCriteria": (
            "CanAm has delivered finalized Integration Requirements document and demonstrated "
            "working payment processing in Client Test environment."
        ),
        "Deliverables": [
            "Requirements gathering",
            "Integration specification documentation",
            "Custom development",
            "Testing",
            "Client Test environment demonstration",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # CHECK RECOGNITION & ICL (1 SKU - Confirmed)
    # =============================================================================
    {
        "SKUCode": "CHECK-ICL-SETUP",
        "Name": "Check Recognition & ICL Setup",
        "Category": "Module",
        "FixedPrice": Decimal("3680.00"),
        "EstimatedHours": 16,
        "TypicalDuration": 2,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of check scanning with MICR recognition and Image Cash Letter (ICL) "
            "submission to Client's bank. Assumes bank will cooperate in testing and approval "
            "for ICL submission from Client's Teller system."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured ICL and demonstrated successful test submission to Client's bank."
        ),
        "Deliverables": [
            "Check scanning configuration",
            "MICR recognition setup",
            "ICL submission configuration",
            "Bank testing coordination",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # REVENUE SUBMISSION (2 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "REV-SUB-BASE",
        "Name": "Revenue Submission Setup - Base",
        "Category": "Module",
        "FixedPrice": Decimal("5520.00"),
        "EstimatedHours": 24,
        "TypicalDuration": 3,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Completion of initial Revenue Submission configuration including module setup "
            "and up to 10 submission templates. Enables departments to submit revenue information "
            "to Teller via web-based portal. Does not include workflow capability."
        ),
        "AcceptanceCriteria": (
            "CanAm has performed initial Revenue Submission configuration available to Client "
            "in Test environment."
        ),
        "Deliverables": [
            "Revenue Submission module setup",
            "Up to 10 submission templates",
            "User configuration",
            "Testing",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "REV-SUB-TEMPLATE-BLOCK",
        "Name": "Revenue Submission - Template Block",
        "Category": "Module",
        "FixedPrice": Decimal("2760.00"),
        "EstimatedHours": 12,
        "TypicalDuration": 1,  # week
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of up to 10 additional Revenue Submission templates beyond the "
            "base configuration. Includes template design, field mapping, and testing. "
            "Repeatable SKU - purchase multiple blocks as needed."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured additional templates and demonstrated working submissions "
            "in Client Test environment."
        ),
        "Deliverables": [
            "Template design (up to 10)",
            "Field mapping",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # WORKFLOW SUBMISSION (1 SKU - Earmarked)
    # =============================================================================
    {
        "SKUCode": "WORKFLOW-SUBMISSION",
        "Name": "Workflow Submission Setup",
        "Category": "Module",
        "FixedPrice": None,  # TBD
        "EstimatedHours": None,  # TBD
        "TypicalDuration": None,
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of Workflow Submission module enabling departments to submit "
            "information to Teller via web-based portal with workflow capabilities. "
            "Includes approval routing, conditional logic, and multi-step submission processes."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured workflow submission and demonstrated complete workflow "
            "process in Client Test environment."
        ),
        "Deliverables": [
            "Workflow module configuration",
            "Approval routing setup",
            "Conditional logic configuration",
            "Testing",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": True,  # Pricing TBD
    },
    # =============================================================================
    # TELLER ONLINE (4 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "TELLER-ONLINE-SETUP",
        "Name": "Teller Online Setup",
        "Category": "Module",
        "FixedPrice": Decimal("9200.00"),
        "EstimatedHours": 40,
        "TypicalDuration": 4,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Completion of initial Teller Online configuration including portal setup, "
            "branding alignment, and base payment functionality. Configures customer-facing "
            "web portal for online payment submission. Does not include system-specific "
            "integrations (quoted separately)."
        ),
        "AcceptanceCriteria": (
            "CanAm has performed initial online configuration available to Client in Test environment."
        ),
        "Deliverables": [
            "Portal setup",
            "Branding alignment",
            "Base payment functionality",
            "Testing",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "TELLER-ONLINE-INTEGRATION-MATURE",
        "Name": "Teller Online - Integration Add-on (Mature)",
        "Category": "Module",
        "FixedPrice": Decimal("2760.00"),
        "EstimatedHours": 12,
        "TypicalDuration": 2,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of additional system integration to Teller Online portal using "
            "existing connector specifications. Enables customers to search and pay bills "
            "from specified system through the online portal. Search-based or full "
            "integration depending on system capabilities."
        ),
        "AcceptanceCriteria": (
            "CanAm has reviewed existing specifications and demonstrated working online "
            "integration in Client Test environment."
        ),
        "Deliverables": [
            "Specification review",
            "Integration configuration",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "TELLER-ONLINE-INTEGRATION-NEW",
        "Name": "Teller Online - Integration Add-on (New)",
        "Category": "Module",
        "FixedPrice": Decimal("6440.00"),
        "EstimatedHours": 28,
        "TypicalDuration": 3,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Development and configuration of new system integration to Teller Online portal. "
            "Includes requirements gathering, specification documentation, development, and "
            "testing. Enables customers to search and pay bills from specified system through "
            "the online portal. For systems not previously integrated with Teller Online."
        ),
        "AcceptanceCriteria": (
            "CanAm has delivered finalized Interface Requirements document and demonstrated "
            "working online integration in Client Test environment."
        ),
        "Deliverables": [
            "Requirements gathering",
            "Specification documentation",
            "Development",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "TELLER-ONLINE-REDIRECT",
        "Name": "Teller Online - Third-Party Redirect",
        "Category": "Module",
        "FixedPrice": Decimal("28520.00"),
        "EstimatedHours": 124,
        "TypicalDuration": 8,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Development of integration to allow third-party portals to redirect customers "
            "to Teller Online for payment processing. Includes requirements gathering, "
            "specification documentation, custom development, redirect flow configuration, "
            "and testing. Enables external systems to leverage Teller Online as their "
            "payment processor while maintaining transaction tracking and reconciliation."
        ),
        "AcceptanceCriteria": (
            "CanAm has delivered finalized Integration Requirements document and demonstrated "
            "working inbound redirect flow with transaction reconciliation in Client Test environment."
        ),
        "Deliverables": [
            "Requirements gathering",
            "Integration specification documentation",
            "Custom development",
            "Redirect flow configuration",
            "Testing",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # ONLINE FORMS (4 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "ONLINE-FORM-TIER1",
        "Name": "Online Forms - Tier 1 (Simple)",
        "Category": "Module",
        "FixedPrice": Decimal("4600.00"),
        "EstimatedHours": 20,
        "TypicalDuration": 2,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of simple online form with fewer than 15 fields. Supports "
            "simple sum calculations only. No custom code. Single page format. "
            "Per form - repeatable SKU."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured form and demonstrated working submission in Client "
            "Test environment."
        ),
        "Deliverables": [
            "Form design",
            "Field configuration",
            "Calculation setup",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "ONLINE-FORM-TIER2",
        "Name": "Online Forms - Tier 2 (Medium)",
        "Category": "Module",
        "FixedPrice": Decimal("9200.00"),
        "EstimatedHours": 40,
        "TypicalDuration": 3,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of medium complexity online form with 15-29 fields OR complex "
            "calculations beyond simple sums. No custom code. Single page format. "
            "Per form - repeatable SKU."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured form and demonstrated working submission with calculations "
            "in Client Test environment."
        ),
        "Deliverables": [
            "Form design",
            "Field configuration",
            "Complex calculation setup",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "ONLINE-FORM-TIER3",
        "Name": "Online Forms - Tier 3 (Complex)",
        "Category": "Module",
        "FixedPrice": Decimal("13800.00"),
        "EstimatedHours": 60,
        "TypicalDuration": 4,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Configuration of complex online form with 30+ fields OR custom code/logic "
            "requirements. May include advanced validation, conditional logic, or external "
            "data lookups. Single page format. Per form - repeatable SKU."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured form and demonstrated working submission with all custom "
            "logic in Client Test environment."
        ),
        "Deliverables": [
            "Form design",
            "Field configuration",
            "Custom code/logic development",
            "Advanced validation",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "ONLINE-FORM-WORKFLOW",
        "Name": "Online Forms - Workflow Add-on",
        "Category": "Module",
        "FixedPrice": Decimal("11500.00"),
        "EstimatedHours": 50,
        "TypicalDuration": 4,  # weeks
        "QuickbooksCategory": "Setup-Module",
        "ScopeDescription": (
            "Adds workflow capability to any Online Forms tier. Enables branching/conditional "
            "display, multi-page forms, approval routing, and status tracking. Applied per "
            "individual form."
        ),
        "AcceptanceCriteria": (
            "CanAm has configured workflow and demonstrated complete workflow process including "
            "branching and approvals in Client Test environment."
        ),
        "Deliverables": [
            "Workflow configuration",
            "Branching/conditional display setup",
            "Approval routing",
            "Status tracking",
            "Testing",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # TRAINING (3 SKUs - All Confirmed)
    # Note: Core training is now included in Organization Setup. These are add-ons.
    # =============================================================================
    {
        "SKUCode": "TRAINING-SUITE",
        "Name": "Teller Training Suite",
        "Category": "Training",
        "FixedPrice": Decimal("12880.00"),
        "EstimatedHours": 56,
        "TypicalDuration": 1,  # week
        "QuickbooksCategory": "Training",
        "ScopeDescription": (
            "Training preparation and 2-days of onsite or remote delivery of train-the-trainer "
            "sessions including: (1) Teller Usage Training - common cashier functions, "
            "(2) Teller Management Training - supervisor/manager functions, "
            "(3) Teller Configuration Training - system setup changes, "
            "(4) Teller IT Administration Training - security, passwords, performance. "
            "Designed to enable Client's key users to train existing and future staff. "
            "Note: This SKU is for expansion quotes or special circumstances. "
            "For new implementations, training is included in Organization Setup."
        ),
        "AcceptanceCriteria": (
            "Training sessions completed including remedial sessions as needed. "
            "Training materials provided to Client."
        ),
        "Deliverables": [
            "Training preparation",
            "Teller Usage Training",
            "Teller Management Training",
            "Teller Configuration Training",
            "Teller IT Administration Training",
            "Training materials",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "TRAINING-REVENUE-ADDON",
        "Name": "Revenue Submission Training Add-on",
        "Category": "Training",
        "FixedPrice": Decimal("1840.00"),
        "EstimatedHours": 8,
        "TypicalDuration": 1,  # day
        "QuickbooksCategory": "Training",
        "ScopeDescription": (
            "Train-the-trainer session for departments/users submitting revenue through "
            "Revenue Submission portal. Covers template usage, submission process, and "
            "common scenarios. Can be delivered remote or on-site."
        ),
        "AcceptanceCriteria": (
            "Training session completed. Training materials provided to Client."
        ),
        "Deliverables": [
            "Revenue Submission training session",
            "Training materials",
        ],
        "IsRepeatable": False,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "TRAINING-END-USER",
        "Name": "End-User Cashiering Training",
        "Category": "Training",
        "FixedPrice": Decimal("920.00"),
        "EstimatedHours": 4,
        "TypicalDuration": 1,  # half day
        "QuickbooksCategory": "Training",
        "ScopeDescription": (
            "Group training session (2-3 hours) for end-user cashiers. Direct training "
            "delivery (not train-the-trainer). Can be delivered remote or on-site. "
            "Per session - repeatable SKU for multiple groups."
        ),
        "AcceptanceCriteria": ("Training session completed for designated user group."),
        "Deliverables": [
            "End-user cashiering training session",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # PROJECT MANAGEMENT (2 SKUs - All Confirmed)
    # =============================================================================
    {
        "SKUCode": "PM-STANDARD",
        "Name": "PM Month - Standard",
        "Category": "PM",
        "FixedPrice": Decimal("2300.00"),
        "EstimatedHours": 10,
        "TypicalDuration": 4,  # weeks (1 month)
        "QuickbooksCategory": "PM",
        "ScopeDescription": (
            "Plan and oversee all aspects of the Teller implementation project to meet "
            "the Client's project goals on time and within budget. Includes weekly status "
            "meetings, project coordination, issue tracking, and stakeholder communication."
        ),
        "AcceptanceCriteria": (
            "CanAm will provide monthly project status documents to the Client's project manager."
        ),
        "Deliverables": [
            "Weekly status meetings",
            "Project coordination",
            "Issue tracking",
            "Stakeholder communication",
            "Monthly status documents",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "PM-ENTERPRISE",
        "Name": "PM Month - Enterprise",
        "Category": "PM",
        "FixedPrice": Decimal("6900.00"),
        "EstimatedHours": 30,
        "TypicalDuration": 4,  # weeks (1 month)
        "QuickbooksCategory": "PM",
        "ScopeDescription": (
            "Enhanced project management for complex implementations involving multiple "
            "vendors or systems (e.g., coordinating with ERP implementation partner). "
            "Includes 3x standard effort for intensive coordination, additional stakeholder "
            "management, and cross-vendor issue resolution."
        ),
        "AcceptanceCriteria": (
            "CanAm will provide monthly project status documents to the Client's project manager "
            "and coordinate with designated implementation partners."
        ),
        "Deliverables": [
            "Intensive project coordination",
            "Multi-vendor coordination",
            "Stakeholder management",
            "Cross-vendor issue resolution",
            "Monthly status documents",
        ],
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    # =============================================================================
    # HARDWARE (5 Items from Exhibit B)
    # =============================================================================
    {
        "SKUCode": "HW-RECEIPT-PRINTER",
        "Name": "Receipt Printer",
        "Category": "Hardware",
        "FixedPrice": Decimal("312.00"),
        "EstimatedHours": None,
        "TypicalDuration": None,
        "QuickbooksCategory": "Hardware",
        "ScopeDescription": "Epson TM-M30/USB/Thermal Printer",
        "AcceptanceCriteria": None,
        "Deliverables": None,
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "HW-CHECK-SCANNER",
        "Name": "Check Scanner",
        "Category": "Hardware",
        "FixedPrice": Decimal("523.00"),
        "EstimatedHours": None,
        "TypicalDuration": None,
        "QuickbooksCategory": "Hardware",
        "ScopeDescription": "Digital Check CheXpress CX30",
        "AcceptanceCriteria": None,
        "Deliverables": None,
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "HW-BULK-SCANNER",
        "Name": "Bulk Check Scanner",
        "Category": "Hardware",
        "FixedPrice": Decimal("1175.00"),
        "EstimatedHours": None,
        "TypicalDuration": None,
        "QuickbooksCategory": "Hardware",
        "ScopeDescription": "Digital Check TS240",
        "AcceptanceCriteria": None,
        "Deliverables": None,
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "HW-CASH-DRAWER",
        "Name": "Cash Drawer",
        "Category": "Hardware",
        "FixedPrice": Decimal("406.00"),
        "EstimatedHours": None,
        "TypicalDuration": None,
        "QuickbooksCategory": "Hardware",
        "ScopeDescription": "APG Series 4000 Electronic Cash Drawer",
        "AcceptanceCriteria": None,
        "Deliverables": None,
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
    {
        "SKUCode": "HW-CREDIT-DEVICE",
        "Name": "Credit/Debit Device",
        "Category": "Hardware",
        "FixedPrice": Decimal("786.00"),
        "EstimatedHours": None,
        "TypicalDuration": None,
        "QuickbooksCategory": "Hardware",
        "ScopeDescription": "Ingenico Lane 5000 USB",
        "AcceptanceCriteria": None,
        "Deliverables": None,
        "IsRepeatable": True,
        "EarmarkedStatus": False,
    },
]


# Travel Zone definitions per v2.0 Section 5
V5_1_TRAVEL_ZONES: list[dict[str, Any]] = [
    {
        "ZoneCode": "ZONE-0",
        "Name": "Denver Metro Colorado",
        "Description": "Local travel - no airfare required",
        "AirfareEstimate": Decimal("0.00"),
        "HotelRate": Decimal("180.00"),
        "PerDiemRate": Decimal("60.00"),
        "VehicleRate": Decimal("125.00"),
        "SortOrder": 0,
    },
    {
        "ZoneCode": "ZONE-1",
        "Name": "Western US",
        "Description": "Western United States - regional travel",
        "AirfareEstimate": Decimal("750.00"),
        "HotelRate": Decimal("180.00"),
        "PerDiemRate": Decimal("60.00"),
        "VehicleRate": Decimal("125.00"),
        "SortOrder": 1,
    },
    {
        "ZoneCode": "ZONE-2",
        "Name": "Mid-Western US",
        "Description": "Mid-Western United States",
        "AirfareEstimate": Decimal("850.00"),
        "HotelRate": Decimal("180.00"),
        "PerDiemRate": Decimal("60.00"),
        "VehicleRate": Decimal("125.00"),
        "SortOrder": 2,
    },
    {
        "ZoneCode": "ZONE-3",
        "Name": "Eastern US",
        "Description": "Eastern United States",
        "AirfareEstimate": Decimal("950.00"),
        "HotelRate": Decimal("180.00"),
        "PerDiemRate": Decimal("60.00"),
        "VehicleRate": Decimal("125.00"),
        "SortOrder": 3,
    },
    {
        "ZoneCode": "ZONE-4",
        "Name": "Outside Continental US",
        "Description": "Alaska, Hawaii, Puerto Rico, International",
        "AirfareEstimate": Decimal("1050.00"),
        "HotelRate": Decimal("180.00"),
        "PerDiemRate": Decimal("60.00"),
        "VehicleRate": Decimal("125.00"),
        "SortOrder": 4,
    },
    {
        "ZoneCode": "ZONE-5",
        "Name": "Canada",
        "Description": "Canadian provinces",
        "AirfareEstimate": Decimal("950.00"),
        "HotelRate": Decimal("180.00"),
        "PerDiemRate": Decimal("60.00"),
        "VehicleRate": Decimal("125.00"),
        "SortOrder": 5,
    },
]


# SaaS Products per v2.0 Section 4
V5_1_SAAS_PRODUCTS: list[dict[str, Any]] = [
    # Base Products
    {
        "ProductCode": "TELLER-STANDARD",
        "Name": "Teller Standard",
        "Description": "Standard Teller cashiering platform - includes 5 named users, multi-department",
        "Category": "Base",
        "ProductType": "base",
        "PricingModel": "Fixed",
        "Tier1Price": Decimal("2950.00"),  # Monthly
        "IsRequired": False,
    },
    {
        "ProductCode": "TELLER-BASIC",
        "Name": "Teller Basic",
        "Description": "Basic Teller cashiering platform - includes 5 named users, single department",
        "Category": "Base",
        "ProductType": "base",
        "PricingModel": "Fixed",
        "Tier1Price": Decimal("995.00"),  # Monthly
        "IsRequired": False,
    },
    {
        "ProductCode": "ADDITIONAL-USER",
        "Name": "Additional Named User",
        "Description": "Per user beyond 5 included users",
        "Category": "Addon",
        "ProductType": "addon",
        "PricingModel": "Quantity",
        "Tier1Price": Decimal("60.00"),  # Per user per month
        "IsRequired": False,
    },
    # Integration SaaS (per interface)
    {
        "ProductCode": "INTERFACE-BIDIRECTIONAL",
        "Name": "Bi-Directional Interface",
        "Description": "Bi-directional system interface - listed by system name",
        "Category": "Interface",
        "ProductType": "interface",
        "PricingModel": "Fixed",
        "Tier1Price": Decimal("285.00"),  # Per interface per month
        "IsRequired": False,
    },
    {
        "ProductCode": "INTERFACE-PAYMENT-IMPORT",
        "Name": "Payment Import Interface",
        "Description": "Payment import interface - listed by system name",
        "Category": "Interface",
        "ProductType": "interface",
        "PricingModel": "Fixed",
        "Tier1Price": Decimal("170.00"),  # Per interface per month
        "IsRequired": False,
    },
    {
        "ProductCode": "INTERFACE-TELLER-ONLINE",
        "Name": "Teller Online Interface",
        "Description": "Teller Online integration interface - listed by system name",
        "Category": "Interface",
        "ProductType": "interface",
        "PricingModel": "Fixed",
        "Tier1Price": Decimal("170.00"),  # Per interface per month
        "IsRequired": False,
    },
    # Tiered Module Products
    {
        "ProductCode": "CHECK-SCANNING",
        "Name": "Check Recognition / Bulk Scanning",
        "Description": "Check scanning with MICR recognition",
        "Category": "Module",
        "ProductType": "module",
        "PricingModel": "Tiered",
        # Annual scans: 0-15K=$170, 15K-30K=$340, 30K-60K=$680, 60K-100K=$1030...
        "Tier1Min": 0,
        "Tier1Max": 15000,
        "Tier1Price": Decimal("170.00"),
        "Tier2Min": 15001,
        "Tier2Max": 60000,
        "Tier2Price": Decimal("680.00"),
        "Tier3Min": 60001,
        "Tier3Max": None,
        "Tier3Price": Decimal("1030.00"),
        "IsRequired": False,
    },
    {
        "ProductCode": "REVENUE-SUBMISSION",
        "Name": "Revenue Submission",
        "Description": "Web-based revenue submission portal",
        "Category": "Module",
        "ProductType": "module",
        "PricingModel": "Tiered",
        # Templates/departments: 0-9=$450, 10-24=$570, 25-60=$700, 60+=$900
        "Tier1Min": 0,
        "Tier1Max": 9,
        "Tier1Price": Decimal("450.00"),
        "Tier2Min": 10,
        "Tier2Max": 60,
        "Tier2Price": Decimal("700.00"),
        "Tier3Min": 61,
        "Tier3Max": None,
        "Tier3Price": Decimal("900.00"),
        "IsRequired": False,
    },
    {
        "ProductCode": "TELLER-ONLINE",
        "Name": "Online Customer Portal",
        "Description": "Customer-facing web payment portal",
        "Category": "Module",
        "ProductType": "module",
        "PricingModel": "Tiered",
        # Annual transactions: 0-50K=$700, 50K-100K=$1430, 100K-150K=$2145...
        "Tier1Min": 0,
        "Tier1Max": 50000,
        "Tier1Price": Decimal("700.00"),
        "Tier2Min": 50001,
        "Tier2Max": 150000,
        "Tier2Price": Decimal("2145.00"),
        "Tier3Min": 150001,
        "Tier3Max": None,
        "Tier3Price": Decimal("3575.00"),
        "IsRequired": False,
    },
    {
        "ProductCode": "ONLINE-FORMS",
        "Name": "Online Forms",
        "Description": "Configurable web forms",
        "Category": "Module",
        "ProductType": "module",
        "PricingModel": "Tiered",
        # Form count: 1=$50, 2=$100, 5=$200, 10=$300, 15=$400, 25=$500
        "Tier1Min": 1,
        "Tier1Max": 2,
        "Tier1Price": Decimal("100.00"),
        "Tier2Min": 3,
        "Tier2Max": 10,
        "Tier2Price": Decimal("300.00"),
        "Tier3Min": 11,
        "Tier3Max": None,
        "Tier3Price": Decimal("500.00"),
        "IsRequired": False,
    },
]


# Pricing Rules for configuration-driven calculations
# These define formulas, tiers, and thresholds that administrators can modify
V5_1_PRICING_RULES: list[dict[str, Any]] = [
    {
        "RuleCode": "COMPLEXITY_FACTOR",
        "RuleName": "Organization Setup Complexity Factor",
        "Description": (
            "Calculates the complexity score for Organization Setup tier selection. "
            "Formula: Departments + (Revenue_Templates / 4) + Payment_Imports"
        ),
        "RuleType": "TIER_FORMULA",
        "Configuration": {
            "formula": {
                "type": "weighted_sum",
                "components": [
                    {"parameter": "departments", "weight": 1.0, "label": "Departments"},
                    {
                        "parameter": "revenue_templates",
                        "weight": 0.25,
                        "label": "Revenue Templates",
                    },
                    {"parameter": "payment_imports", "weight": 1.0, "label": "Payment Imports"},
                ],
            },
            "tiers": [
                {
                    "code": "BASIC",
                    "name": "Basic",
                    "min_score": 0,
                    "max_score": 10,
                    "sku_code": "ORG-SETUP-BASIC",
                    "base_price": 64400.00,
                    "estimated_hours": 280,
                },
                {
                    "code": "MEDIUM",
                    "name": "Medium",
                    "min_score": 11,
                    "max_score": 20,
                    "sku_code": "ORG-SETUP-MEDIUM",
                    "base_price": 98440.00,
                    "estimated_hours": 428,
                },
                {
                    "code": "LARGE",
                    "name": "Large",
                    "min_score": 21,
                    "max_score": None,  # No upper limit
                    "sku_code": "ORG-SETUP-LARGE",
                    "base_price": 176640.00,
                    "estimated_hours": 768,
                },
            ],
            "additional_items": {
                "source_parameter": "departments",
                "first_included": 1,
                "sku_code": "ORG-SETUP-ADDITIONAL-DEPT",
                "price_per_item": 4140.00,
                "hours_per_item": 18,
            },
        },
    },
    {
        "RuleCode": "ESCALATION",
        "RuleName": "SaaS Escalation Models",
        "Description": "Defines available escalation models for multi-year SaaS pricing.",
        "RuleType": "OPTIONS",
        "Configuration": {
            "models": {
                "STANDARD_4PCT": {
                    "name": "Standard 4%",
                    "rate": 0.04,
                    "compound": True,
                    "description": "4% annual compound escalation",
                },
                "NONE": {
                    "name": "No Escalation",
                    "rate": 0,
                    "compound": False,
                    "description": "Fixed pricing for contract term",
                },
                "CUSTOM": {
                    "name": "Custom Rate",
                    "rate": None,
                    "compound": True,
                    "user_defined": True,
                    "description": "User-specified annual rate",
                },
            },
            "default_model": "STANDARD_4PCT",
        },
    },
    {
        "RuleCode": "DISCOUNT_LIMITS",
        "RuleName": "Discount Maximum Limits",
        "Description": "Defines maximum discount percentages and approval thresholds.",
        "RuleType": "LIMITS",
        "Configuration": {
            "limits": {
                "saas_year1_max_pct": 15,
                "saas_all_years_max_pct": 10,
                "setup_max_pct": 20,
                "setup_max_fixed": 50000,
            },
            "approval_thresholds": {
                "no_approval": {"saas_pct": 0, "setup_pct": 0},
                "manager": {"saas_pct": 5, "setup_pct": 10},
                "director": {"saas_pct": 10, "setup_pct": 15},
                "vp": {"saas_pct": 15, "setup_pct": 20},
            },
        },
    },
    {
        "RuleCode": "TRAVEL_FORMULA",
        "RuleName": "Travel Cost Calculation Formula",
        "Description": "Defines how travel costs are calculated for each trip.",
        "RuleType": "FORMULA",
        "Configuration": {
            "formula": {
                "type": "expression",
                "expression": "(airfare * people) + (hotel * people * nights) + (per_diem * people * nights) + (vehicle * nights)",
                "variables": {
                    "nights": {"formula": "days + 1", "description": "Arrive evening before"},
                    "airfare": {"source": "zone.AirfareEstimate"},
                    "hotel": {"source": "zone.HotelRate"},
                    "per_diem": {"source": "zone.PerDiemRate"},
                    "vehicle": {"source": "zone.VehicleRate"},
                },
            },
            "included_trips": {
                "description": "Organization Setup includes 4 on-site trips",
                "count": 4,
                "default_days": 2,
                "default_people": 2,
            },
        },
    },
    {
        "RuleCode": "TELLER_PAYMENTS",
        "RuleName": "Teller Payments Discount",
        "Description": "Discount applied when Teller Payments is enabled.",
        "RuleType": "DISCOUNT",
        "Configuration": {
            "discount_type": "percentage",
            "applies_to": "saas_all_years",
            "discount_value": 10,
            "condition": {"parameter": "teller_payments_enabled", "value": True},
            "description": "10% discount on SaaS when using Teller Payments",
        },
    },
    {
        "RuleCode": "REFERRAL_COMMISSION",
        "RuleName": "Referral Commission Calculation",
        "Description": "Defines how referral commissions are calculated.",
        "RuleType": "FORMULA",
        "Configuration": {
            "formula": {
                "type": "percentage",
                "base": "setup_total_after_discounts",
                "rate_source": "referrer.default_rate",
                "override_allowed": True,
            },
            "default_rate": 10,
            "max_rate": 20,
        },
    },
]


def get_v5_1_skus() -> list[dict[str, Any]]:
    """Return v5.1 SKU seed data."""
    return V5_1_SKUS


def get_v5_1_travel_zones() -> list[dict[str, Any]]:
    """Return v5.1 travel zone seed data."""
    return V5_1_TRAVEL_ZONES


def get_v5_1_saas_products() -> list[dict[str, Any]]:
    """Return v5.1 SaaS product seed data."""
    return V5_1_SAAS_PRODUCTS


def get_v5_1_pricing_rules() -> list[dict[str, Any]]:
    """Return v5.1 pricing rules seed data."""
    return V5_1_PRICING_RULES
