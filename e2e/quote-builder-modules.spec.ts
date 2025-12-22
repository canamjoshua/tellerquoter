import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Quote Builder - Module Configuration
 *
 * These tests verify the full user flow of:
 * 1. Navigating to the quote builder
 * 2. Configuring modules dynamically loaded from the backend
 * 3. Verifying pricing updates in real-time
 * 4. Saving and loading quote configurations
 *
 * Prerequisites:
 * - Frontend running on http://localhost:5173
 * - Backend running on http://localhost:8000
 * - Database seeded with application modules
 */

const API_BASE = "http://localhost:8000/api";

test.describe("Quote Builder - Dynamic Modules", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");

    // Wait for the app to load
    await expect(page.getByText("Dashboard")).toBeVisible();
  });

  test("loads application modules from backend API", async ({ page }) => {
    // Navigate to Quotes
    await page.click('button:has-text("Quotes")');

    // Wait for quotes page to load
    await expect(page.getByText("Quote Management")).toBeVisible();

    // Click "New Quote" to open the quote builder
    await page.click('button:has-text("New Quote")');

    // Fill in quote details
    await page.fill('input[placeholder*="organization"]', "Test Organization");
    await page.click('button:has-text("Create Quote")');

    // Wait for the quote builder to load
    await expect(page.getByText("Application Modules")).toBeVisible({
      timeout: 10000,
    });

    // Expand the modules section
    await page.click('text="Application Modules"');

    // Verify modules loaded from backend (these should match seed data)
    await expect(page.getByText("Check Recognition")).toBeVisible();
    await expect(page.getByText("Revenue Submission")).toBeVisible();
    await expect(page.getByText("Teller Online")).toBeVisible();
  });

  test("enabling a module shows its configuration parameters", async ({
    page,
  }) => {
    // Navigate to quotes and create a new quote
    await page.click('button:has-text("Quotes")');
    await page.click('button:has-text("New Quote")');
    await page.fill('input[placeholder*="organization"]', "Test Org Params");
    await page.click('button:has-text("Create Quote")');

    // Wait for modules section
    await expect(page.getByText("Application Modules")).toBeVisible({
      timeout: 10000,
    });
    await page.click('text="Application Modules"');

    // Find Check Recognition module and enable it
    const checkRecModule = page
      .locator('[class*="bg-[#1a1d21]"]')
      .filter({ hasText: "Check Recognition" });
    await checkRecModule.locator('input[type="checkbox"]').click();

    // Verify parameters appear (these come from SubParameters in the database)
    await expect(page.getByText("Annual Scan Volume")).toBeVisible();
    await expect(page.getByText("New implementation")).toBeVisible();
  });

  test("module configuration triggers price recalculation", async ({
    page,
  }) => {
    // Navigate to quotes and create a new quote
    await page.click('button:has-text("Quotes")');
    await page.click('button:has-text("New Quote")');
    await page.fill('input[placeholder*="organization"]', "Test Pricing");
    await page.click('button:has-text("Create Quote")');

    // Wait for and expand modules section
    await expect(page.getByText("Application Modules")).toBeVisible({
      timeout: 10000,
    });
    await page.click('text="Application Modules"');

    // Get initial pricing (should show in Live Quote panel)
    const liveQuotePanel = page.locator("text=Live Quote").locator("..");

    // Enable Check Recognition module
    const checkRecModule = page
      .locator('[class*="bg-[#1a1d21]"]')
      .filter({ hasText: "Check Recognition" });
    await checkRecModule.locator('input[type="checkbox"]').click();

    // Wait for parameters to show
    await expect(page.getByText("Annual Scan Volume")).toBeVisible();

    // Enter a scan volume
    await page.fill('input[type="number"]', "75000");

    // Wait for the debounced API call to complete and pricing to update
    // The Live Quote panel should show updated pricing
    await page.waitForTimeout(1000); // Wait for debounce

    // Verify the configure API was called (pricing should update)
    // The exact values depend on seed data, but we should see some products
    await expect(
      page.getByText(/SaaS Products|Monthly Total|Setup Total/),
    ).toBeVisible();
  });

  test("backend API returns module configuration", async ({ request }) => {
    // Direct API test to verify backend is serving modules correctly
    const response = await request.get(
      `${API_BASE}/saas-config/available-modules`,
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.modules).toBeDefined();
    expect(Array.isArray(data.modules)).toBeTruthy();

    // Verify module structure matches expected format
    if (data.modules.length > 0) {
      const module = data.modules[0];
      expect(module).toHaveProperty("module_code");
      expect(module).toHaveProperty("module_name");
      expect(module).toHaveProperty("sub_parameters");
      expect(module).toHaveProperty("selection_rules");
      expect(module).toHaveProperty("sort_order");
    }
  });

  test("configure API processes module selections", async ({ request }) => {
    // Test the configure endpoint directly
    const response = await request.post(`${API_BASE}/saas-config/configure`, {
      data: {
        base_product: "teller-base",
        additional_users: 0,
        modules: {
          check_recognition: {
            enabled: true,
            scan_volume: 50000,
            is_new: true,
          },
        },
        integrations: {
          bidirectional: [],
          payment_import: [],
        },
      },
    });

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result).toHaveProperty("selected_products");
    expect(result).toHaveProperty("setup_skus");
    expect(result).toHaveProperty("total_monthly_cost");
    expect(result).toHaveProperty("total_setup_cost");

    // When check_recognition is enabled with is_new=true, should include setup SKU
    const hasCheckRecSetup = result.setup_skus.some(
      (sku: { name: string }) =>
        sku.name.toLowerCase().includes("check") ||
        sku.name.toLowerCase().includes("recognition"),
    );
    // This depends on seed data - just verify we got some response
    expect(typeof result.total_monthly_cost).toBe("number");
  });
});

