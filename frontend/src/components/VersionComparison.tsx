import { useState, useEffect } from "react";

interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string | null;
  EffectiveDate: string;
  ExpirationDate: string | null;
  CreatedBy: string;
  CreatedAt: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

interface ComparisonItem {
  key: string;
  old: Record<string, unknown>;
  new: Record<string, unknown>;
  changed_fields: string[];
}

interface VersionComparison {
  version1: PricingVersion;
  version2: PricingVersion;
  skus_added: Record<string, unknown>[];
  skus_removed: Record<string, unknown>[];
  skus_modified: ComparisonItem[];
  skus_unchanged: Record<string, unknown>[];
  saas_added: Record<string, unknown>[];
  saas_removed: Record<string, unknown>[];
  saas_modified: ComparisonItem[];
  saas_unchanged: Record<string, unknown>[];
  zones_added: Record<string, unknown>[];
  zones_removed: Record<string, unknown>[];
  zones_modified: ComparisonItem[];
  zones_unchanged: Record<string, unknown>[];
  referrers_added: Record<string, unknown>[];
  referrers_removed: Record<string, unknown>[];
  referrers_modified: ComparisonItem[];
  referrers_unchanged: Record<string, unknown>[];
  snippets_added: Record<string, unknown>[];
  snippets_removed: Record<string, unknown>[];
  snippets_modified: ComparisonItem[];
  snippets_unchanged: Record<string, unknown>[];
  total_changes: number;
  has_differences: boolean;
}

const API_BASE_URL = "/api";

interface Props {
  onClose: () => void;
}

export default function VersionComparison({ onClose }: Props) {
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [version1Id, setVersion1Id] = useState<string>("");
  const [version2Id, setVersion2Id] = useState<string>("");
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/`);
      if (!response.ok) throw new Error("Failed to fetch versions");
      const data = await response.json();
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleCompare = async () => {
    if (!version1Id || !version2Id) {
      setError("Please select two versions to compare");
      return;
    }

    if (version1Id === version2Id) {
      setError("Please select two different versions");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/pricing-versions/compare?version1_id=${version1Id}&version2_id=${version2Id}`,
      );
      if (!response.ok) throw new Error("Failed to compare versions");
      const data = await response.json();
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (
    title: string,
    icon: string,
    added: Record<string, unknown>[],
    removed: Record<string, unknown>[],
    modified: ComparisonItem[],
    unchanged: Record<string, unknown>[],
  ) => {
    const totalChanges = added.length + removed.length + modified.length;
    if (totalChanges === 0 && unchanged.length === 0) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-4">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">{icon}</span>
          {title}
          {totalChanges > 0 && (
            <span className="ml-2 text-sm bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded">
              {totalChanges} change{totalChanges !== 1 ? "s" : ""}
            </span>
          )}
        </h3>

        {added.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-green-400 mb-2">
              ✅ Added ({added.length})
            </h4>
            <div className="space-y-2">
              {added.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-green-900/20 border border-green-700 rounded p-3 text-sm"
                >
                  <div className="font-mono">
                    {JSON.stringify(item, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {removed.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-red-400 mb-2">
              ❌ Removed ({removed.length})
            </h4>
            <div className="space-y-2">
              {removed.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-red-900/20 border border-red-700 rounded p-3 text-sm"
                >
                  <div className="font-mono">
                    {JSON.stringify(item, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {modified.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">
              ⚠️ Modified ({modified.length})
            </h4>
            <div className="space-y-2">
              {modified.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-yellow-900/20 border border-yellow-700 rounded p-3"
                >
                  <div className="font-semibold mb-2">{item.key}</div>
                  <div className="text-xs text-yellow-300 mb-2">
                    Changed fields: {item.changed_fields.join(", ")}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Before:</div>
                      <div className="font-mono text-xs bg-gray-900 p-2 rounded">
                        {JSON.stringify(item.old, null, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">After:</div>
                      <div className="font-mono text-xs bg-gray-900 p-2 rounded">
                        {JSON.stringify(item.new, null, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalChanges === 0 && (
          <div className="text-sm text-gray-400">
            ✓ No changes ({unchanged.length} unchanged)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Compare Pricing Versions</h1>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            ← Back to Versions
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Select Versions</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Version 1 (Baseline)
              </label>
              <select
                value={version1Id}
                onChange={(e) => setVersion1Id(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select version...</option>
                {versions.map((v) => (
                  <option key={v.Id} value={v.Id}>
                    {v.VersionNumber} - {v.Description || "No description"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Version 2 (Compare)
              </label>
              <select
                value={version2Id}
                onChange={(e) => setVersion2Id(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select version...</option>
                {versions.map((v) => (
                  <option key={v.Id} value={v.Id}>
                    {v.VersionNumber} - {v.Description || "No description"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || !version1Id || !version2Id}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {loading ? "Comparing..." : "Compare Versions"}
          </button>
        </div>

        {comparison && (
          <div>
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">
                Comparison Summary
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">
                    {comparison.version1.VersionNumber}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {comparison.version1.Description || "No description"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Effective:{" "}
                    {new Date(
                      comparison.version1.EffectiveDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">
                    {comparison.version2.VersionNumber}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {comparison.version2.Description || "No description"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Effective:{" "}
                    {new Date(
                      comparison.version2.EffectiveDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-lg">
                  <span className="font-semibold">Total Changes:</span>{" "}
                  <span
                    className={
                      comparison.total_changes > 0
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  >
                    {comparison.total_changes}
                  </span>
                </p>
                {!comparison.has_differences && (
                  <p className="text-green-400 mt-2">
                    ✓ These versions are identical
                  </p>
                )}
              </div>
            </div>

            {comparison.has_differences && (
              <div>
                {renderSection(
                  "SKU Definitions",
                  "🏷️",
                  comparison.skus_added,
                  comparison.skus_removed,
                  comparison.skus_modified,
                  comparison.skus_unchanged,
                )}
                {renderSection(
                  "SaaS Products",
                  "☁️",
                  comparison.saas_added,
                  comparison.saas_removed,
                  comparison.saas_modified,
                  comparison.saas_unchanged,
                )}
                {renderSection(
                  "Travel Zones",
                  "✈️",
                  comparison.zones_added,
                  comparison.zones_removed,
                  comparison.zones_modified,
                  comparison.zones_unchanged,
                )}
                {renderSection(
                  "Referrers",
                  "🤝",
                  comparison.referrers_added,
                  comparison.referrers_removed,
                  comparison.referrers_modified,
                  comparison.referrers_unchanged,
                )}
                {renderSection(
                  "Text Snippets",
                  "📝",
                  comparison.snippets_added,
                  comparison.snippets_removed,
                  comparison.snippets_modified,
                  comparison.snippets_unchanged,
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
