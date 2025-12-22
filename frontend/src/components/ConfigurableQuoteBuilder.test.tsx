/**
 * Tests for ConfigurableQuoteBuilder component
 *
 * These tests verify the modules section works correctly with dynamic
 * module loading from the API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigurableQuoteBuilder from "./ConfigurableQuoteBuilder";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock API responses
const createMockModulesResponse = () => ({
  modules: [
    {
      module_code: "CHECK-RECOGNITION",
      module_name: "Check Recognition",
      description: "Bulk scanning and check processing",
      sub_parameters: {
        scan_volume: {
          type: "number",
          label: "Annual Scan Volume",
          min: 0,
          max: 1000000,
          default: 0,
          help: "Number of checks scanned per year",
        },
        is_new: {
          type: "boolean",
          label: "New implementation",
          default: false,
          help: "requires setup: $12,880",
        },
      },
      selection_rules: {},
      saas_product_code: "SAAS-CHECK",
      sort_order: 1,
    },
    {
      module_code: "REVENUE-SUBMISSION",
      module_name: "Revenue Submission Portal",
      description: "Online revenue submission",
      sub_parameters: {
        num_submitters: {
          type: "number",
          label: "Number of Submitters",
          min: 0,
          default: 0,
        },
        is_new: {
          type: "boolean",
          label: "New implementation",
          default: false,
        },
      },
      selection_rules: {},
      saas_product_code: "SAAS-REVENUE",
      sort_order: 2,
    },
    {
      module_code: "IVR-PAYMENTS",
      module_name: "IVR Phone Payments",
      description: "Telephone payment processing",
      sub_parameters: {
        monthly_calls: {
          type: "number",
          label: "Expected Monthly Calls",
          min: 0,
          default: 0,
        },
      },
      selection_rules: {},
      saas_product_code: "SAAS-IVR",
      sort_order: 3,
    },
  ],
});

const createMockIntegrationsResponse = () => ({
  mature_integrations: [
    {
      integration_code: "INT-001",
      system_name: "Banner",
      vendor: "Ellucian",
      comments: "ERP Integration",
    },
  ],
});

const createMockConfigureResponse = () => ({
  selected_products: [],
  setup_skus: [],
  total_monthly_cost: 0,
  total_setup_cost: 0,
  summary: "Base configuration",
});

describe("ConfigurableQuoteBuilder - Modules Section", () => {
  beforeEach(() => {
    mockFetch.mockReset();

    // Set up default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/saas-config/available-modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createMockModulesResponse()),
        });
      }
      if (url.includes("/saas-config/available-integrations")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createMockIntegrationsResponse()),
        });
      }
      if (url.includes("/saas-config/configure")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createMockConfigureResponse()),
        });
      }
      if (url.includes("/referrers")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes("/travel-zones")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes("/quote-calculations/complexity-factor")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              complexity_score: 1,
              tier: "BASIC",
              tier_name: "Basic",
              base_price: 18400,
              sku_code: "SKU-SETUP-BASIC",
              additional_dept_count: 0,
              additional_dept_price: 0,
            }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Unknown endpoint" }),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Module Loading", () => {
    it("shows loading state while fetching modules", async () => {
      // Delay the modules response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/saas-config/available-modules")) {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(createMockModulesResponse()),
                }),
              100,
            ),
          );
        }
        // Return default responses for other endpoints
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<ConfigurableQuoteBuilder />);

      // Initially should show loading
      expect(screen.getByText("Loading modules...")).toBeInTheDocument();

      // Wait for modules to load
      await waitFor(() => {
        expect(
          screen.queryByText("Loading modules..."),
        ).not.toBeInTheDocument();
      });
    });

    it("renders all modules from API response", async () => {
      render(<ConfigurableQuoteBuilder />);

      // Wait for modules to load
      await waitFor(() => {
        expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      });

      expect(screen.getByText("Revenue Submission Portal")).toBeInTheDocument();
      expect(screen.getByText("IVR Phone Payments")).toBeInTheDocument();
    });

    it("shows module descriptions", async () => {
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(
          screen.getByText("Bulk scanning and check processing"),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Online revenue submission")).toBeInTheDocument();
      expect(
        screen.getByText("Telephone payment processing"),
      ).toBeInTheDocument();
    });

    it("renders modules in sort_order", async () => {
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      });

      // Get all module names in order
      const moduleNames = screen
        .getAllByText(
          /Check Recognition|Revenue Submission Portal|IVR Phone Payments/,
        )
        .map((el) => el.textContent);

      expect(moduleNames[0]).toBe("Check Recognition");
      expect(moduleNames[1]).toBe("Revenue Submission Portal");
      expect(moduleNames[2]).toBe("IVR Phone Payments");
    });
  });

  describe("Module Enable/Disable", () => {
    it("modules are disabled by default", async () => {
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      });

      // Find all checkboxes in the modules section
      const checkboxes = screen.getAllByRole("checkbox");
      // First few checkboxes should be unchecked (module enable checkboxes)
      expect(checkboxes[0]).not.toBeChecked();
    });

    it("enabling a module shows its parameters", async () => {
      const user = userEvent.setup();
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      });

      // Parameters should not be visible initially
      expect(screen.queryByText("Annual Scan Volume")).not.toBeInTheDocument();

      // Find module container and its checkbox - traverse up to the parent container
      const moduleCard = screen
        .getByText("Check Recognition")
        .closest('[class*="bg-[#1a1d21]"]');
      const enableCheckbox = within(moduleCard!).getByRole("checkbox");
      await user.click(enableCheckbox);

      // Now parameters should be visible
      await waitFor(() => {
        expect(screen.getByText("Annual Scan Volume")).toBeInTheDocument();
      });
    });

    it("disabling a module hides its parameters", async () => {
      const user = userEvent.setup();
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      });

      // Enable the module first
      const moduleCard = screen
        .getByText("Check Recognition")
        .closest('[class*="bg-[#1a1d21]"]');
      const enableCheckbox = within(moduleCard!).getByRole("checkbox");
      await user.click(enableCheckbox);

      // Parameters should be visible
      await waitFor(() => {
        expect(screen.getByText("Annual Scan Volume")).toBeInTheDocument();
      });

      // Disable the module
      await user.click(enableCheckbox);

      // Parameters should be hidden
      await waitFor(() => {
        expect(
          screen.queryByText("Annual Scan Volume"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Dynamic Module Addition (New Module Types)", () => {
    it("renders a new module type added via API without code changes", async () => {
      // This test verifies the core configuration-driven requirement:
      // Adding "IVR Phone Payments" module only required database config, not code
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("IVR Phone Payments")).toBeInTheDocument();
      });

      // Verify it has its parameters
      const user = userEvent.setup();
      const ivrSection = screen
        .getByText("IVR Phone Payments")
        .closest("button");
      await user.click(ivrSection!);

      // Enable the module
      const ivrContainer = screen
        .getByText("IVR Phone Payments")
        .closest("div")?.parentElement;
      const enableCheckbox = within(ivrContainer!).getByRole("checkbox");
      await user.click(enableCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Expected Monthly Calls")).toBeInTheDocument();
      });
    });

    it("handles modules with no parameters gracefully", async () => {
      // Override mock to include a module with no sub_parameters
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/saas-config/available-modules")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                modules: [
                  {
                    module_code: "SIMPLE-MODULE",
                    module_name: "Simple Add-On",
                    description: "A simple module with no configuration",
                    sub_parameters: {},
                    selection_rules: {},
                    saas_product_code: null,
                    sort_order: 1,
                  },
                ],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("Simple Add-On")).toBeInTheDocument();
      });

      // Should render without errors
      expect(
        screen.getByText("A simple module with no configuration"),
      ).toBeInTheDocument();
    });
  });

  describe("API Error Handling", () => {
    it("shows no modules message when API returns empty array", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/saas-config/available-modules")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ modules: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("No modules available")).toBeInTheDocument();
      });
    });

    it("handles API error gracefully", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/saas-config/available-modules")) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Server error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<ConfigurableQuoteBuilder />);

      // Should show empty state after error
      await waitFor(() => {
        expect(screen.getByText("No modules available")).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Module Configuration Integration", () => {
    it("calls configure API when module is enabled", async () => {
      const user = userEvent.setup();
      render(<ConfigurableQuoteBuilder />);

      await waitFor(() => {
        expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      });

      // Clear previous calls
      mockFetch.mockClear();

      // Enable a module using proper selector
      const moduleCard = screen
        .getByText("Check Recognition")
        .closest('[class*="bg-[#1a1d21]"]');
      const enableCheckbox = within(moduleCard!).getByRole("checkbox");
      await user.click(enableCheckbox);

      // Wait for debounced configure call
      await waitFor(
        () => {
          const configureCalls = mockFetch.mock.calls.filter((call) =>
            call[0].includes("/saas-config/configure"),
          );
          expect(configureCalls.length).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );
    });
  });
});
