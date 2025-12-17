/**
 * Dynamic Module Renderer
 *
 * Renders module configuration UI based on SubParameters from the backend.
 * This allows adding new modules without frontend code changes.
 */

import { ChevronDown, ChevronRight } from "lucide-react";

// Types matching backend SubParameters structure
export interface SubParameterConfig {
  type: "number" | "boolean" | "text" | "select" | "array";
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  default?: unknown;
  help?: string;
  options?: { value: string; label: string }[];
  dependsOn?: { field: string; value: unknown };
}

export interface ModuleConfig {
  module_code: string;
  module_name: string;
  description: string;
  sub_parameters: Record<string, SubParameterConfig>;
  selection_rules: Record<string, unknown>;
  saas_product_code: string | null;
  sort_order: number;
}

export type ModuleValues = Record<string, unknown>;

interface DynamicModuleRendererProps {
  module: ModuleConfig;
  values: ModuleValues;
  onChange: (moduleCode: string, paramKey: string, value: unknown) => void;
  onEnabledChange: (moduleCode: string, enabled: boolean) => void;
  isEnabled: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Check if a parameter should be shown based on dependsOn condition
 */
function shouldShowParameter(
  param: SubParameterConfig,
  values: ModuleValues,
): boolean {
  if (!param.dependsOn) return true;
  const { field, value } = param.dependsOn;
  return values[field] === value;
}

/**
 * Render a single parameter input based on its type
 */
function renderParameterInput(
  paramKey: string,
  param: SubParameterConfig,
  value: unknown,
  onChange: (value: unknown) => void,
): JSX.Element {
  switch (param.type) {
    case "number":
      return (
        <div key={paramKey}>
          <label className="block text-sm text-[#A5A5A5] mb-1">
            {param.label}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="number"
            min={param.min}
            max={param.max}
            value={(value as number) ?? param.default ?? 0}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
          />
          {param.help && (
            <p className="text-xs text-[#6a7583] mt-1">{param.help}</p>
          )}
        </div>
      );

    case "boolean":
      return (
        <div key={paramKey} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={(value as boolean) ?? param.default ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
          />
          <label className="text-sm text-[#A5A5A5]">{param.label}</label>
          {param.help && (
            <span className="text-xs text-[#6a7583] ml-2">({param.help})</span>
          )}
        </div>
      );

    case "text":
      return (
        <div key={paramKey}>
          <label className="block text-sm text-[#A5A5A5] mb-1">
            {param.label}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) ?? param.default ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
          />
          {param.help && (
            <p className="text-xs text-[#6a7583] mt-1">{param.help}</p>
          )}
        </div>
      );

    case "select":
      return (
        <div key={paramKey}>
          <label className="block text-sm text-[#A5A5A5] mb-1">
            {param.label}
            {param.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <select
            value={(value as string) ?? param.default ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
          >
            <option value="">Select...</option>
            {param.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {param.help && (
            <p className="text-xs text-[#6a7583] mt-1">{param.help}</p>
          )}
        </div>
      );

    default:
      return (
        <div key={paramKey} className="text-sm text-[#6a7583]">
          Unsupported parameter type: {param.type}
        </div>
      );
  }
}

/**
 * Dynamic Module Renderer Component
 */
export default function DynamicModuleRenderer({
  module,
  values,
  onChange,
  onEnabledChange,
  isEnabled,
  isExpanded,
  onToggleExpand,
}: DynamicModuleRendererProps) {
  const hasSubParameters = Object.keys(module.sub_parameters).length > 0;

  return (
    <div className="bg-[#1a1d21] rounded-lg border border-[#4a5563] overflow-hidden">
      {/* Module Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2a2f35]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              e.stopPropagation();
              onEnabledChange(module.module_code, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
          />
          <div className="text-left">
            <span className="text-base font-medium text-[#E6E6E6]">
              {module.module_name}
            </span>
            {module.description && (
              <p className="text-xs text-[#6a7583] mt-0.5">
                {module.description}
              </p>
            )}
          </div>
        </div>
        {hasSubParameters && isEnabled && (
          <span className="text-[#6FCBDC]">
            {isExpanded ? (
              <ChevronDown size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </span>
        )}
      </button>

      {/* Sub-Parameters */}
      {isEnabled && isExpanded && hasSubParameters && (
        <div className="px-4 pb-4 pt-2 ml-8 space-y-3 border-t border-[#4a5563]/50">
          {Object.entries(module.sub_parameters).map(([paramKey, param]) => {
            if (!shouldShowParameter(param, values)) return null;
            return renderParameterInput(
              paramKey,
              param,
              values[paramKey],
              (val) => onChange(module.module_code, paramKey, val),
            );
          })}
        </div>
      )}
    </div>
  );
}
