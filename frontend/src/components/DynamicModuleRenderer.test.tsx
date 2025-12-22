/**
 * Tests for DynamicModuleRenderer component
 *
 * These tests verify that modules render correctly based on backend SubParameters,
 * ensuring the configuration-driven UI works properly.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DynamicModuleRenderer, {
  ModuleConfig,
  ModuleValues,
} from "./DynamicModuleRenderer";

// Helper to create a basic module config
function createModuleConfig(
  overrides: Partial<ModuleConfig> = {},
): ModuleConfig {
  return {
    module_code: "TEST-MODULE",
    module_name: "Test Module",
    description: "A test module for unit testing",
    sub_parameters: {},
    selection_rules: {},
    saas_product_code: null,
    sort_order: 1,
    ...overrides,
  };
}

// Default props for rendering
const defaultProps = {
  values: {} as ModuleValues,
  onChange: vi.fn(),
  onEnabledChange: vi.fn(),
  isEnabled: false,
  isExpanded: false,
  onToggleExpand: vi.fn(),
};

describe("DynamicModuleRenderer", () => {
  describe("Basic Rendering", () => {
    it("renders module name and description", () => {
      const module = createModuleConfig({
        module_name: "Check Recognition",
        description: "Bulk scanning and check processing",
      });

      render(<DynamicModuleRenderer {...defaultProps} module={module} />);

      expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      expect(
        screen.getByText("Bulk scanning and check processing"),
      ).toBeInTheDocument();
    });

    it("renders enable checkbox unchecked by default", () => {
      const module = createModuleConfig();

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={false}
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });

    it("renders enable checkbox checked when isEnabled is true", () => {
      const module = createModuleConfig();

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("does not show expand icon when module has no sub_parameters", () => {
      const module = createModuleConfig({ sub_parameters: {} });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      // ChevronDown/ChevronRight should not be present
      expect(screen.queryByTestId("chevron-icon")).not.toBeInTheDocument();
    });
  });

  describe("Enable/Disable Functionality", () => {
    it("calls onEnabledChange when checkbox is clicked", async () => {
      const onEnabledChange = vi.fn();
      const module = createModuleConfig({ module_code: "MY-MODULE" });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          onEnabledChange={onEnabledChange}
          isEnabled={false}
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      await userEvent.click(checkbox);

      expect(onEnabledChange).toHaveBeenCalledWith("MY-MODULE", true);
    });

    it("calls onToggleExpand when header is clicked", async () => {
      const onToggleExpand = vi.fn();
      const module = createModuleConfig();

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          onToggleExpand={onToggleExpand}
        />,
      );

      // Click the header button (not the checkbox)
      const headerButton = screen.getByRole("button");
      await userEvent.click(headerButton);

      expect(onToggleExpand).toHaveBeenCalled();
    });
  });

  describe("Number Parameter Type", () => {
    it("renders number input with label", () => {
      const module = createModuleConfig({
        sub_parameters: {
          scan_volume: {
            type: "number",
            label: "Annual Scan Volume",
            min: 0,
            max: 1000000,
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("Annual Scan Volume")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("shows required indicator for required number fields", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Item Count",
            required: true,
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("shows help text for number fields", () => {
      const module = createModuleConfig({
        sub_parameters: {
          volume: {
            type: "number",
            label: "Volume",
            help: "Enter annual transaction volume",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(
        screen.getByText("Enter annual transaction volume"),
      ).toBeInTheDocument();
    });

    it("calls onChange when number value changes", async () => {
      const onChange = vi.fn();
      const module = createModuleConfig({
        module_code: "TEST-MOD",
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          onChange={onChange}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "42" } });

      expect(onChange).toHaveBeenCalledWith("TEST-MOD", "count", 42);
    });

    it("displays current value from values prop", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          values={{ count: 100 }}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("100");
    });
  });

  describe("Boolean Parameter Type", () => {
    it("renders checkbox for boolean parameters", () => {
      const module = createModuleConfig({
        sub_parameters: {
          is_new: {
            type: "boolean",
            label: "New implementation",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("New implementation")).toBeInTheDocument();
      // Should have 2 checkboxes: module enable + is_new parameter
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(2);
    });

    it("shows help text inline for boolean parameters", () => {
      const module = createModuleConfig({
        sub_parameters: {
          is_new: {
            type: "boolean",
            label: "New implementation",
            help: "requires setup fee",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("(requires setup fee)")).toBeInTheDocument();
    });

    it("calls onChange when boolean is toggled", async () => {
      const onChange = vi.fn();
      const module = createModuleConfig({
        module_code: "MY-MOD",
        sub_parameters: {
          is_new: {
            type: "boolean",
            label: "New implementation",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          onChange={onChange}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      // Find the second checkbox (first is module enable, second is is_new)
      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[1]);

      expect(onChange).toHaveBeenCalledWith("MY-MOD", "is_new", true);
    });
  });

  describe("Text Parameter Type", () => {
    it("renders text input with label", () => {
      const module = createModuleConfig({
        sub_parameters: {
          notes: {
            type: "text",
            label: "Additional Notes",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("Additional Notes")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("calls onChange when text value changes", async () => {
      const onChange = vi.fn();
      const module = createModuleConfig({
        module_code: "TEXT-MOD",
        sub_parameters: {
          notes: {
            type: "text",
            label: "Notes",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          onChange={onChange}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "Hello");

      // userEvent.type fires onChange for each character
      expect(onChange).toHaveBeenCalledWith("TEXT-MOD", "notes", "H");
    });
  });

  describe("Select Parameter Type", () => {
    it("renders select dropdown with options", () => {
      const module = createModuleConfig({
        sub_parameters: {
          tier: {
            type: "select",
            label: "Volume Tier",
            options: [
              { value: "small", label: "Small (0-50K)" },
              { value: "medium", label: "Medium (50K-150K)" },
              { value: "large", label: "Large (150K+)" },
            ],
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("Volume Tier")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Small (0-50K)")).toBeInTheDocument();
      expect(screen.getByText("Medium (50K-150K)")).toBeInTheDocument();
      expect(screen.getByText("Large (150K+)")).toBeInTheDocument();
    });

    it("calls onChange when select value changes", async () => {
      const onChange = vi.fn();
      const module = createModuleConfig({
        module_code: "SEL-MOD",
        sub_parameters: {
          tier: {
            type: "select",
            label: "Tier",
            options: [
              { value: "small", label: "Small" },
              { value: "large", label: "Large" },
            ],
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          onChange={onChange}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "large");

      expect(onChange).toHaveBeenCalledWith("SEL-MOD", "tier", "large");
    });
  });

  describe("DependsOn Conditional Display", () => {
    it("hides parameter when dependsOn condition is not met", () => {
      const module = createModuleConfig({
        sub_parameters: {
          is_new: {
            type: "boolean",
            label: "New implementation",
          },
          setup_notes: {
            type: "text",
            label: "Setup Notes",
            dependsOn: { field: "is_new", value: true },
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          values={{ is_new: false }}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("New implementation")).toBeInTheDocument();
      expect(screen.queryByText("Setup Notes")).not.toBeInTheDocument();
    });

    it("shows parameter when dependsOn condition is met", () => {
      const module = createModuleConfig({
        sub_parameters: {
          is_new: {
            type: "boolean",
            label: "New implementation",
          },
          setup_notes: {
            type: "text",
            label: "Setup Notes",
            dependsOn: { field: "is_new", value: true },
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          values={{ is_new: true }}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("New implementation")).toBeInTheDocument();
      expect(screen.getByText("Setup Notes")).toBeInTheDocument();
    });
  });

  describe("Unsupported Parameter Types", () => {
    it("shows unsupported message for unknown parameter types", () => {
      const module = createModuleConfig({
        sub_parameters: {
          custom: {
            type: "unknown_type" as "text", // Force unknown type
            label: "Custom Field",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(
        screen.getByText(/Unsupported parameter type: unknown_type/),
      ).toBeInTheDocument();
    });
  });

  describe("Expansion State", () => {
    it("does not show parameters when isExpanded is false", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={false}
        />,
      );

      expect(screen.queryByText("Count")).not.toBeInTheDocument();
    });

    it("shows parameters when isExpanded is true", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("Count")).toBeInTheDocument();
    });

    it("does not show parameters when module is disabled even if expanded", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={false}
          isExpanded={true}
        />,
      );

      expect(screen.queryByText("Count")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Parameters", () => {
    it("renders all parameters for a complex module", () => {
      const module = createModuleConfig({
        module_name: "Check Recognition",
        sub_parameters: {
          scan_volume: {
            type: "number",
            label: "Annual Scan Volume",
            help: "Number of checks per year",
          },
          is_new: {
            type: "boolean",
            label: "New implementation",
            help: "requires setup: $12,880",
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      expect(screen.getByText("Check Recognition")).toBeInTheDocument();
      expect(screen.getByText("Annual Scan Volume")).toBeInTheDocument();
      expect(screen.getByText("Number of checks per year")).toBeInTheDocument();
      expect(screen.getByText("New implementation")).toBeInTheDocument();
      expect(screen.getByText("(requires setup: $12,880)")).toBeInTheDocument();
    });
  });

  describe("Default Values", () => {
    it("uses default value from config when no value provided", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
            default: 50,
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          values={{}}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("50");
    });

    it("uses provided value over default", () => {
      const module = createModuleConfig({
        sub_parameters: {
          count: {
            type: "number",
            label: "Count",
            default: 50,
          },
        },
      });

      render(
        <DynamicModuleRenderer
          {...defaultProps}
          module={module}
          values={{ count: 100 }}
          isEnabled={true}
          isExpanded={true}
        />,
      );

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("100");
    });
  });
});
