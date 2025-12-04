import { useState, useEffect, useCallback } from "react";
import type { QuoteVersion } from "../types/quote";

const API_BASE_URL = "/api";

interface QuoteVersionComparisonProps {
  quoteId: string;
  onClose: () => void;
}

export default function QuoteVersionComparison({
  quoteId,
  onClose,
}: QuoteVersionComparisonProps) {
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/quotes/${quoteId}/versions/`,
      );
      if (!response.ok) throw new Error("Failed to fetch versions");
      const data = await response.json();
      setVersions(data);
      // Auto-select first two versions if available
      if (data.length >= 2) {
        setSelectedVersions([data[0].VersionNumber, data[1].VersionNumber]);
      } else if (data.length === 1) {
        setSelectedVersions([data[0].VersionNumber]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const toggleVersion = (versionNumber: number) => {
    if (selectedVersions.includes(versionNumber)) {
      setSelectedVersions(selectedVersions.filter((v) => v !== versionNumber));
    } else {
      if (selectedVersions.length < 3) {
        setSelectedVersions([...selectedVersions, versionNumber]);
      }
    }
  };

  const getVersionsToCompare = () => {
    return versions
      .filter((v) => selectedVersions.includes(v.VersionNumber))
      .sort((a, b) => a.VersionNumber - b.VersionNumber);
  };

  const calculateDifference = (v1: number | null, v2: number | null) => {
    if (v1 === null || v2 === null) return null;
    const diff = v2 - v1;
    const percentChange = v1 !== 0 ? ((diff / v1) * 100).toFixed(1) : "N/A";
    return { diff, percentChange };
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `$${value.toLocaleString()}`;
  };

  const versionsToCompare = getVersionsToCompare();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading versions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={onClose}
              className="text-blue-400 hover:text-blue-300 mb-2"
            >
              ← Back to Quote
            </button>
            <h1 className="text-4xl font-bold">Version Comparison</h1>
            <p className="text-gray-400 mt-2">
              Compare up to 3 versions side-by-side
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Version Selector */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">
            Select Versions to Compare (max 3)
          </h2>
          <div className="flex flex-wrap gap-2">
            {versions.map((version) => (
              <button
                key={version.Id}
                onClick={() => toggleVersion(version.VersionNumber)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedVersions.includes(version.VersionNumber)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                } ${
                  !selectedVersions.includes(version.VersionNumber) &&
                  selectedVersions.length >= 3
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={
                  !selectedVersions.includes(version.VersionNumber) &&
                  selectedVersions.length >= 3
                }
              >
                Version {version.VersionNumber}
                <span className="ml-2 text-xs opacity-75">
                  ({version.VersionStatus})
                </span>
              </button>
            ))}
          </div>
        </div>

        {versionsToCompare.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <p className="text-xl text-gray-400">Select versions to compare</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold w-64">
                    Attribute
                  </th>
                  {versionsToCompare.map((version) => (
                    <th
                      key={version.Id}
                      className="px-6 py-4 text-left text-sm font-bold"
                    >
                      <div className="flex flex-col">
                        <span className="text-blue-400">
                          Version {version.VersionNumber}
                        </span>
                        <span className="text-xs text-gray-400 font-normal">
                          {new Date(version.CreatedAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-xs font-normal mt-1 inline-block px-2 py-1 rounded ${
                            version.VersionStatus === "DRAFT"
                              ? "bg-gray-600"
                              : version.VersionStatus === "SENT"
                                ? "bg-blue-600"
                                : "bg-green-600"
                          }`}
                        >
                          {version.VersionStatus}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {/* Totals Section */}
                <tr className="bg-gray-750">
                  <td
                    colSpan={versionsToCompare.length + 1}
                    className="px-6 py-3 text-sm font-bold text-blue-400"
                  >
                    PRICING TOTALS
                  </td>
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">SaaS Monthly</td>
                  {versionsToCompare.map((version, idx) => (
                    <td key={version.Id} className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-green-400">
                          {formatCurrency(version.TotalSaaSMonthly)}
                        </span>
                        {idx > 0 &&
                          versionsToCompare[idx - 1].TotalSaaSMonthly !==
                            null &&
                          version.TotalSaaSMonthly !== null && (
                            <span className="text-xs text-gray-400 mt-1">
                              {(() => {
                                const diff = calculateDifference(
                                  versionsToCompare[idx - 1].TotalSaaSMonthly,
                                  version.TotalSaaSMonthly,
                                );
                                if (!diff) return null;
                                return (
                                  <span
                                    className={
                                      diff.diff > 0
                                        ? "text-red-400"
                                        : diff.diff < 0
                                          ? "text-green-400"
                                          : "text-gray-400"
                                    }
                                  >
                                    {diff.diff > 0 ? "+" : ""}
                                    {formatCurrency(diff.diff)} (
                                    {diff.diff > 0 ? "+" : ""}
                                    {diff.percentChange}%)
                                  </span>
                                );
                              })()}
                            </span>
                          )}
                      </div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">
                    SaaS Annual (Year 1)
                  </td>
                  {versionsToCompare.map((version, idx) => (
                    <td key={version.Id} className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-green-400">
                          {formatCurrency(version.TotalSaaSAnnualYear1)}
                        </span>
                        {idx > 0 &&
                          versionsToCompare[idx - 1].TotalSaaSAnnualYear1 !==
                            null &&
                          version.TotalSaaSAnnualYear1 !== null && (
                            <span className="text-xs text-gray-400 mt-1">
                              {(() => {
                                const diff = calculateDifference(
                                  versionsToCompare[idx - 1]
                                    .TotalSaaSAnnualYear1,
                                  version.TotalSaaSAnnualYear1,
                                );
                                if (!diff) return null;
                                return (
                                  <span
                                    className={
                                      diff.diff > 0
                                        ? "text-red-400"
                                        : diff.diff < 0
                                          ? "text-green-400"
                                          : "text-gray-400"
                                    }
                                  >
                                    {diff.diff > 0 ? "+" : ""}
                                    {formatCurrency(diff.diff)} (
                                    {diff.diff > 0 ? "+" : ""}
                                    {diff.percentChange}%)
                                  </span>
                                );
                              })()}
                            </span>
                          )}
                      </div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Setup Packages</td>
                  {versionsToCompare.map((version, idx) => (
                    <td key={version.Id} className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-blue-400">
                          {formatCurrency(version.TotalSetupPackages)}
                        </span>
                        {idx > 0 &&
                          versionsToCompare[idx - 1].TotalSetupPackages !==
                            null &&
                          version.TotalSetupPackages !== null && (
                            <span className="text-xs text-gray-400 mt-1">
                              {(() => {
                                const diff = calculateDifference(
                                  versionsToCompare[idx - 1].TotalSetupPackages,
                                  version.TotalSetupPackages,
                                );
                                if (!diff) return null;
                                return (
                                  <span
                                    className={
                                      diff.diff > 0
                                        ? "text-red-400"
                                        : diff.diff < 0
                                          ? "text-green-400"
                                          : "text-gray-400"
                                    }
                                  >
                                    {diff.diff > 0 ? "+" : ""}
                                    {formatCurrency(diff.diff)} (
                                    {diff.diff > 0 ? "+" : ""}
                                    {diff.percentChange}%)
                                  </span>
                                );
                              })()}
                            </span>
                          )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Configuration Section */}
                <tr className="bg-gray-750">
                  <td
                    colSpan={versionsToCompare.length + 1}
                    className="px-6 py-3 text-sm font-bold text-blue-400"
                  >
                    CONFIGURATION
                  </td>
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Projection Years</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.ProjectionYears} years
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Escalation Model</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.EscalationModel}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Level Loading</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.LevelLoadingEnabled ? (
                        <span className="text-green-400">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-400">✗ Disabled</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Teller Payments</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.TellerPaymentsEnabled ? (
                        <span className="text-green-400">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-400">✗ Disabled</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Discounts Section */}
                <tr className="bg-gray-750">
                  <td
                    colSpan={versionsToCompare.length + 1}
                    className="px-6 py-3 text-sm font-bold text-purple-400"
                  >
                    DISCOUNTS
                  </td>
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">
                    SaaS Year 1 Discount
                  </td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.DiscountConfig?.saas_year1_pct ? (
                        <span className="font-mono text-purple-300">
                          {version.DiscountConfig.saas_year1_pct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">
                    SaaS All Years Discount
                  </td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.DiscountConfig?.saas_all_years_pct ? (
                        <span className="font-mono text-purple-300">
                          {version.DiscountConfig.saas_all_years_pct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">
                    Setup Fixed Discount
                  </td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.DiscountConfig?.setup_fixed ? (
                        <span className="font-mono text-purple-300">
                          ${version.DiscountConfig.setup_fixed.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">
                    Setup Percentage Discount
                  </td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      {version.DiscountConfig?.setup_pct ? (
                        <span className="font-mono text-purple-300">
                          {version.DiscountConfig.setup_pct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Products Section */}
                <tr className="bg-gray-750">
                  <td
                    colSpan={versionsToCompare.length + 1}
                    className="px-6 py-3 text-sm font-bold text-blue-400"
                  >
                    PRODUCTS & SERVICES
                  </td>
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">SaaS Products</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      <span className="font-mono">
                        {version.SaaSProducts?.length || 0} selected
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Setup Packages</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4">
                      <span className="font-mono">
                        {version.SetupPackages?.length || 0} selected
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Metadata Section */}
                <tr className="bg-gray-750">
                  <td
                    colSpan={versionsToCompare.length + 1}
                    className="px-6 py-3 text-sm font-bold text-blue-400"
                  >
                    METADATA
                  </td>
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Created By</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4 text-sm">
                      {version.CreatedBy}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-6 py-4 font-medium">Created At</td>
                  {versionsToCompare.map((version) => (
                    <td key={version.Id} className="px-6 py-4 text-sm">
                      {new Date(version.CreatedAt).toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
