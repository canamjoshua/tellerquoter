import React, { useState, useEffect } from "react";

const API_BASE_URL = "/api";

interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

interface SKUDefinition {
  Id: string;
  PricingVersionId: string;
  SKUCode: string;
  Name: string;
  Description: string | null;
  Category: string;
  FixedPrice: string | null;
  RequiresQuantity: boolean;
  RequiresTravelZone: boolean;
  RequiresConfiguration: boolean;
  IsActive: boolean;
  SortOrder: number;
  EarmarkedStatus: boolean;
  EstimatedHours: number | null;
  AcceptanceCriteria: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

const SKUDefinitionManager: React.FC = () => {
  const [skus, setSKUs] = useState<SKUDefinition[]>([]);
  const [pricingVersions, setPricingVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] =
    useState<string>("");
  const [newSKU, setNewSKU] = useState({
    PricingVersionId: "",
    SKUCode: "",
    Name: "",
    Description: "",
    Category: "",
    FixedPrice: "",
    RequiresQuantity: true,
    RequiresTravelZone: false,
    RequiresConfiguration: false,
    IsActive: true,
    SortOrder: 0,
    EarmarkedStatus: false,
    EstimatedHours: "",
    AcceptanceCriteria: "",
  });

  useEffect(() => {
    fetchPricingVersions();
    fetchSKUs();
  }, [selectedVersionFilter]);

  const fetchPricingVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/`);
      if (!response.ok) throw new Error("Failed to fetch pricing versions");
      const data = await response.json();
      setPricingVersions(data);
    } catch (err) {
      console.error("Error fetching pricing versions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchSKUs = async () => {
    try {
      setLoading(true);
      const url = selectedVersionFilter
        ? `${API_BASE_URL}/sku-definitions/?pricing_version_id=${selectedVersionFilter}`
        : `${API_BASE_URL}/sku-definitions/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch SKU definitions");
      const data = await response.json();
      setSKUs(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching SKUs:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newSKU,
        FixedPrice: newSKU.FixedPrice ? parseFloat(newSKU.FixedPrice) : null,
        EstimatedHours: newSKU.EstimatedHours
          ? parseInt(newSKU.EstimatedHours)
          : null,
        AcceptanceCriteria: newSKU.AcceptanceCriteria || null,
      };
      const response = await fetch(`${API_BASE_URL}/sku-definitions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create SKU");
      }
      await fetchSKUs();
      setShowForm(false);
      setNewSKU({
        PricingVersionId: "",
        SKUCode: "",
        Name: "",
        Description: "",
        Category: "",
        FixedPrice: "",
        RequiresQuantity: true,
        RequiresTravelZone: false,
        RequiresConfiguration: false,
        IsActive: true,
        SortOrder: 0,
        EarmarkedStatus: false,
        EstimatedHours: "",
        AcceptanceCriteria: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SKU?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/sku-definitions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete SKU");
      }
      await fetchSKUs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const getVersionNumber = (versionId: string) => {
    const version = pricingVersions.find((v) => v.Id === versionId);
    return version ? version.VersionNumber : "Unknown";
  };

  if (loading) return <div className="p-4">Loading SKU definitions...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">SKU Definitions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add SKU"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Filter by Pricing Version:
        </label>
        <select
          value={selectedVersionFilter}
          onChange={(e) => setSelectedVersionFilter(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-64 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Versions</option>
          {pricingVersions.map((version) => (
            <option key={version.Id} value={version.Id}>
              {version.VersionNumber}
              {version.IsCurrent && " (Current)"}
              {version.IsLocked && " 🔒"}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 p-6 rounded-lg shadow-md mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Pricing Version <span className="text-red-500">*</span>
              </label>
              <select
                value={newSKU.PricingVersionId}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, PricingVersionId: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select Version</option>
                {pricingVersions
                  .filter((v) => !v.IsLocked)
                  .map((version) => (
                    <option key={version.Id} value={version.Id}>
                      {version.VersionNumber}
                      {version.IsCurrent && " (Current)"}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                SKU Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSKU.SKUCode}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, SKUCode: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="TT-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSKU.Name}
                onChange={(e) => setNewSKU({ ...newSKU, Name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSKU.Category}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, Category: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Hardware, Service, Travel"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={newSKU.Description}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, Description: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Fixed Price
              </label>
              <input
                type="number"
                step="0.01"
                value={newSKU.FixedPrice}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, FixedPrice: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={newSKU.SortOrder}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, SortOrder: parseInt(e.target.value) })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                value={newSKU.EstimatedHours}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, EstimatedHours: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Optional - TBD if not specified"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Acceptance Criteria (max 500 chars)
              </label>
              <textarea
                value={newSKU.AcceptanceCriteria}
                onChange={(e) =>
                  setNewSKU({ ...newSKU, AcceptanceCriteria: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                rows={3}
                maxLength={500}
                placeholder="Deliverable completion criteria..."
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSKU.RequiresQuantity}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, RequiresQuantity: e.target.checked })
                  }
                  className="mr-2"
                />
                Requires Quantity
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSKU.RequiresTravelZone}
                  onChange={(e) =>
                    setNewSKU({
                      ...newSKU,
                      RequiresTravelZone: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                Requires Travel Zone
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSKU.RequiresConfiguration}
                  onChange={(e) =>
                    setNewSKU({
                      ...newSKU,
                      RequiresConfiguration: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                Requires Configuration
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSKU.IsActive}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, IsActive: e.target.checked })
                  }
                  className="mr-2"
                />
                Active
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSKU.EarmarkedStatus}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, EarmarkedStatus: e.target.checked })
                  }
                  className="mr-2"
                />
                Earmarked (pricing subject to change) ⚠️
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Create SKU
          </button>
        </form>
      )}

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                SKU Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Category
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Version
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Price
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Flags
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {skus.map((sku) => (
              <tr key={sku.Id}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {sku.SKUCode}
                </td>
                <td className="px-6 py-4">{sku.Name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    {sku.Category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getVersionNumber(sku.PricingVersionId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sku.FixedPrice ? (
                    `$${parseFloat(sku.FixedPrice).toFixed(2)}`
                  ) : (
                    <span className="text-yellow-500 font-semibold">TBD</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sku.EstimatedHours ? (
                    `${sku.EstimatedHours}h`
                  ) : (
                    <span className="text-gray-500">TBD</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs">
                  {sku.EarmarkedStatus && (
                    <span className="mr-1" title="Earmarked">
                      ⚠️
                    </span>
                  )}
                  {sku.RequiresQuantity && <span className="mr-1">📊</span>}
                  {sku.RequiresTravelZone && <span className="mr-1">✈️</span>}
                  {sku.RequiresConfiguration && (
                    <span className="mr-1">⚙️</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {sku.IsActive ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleDelete(sku.Id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {skus.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No SKU definitions found
          </div>
        )}
      </div>
    </div>
  );
};

export default SKUDefinitionManager;
