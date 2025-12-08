import React, { useState, useEffect, useCallback } from "react";

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
  const [viewModalSKU, setViewModalSKU] = useState<SKUDefinition | null>(null);
  const [editModalSKU, setEditModalSKU] = useState<SKUDefinition | null>(null);
  const [editForm, setEditForm] = useState<Partial<SKUDefinition> | null>(null);
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

  const fetchSKUs = useCallback(async () => {
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
  }, [selectedVersionFilter]);

  useEffect(() => {
    fetchPricingVersions();
    fetchSKUs();
  }, [fetchSKUs]);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalSKU || !editForm) return;

    try {
      const payload = {
        Name: editForm.Name,
        Description: editForm.Description || null,
        Category: editForm.Category,
        FixedPrice: editForm.FixedPrice
          ? parseFloat(editForm.FixedPrice.toString())
          : null,
        RequiresQuantity: editForm.RequiresQuantity,
        RequiresTravelZone: editForm.RequiresTravelZone,
        RequiresConfiguration: editForm.RequiresConfiguration,
        IsActive: editForm.IsActive,
        SortOrder: parseInt(editForm.SortOrder?.toString() || "0"),
        EarmarkedStatus: editForm.EarmarkedStatus,
        EstimatedHours: editForm.EstimatedHours
          ? parseInt(editForm.EstimatedHours.toString())
          : null,
        AcceptanceCriteria: editForm.AcceptanceCriteria || null,
      };
      const response = await fetch(
        `${API_BASE_URL}/sku-definitions/${editModalSKU.Id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update SKU");
      }
      await fetchSKUs();
      setEditModalSKU(null);
      setEditForm(null);
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

  const openEditModal = (sku: SKUDefinition) => {
    setEditModalSKU(sku);
    setEditForm({
      Name: sku.Name,
      Description: sku.Description || "",
      Category: sku.Category,
      FixedPrice: sku.FixedPrice || "",
      RequiresQuantity: sku.RequiresQuantity,
      RequiresTravelZone: sku.RequiresTravelZone,
      RequiresConfiguration: sku.RequiresConfiguration,
      IsActive: sku.IsActive,
      SortOrder: sku.SortOrder,
      EarmarkedStatus: sku.EarmarkedStatus,
      EstimatedHours: sku.EstimatedHours,
      AcceptanceCriteria: sku.AcceptanceCriteria || "",
    });
  };

  const getVersionNumber = (versionId: string) => {
    const version = pricingVersions.find((v) => v.Id === versionId);
    return version ? version.VersionNumber : "Unknown";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-teller-light-silver flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teller-sky-blue mx-auto"></div>
          <p className="mt-4 text-teller-dark-silver font-light">
            Loading SKU definitions...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-teller-light-silver p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-normal text-teller-charcoal">
              SKU Definitions
            </h1>
            <p className="text-teller-dark-silver font-light mt-2">
              Manage setup package SKUs and pricing
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-teller-cta-green hover:bg-teller-cta-green-hover text-white px-6 py-2 rounded-lg font-normal transition-colors"
          >
            {showForm ? "Cancel" : "+ Add SKU"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 font-light">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-4">
          <label className="block text-sm font-light text-teller-charcoal mb-2">
            Filter by Pricing Version:
          </label>
          <select
            value={selectedVersionFilter}
            onChange={(e) => setSelectedVersionFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue w-64"
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
            className="bg-white p-6 rounded-xl mb-6 border border-teller-silver"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Pricing Version <span className="text-red-500">*</span>
                </label>
                <select
                  value={newSKU.PricingVersionId}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, PricingVersionId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
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
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  SKU Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSKU.SKUCode}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, SKUCode: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                  placeholder="TT-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSKU.Name}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, Name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSKU.Category}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, Category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                  placeholder="Hardware, Service, Travel"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Description
                </label>
                <textarea
                  value={newSKU.Description}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, Description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Fixed Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newSKU.FixedPrice}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, FixedPrice: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={newSKU.SortOrder}
                  onChange={(e) =>
                    setNewSKU({
                      ...newSKU,
                      SortOrder: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={newSKU.EstimatedHours}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, EstimatedHours: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                  placeholder="Optional - TBD if not specified"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-light text-teller-charcoal mb-2">
                  Acceptance Criteria (max 500 chars)
                </label>
                <textarea
                  value={newSKU.AcceptanceCriteria}
                  onChange={(e) =>
                    setNewSKU({ ...newSKU, AcceptanceCriteria: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
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
                      setNewSKU({
                        ...newSKU,
                        RequiresQuantity: e.target.checked,
                      })
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
                      setNewSKU({
                        ...newSKU,
                        EarmarkedStatus: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Earmarked (pricing subject to change) ⚠️
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 bg-teller-cta-green hover:bg-teller-cta-green-hover text-white px-6 py-2 rounded-lg font-normal transition-colors"
            >
              Create SKU
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-teller-silver overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-teller-light-silver border-b border-teller-silver">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  SKU Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Flags
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-teller-charcoal uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teller-silver bg-white">
              {skus.map((sku) => (
                <tr
                  key={sku.Id}
                  className="hover:bg-teller-light-silver transition-colors"
                >
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
                      <span className="px-2 py-1 text-xs bg-teller-cta-green/10 text-teller-cta-green border border-teller-cta-green/30 font-light rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-teller-dark-silver/10 text-teller-dark-silver border border-teller-dark-silver/30 font-light rounded">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => setViewModalSKU(sku)}
                      className="text-teller-sky-blue hover:text-teller-cool-blue font-light"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(sku)}
                      className="text-teller-cool-blue hover:text-teller-steel-blue font-light"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sku.Id)}
                      className="text-teller-dark-silver hover:text-teller-charcoal font-light"
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

        {/* View Modal */}
        {viewModalSKU && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">SKU Details</h2>
                  <button
                    onClick={() => setViewModalSKU(null)}
                    className="text-teller-dark-silver hover:text-teller-charcoal text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-teller-charcoal">
                  <div>
                    <label className="text-gray-400">SKU Code:</label>
                    <p className="font-mono font-semibold">
                      {viewModalSKU.SKUCode}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Category:</label>
                    <p>{viewModalSKU.Category}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400">Name:</label>
                    <p className="font-normal text-teller-dark-silver">
                      {viewModalSKU.Name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400">Description:</label>
                    <p>
                      {viewModalSKU.Description || (
                        <span className="text-gray-500 italic">None</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Price:</label>
                    <p>
                      {viewModalSKU.FixedPrice ? (
                        `$${parseFloat(viewModalSKU.FixedPrice).toFixed(2)}`
                      ) : (
                        <span className="text-yellow-500">TBD</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Estimated Hours:</label>
                    <p>
                      {viewModalSKU.EstimatedHours ? (
                        `${viewModalSKU.EstimatedHours}h`
                      ) : (
                        <span className="text-gray-500">TBD</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400">
                      Acceptance Criteria:
                    </label>
                    <p className="whitespace-pre-wrap">
                      {viewModalSKU.AcceptanceCriteria || (
                        <span className="text-gray-500 italic">None</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Pricing Version:</label>
                    <p>{getVersionNumber(viewModalSKU.PricingVersionId)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Sort Order:</label>
                    <p>{viewModalSKU.SortOrder}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400 block mb-2">Flags:</label>
                    <div className="space-y-1">
                      <div>
                        {viewModalSKU.EarmarkedStatus ? "✅" : "❌"} Earmarked
                        (pricing subject to change)
                      </div>
                      <div>
                        {viewModalSKU.RequiresQuantity ? "✅" : "❌"} Requires
                        Quantity
                      </div>
                      <div>
                        {viewModalSKU.RequiresTravelZone ? "✅" : "❌"} Requires
                        Travel Zone
                      </div>
                      <div>
                        {viewModalSKU.RequiresConfiguration ? "✅" : "❌"}{" "}
                        Requires Configuration
                      </div>
                      <div>{viewModalSKU.IsActive ? "✅" : "❌"} Active</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400">Created:</label>
                    <p className="text-xs">
                      {new Date(viewModalSKU.CreatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Updated:</label>
                    <p className="text-xs">
                      {new Date(viewModalSKU.UpdatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewModalSKU(null)}
                  className="mt-6 bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModalSKU && editForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleUpdate} className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    Edit SKU: {editModalSKU.SKUCode}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalSKU(null);
                      setEditForm(null);
                    }}
                    className="text-teller-dark-silver hover:text-teller-charcoal text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.Name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.Category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.Description || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Fixed Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.FixedPrice ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          FixedPrice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      value={editForm.EstimatedHours ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          EstimatedHours: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={editForm.SortOrder}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          SortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-light text-teller-charcoal mb-2">
                      Acceptance Criteria (max 500 chars)
                    </label>
                    <textarea
                      value={editForm.AcceptanceCriteria || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          AcceptanceCriteria: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-teller-silver text-teller-charcoal rounded focus:outline-none focus:border-teller-sky-blue focus:ring-1 focus:ring-teller-sky-blue"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.RequiresQuantity}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            RequiresQuantity: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Requires Quantity
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.RequiresTravelZone}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
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
                        checked={editForm.RequiresConfiguration}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
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
                        checked={editForm.IsActive}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            IsActive: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Active
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.EarmarkedStatus}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            EarmarkedStatus: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Earmarked (pricing subject to change) ⚠️
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    className="bg-teller-cta-green hover:bg-teller-cta-green-hover text-white px-6 py-2 rounded-lg font-normal transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalSKU(null);
                      setEditForm(null);
                    }}
                    className="bg-teller-dark-silver hover:bg-teller-charcoal text-white px-6 py-2 rounded-lg font-light transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SKUDefinitionManager;