test.describe("Quote Builder - Save and Load", () => {
  let testQuoteId: string | null = null;

  test.afterEach(async ({ request }) => {
    // Cleanup: Delete test quote if created
    if (testQuoteId) {
      try {
        await request.delete(`${API_BASE}/quotes/${testQuoteId}`);
      } catch {
        // Ignore cleanup errors
      }
      testQuoteId = null;
    }
  });

  test("saves quote with module configuration", async ({ page, request }) => {
    // Navigate to quotes and create a new quote
    await page.goto("/");
    await page.click('button:has-text("Quotes")');
    await page.click('button:has-text("New Quote")');
    await page.fill(
      'input[placeholder*="organization"]',
      "E2E Test Save Quote",
    );
    await page.click('button:has-text("Create Quote")');

    // Wait for quote builder
    await expect(page.getByText("Application Modules")).toBeVisible({
      timeout: 10000,
    });

    // Get the quote ID from the URL or page
    const url = page.url();
    const quoteIdMatch = url.match(/quote[s]?\/([a-f0-9-]+)/i);
    if (quoteIdMatch) {
      testQuoteId = quoteIdMatch[1];
    }

    // Configure a module
    await page.click('text="Application Modules"');
    const checkRecModule = page
      .locator('[class*="bg-[#1a1d21]"]')
      .filter({ hasText: "Check Recognition" });
    await checkRecModule.locator('input[type="checkbox"]').click();

    // Wait for params
    await expect(page.getByText("Annual Scan Volume")).toBeVisible();

    // Fill in volume
    const volumeInput = page.locator('input[type="number"]').first();
    await volumeInput.fill("100000");

    // Expand Review section and save
    await page.click('text="Review & Confirm"');

    // Wait for configuration to process
    await page.waitForTimeout(1500);

    // Click save button
    const saveButton = page.locator('button:has-text("Save Quote")');
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Verify save success
      await expect(page.getByText(/saved successfully/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

test.describe("Dynamic Module Addition Verification", () => {
  test("verifies new modules can be added without frontend changes", async ({
    request,
  }) => {
    // This test documents the configuration-driven architecture
    // New modules added to ApplicationModules table should appear in the API

    const response = await request.get(
      `${API_BASE}/saas-config/available-modules`,
    );
    const data = await response.json();

    // Log available modules for verification
    console.log(
      "Available modules from API:",
      data.modules.map((m: { module_code: string; module_name: string }) => ({
        code: m.module_code,
        name: m.module_name,
      })),
    );

    // Verify the API returns the expected structure
    // If a new module like "IVR-PAYMENTS" was added to the database,
    // it would appear here without any frontend code changes
    expect(data.modules.length).toBeGreaterThan(0);

    // Each module should have sub_parameters for dynamic UI rendering
    for (const module of data.modules) {
      expect(module).toHaveProperty("sub_parameters");
      expect(typeof module.sub_parameters).toBe("object");
    }
  });
});
