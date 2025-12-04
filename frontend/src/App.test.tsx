import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the application title", () => {
    render(<App />);
    expect(screen.getByText("Teller Quoting System")).toBeInTheDocument();
  });

  it("renders the system status section", () => {
    render(<App />);
    expect(screen.getByText("System Status")).toBeInTheDocument();
  });
});
