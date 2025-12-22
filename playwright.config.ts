import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * These tests run against the full application stack:
 * - Frontend (Vite dev server on port 5173)
 * - Backend (FastAPI on port 8000)
 * - Database (PostgreSQL via Docker)
 *
 * Before running tests, ensure all services are running:
 *   docker-compose up -d postgres
 *   cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
 *   cd frontend && npm run dev
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run tests sequentially for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Optionally start servers before tests
  // Uncomment if you want Playwright to manage the servers
  // webServer: [
  //   {
  //     command: 'cd frontend && npm run dev',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000',
  //     url: 'http://localhost:8000/health',
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],
});
