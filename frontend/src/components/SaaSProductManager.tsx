import React, { useState, useEffect } from "react";

const API_BASE_URL = "/api";

interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

interface SaaSProduct {
  Id: string;
  PricingVersionId: string;
  ProductCode: string;
  Name: string;
  Description: string | null;
  Category: string;
  PricingModel: string;
  Tier1Min: number;
  Tier1Max: number;
  Tier1Price: string;
  Tier2Min: number | null;
  Tier2Max: number | null;
  Tier2Price: string | null;
  Tier3Min: number | null;
  Tier3Max: number | null;
  Tier3Price: string | null;
  IsActive: boolean;
  IsRequired: boolean;
  SortOrder: number;
  CreatedAt: string;
  UpdatedAt: string;
}

const SaaSProductManager: React.FC = () => {
  const [products, setProducts] = useState<SaaSProduct[]>([]);
  const [pricingVersions, setPricingVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] =
    useState<string>("");
  const [newProduct, setNewProduct] = useState({
    PricingVersionId: "",
    ProductCode: "",
    Name: "",
    Description: "",
    Category: "",
    PricingModel: "Tiered",
    Tier1Min: 1,
    Tier1Max: 10,
    Tier1Price: "",
    Tier2Min: "",
    Tier2Max: "",
    Tier2Price: "",
    Tier3Min: "",
    Tier3Max: "",
    Tier3Price: "",
    IsActive: true,
    IsRequired: false,
    SortOrder: 0,
  });

  useEffect(() => {
    fetchPricingVersions();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedVersionFilter
        ? `${API_BASE_URL}/saas-products/?pricing_version_id=${selectedVersionFilter}`
        : `${API_BASE_URL}/saas-products/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch SaaS products");
      const data = await response.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProduct,
        Tier1Price: parseFloat(newProduct.Tier1Price),
        Tier2Min: newProduct.Tier2Min ? parseInt(newProduct.Tier2Min) : null,
        Tier2Max: newProduct.Tier2Max ? parseInt(newProduct.Tier2Max) : null,
        Tier2Price: newProduct.Tier2Price
          ? parseFloat(newProduct.Tier2Price)
          : null,
        Tier3Min: newProduct.Tier3Min ? parseInt(newProduct.Tier3Min) : null,
        Tier3Max: newProduct.Tier3Max ? parseInt(newProduct.Tier3Max) : null,
        Tier3Price: newProduct.Tier3Price
          ? parseFloat(newProduct.Tier3Price)
          : null,
      };
      const response = await fetch(`${API_BASE_URL}/saas-products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create product");
      }
      await fetchProducts();
      setShowForm(false);
      setNewProduct({
        PricingVersionId: "",
        ProductCode: "",
        Name: "",
        Description: "",
        Category: "",
        PricingModel: "Tiered",
        Tier1Min: 1,
        Tier1Max: 10,
        Tier1Price: "",
        Tier2Min: "",
        Tier2Max: "",
        Tier2Price: "",
        Tier3Min: "",
        Tier3Max: "",
        Tier3Price: "",
        IsActive: true,
        IsRequired: false,
        SortOrder: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/saas-products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete product");
      }
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const getVersionNumber = (versionId: string) => {
    const version = pricingVersions.find((v) => v.Id === versionId);
    return version ? version.VersionNumber : "Unknown";
  };

  if (loading) return <div className="p-4">Loading SaaS products...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">SaaS Products</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Filter by Pricing Version:
        </label>
        <select
          value={selectedVersionFilter}
          onChange={(e) => setSelectedVersionFilter(e.target.value)}
          className="border rounded px-3 py-2 w-64"
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
          className="bg-white p-6 rounded-lg shadow-md mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Pricing Version <span className="text-red-500">*</span>
              </label>
              <select
                value={newProduct.PricingVersionId}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    PricingVersionId: e.target.value,
                  })
                }
                className="w-full border rounded px-3 py-2"
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
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Product Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProduct.ProductCode}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, ProductCode: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="SAAS-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProduct.Name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Name: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProduct.Category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Category: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="Core, Optional"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Description
              </label>
              <textarea
                value={newProduct.Description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Description: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Tier 1 (Required)</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Min Users
              </label>
              <input
                type="number"
                value={newProduct.Tier1Min}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    Tier1Min: parseInt(e.target.value),
                  })
                }
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Max Users
              </label>
              <input
                type="number"
                value={newProduct.Tier1Max}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    Tier1Max: parseInt(e.target.value),
                  })
                }
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Price per User
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.Tier1Price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier1Price: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Tier 2 (Optional)</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Min Users
              </label>
              <input
                type="number"
                value={newProduct.Tier2Min}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier2Min: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Max Users
              </label>
              <input
                type="number"
                value={newProduct.Tier2Max}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier2Max: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Price per User
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.Tier2Price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier2Price: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Tier 3 (Optional)</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Min Users
              </label>
              <input
                type="number"
                value={newProduct.Tier3Min}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier3Min: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Max Users (blank = unlimited)
              </label>
              <input
                type="number"
                value={newProduct.Tier3Max}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier3Max: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Price per User
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.Tier3Price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier3Price: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newProduct.IsActive}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, IsActive: e.target.checked })
                  }
                  className="mr-2"
                />
                Active
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newProduct.IsRequired}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      IsRequired: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                Required in all quotes
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Create Product
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tiers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.Id}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {product.ProductCode}
                </td>
                <td className="px-6 py-4">{product.Name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {product.Category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getVersionNumber(product.PricingVersionId)}
                </td>
                <td className="px-6 py-4 text-xs">
                  <div>
                    T1: {product.Tier1Min}-{product.Tier1Max} @ $
                    {parseFloat(product.Tier1Price).toFixed(2)}
                  </div>
                  {product.Tier2Price && (
                    <div>
                      T2: {product.Tier2Min}-{product.Tier2Max} @ $
                      {parseFloat(product.Tier2Price).toFixed(2)}
                    </div>
                  )}
                  {product.Tier3Price && (
                    <div>
                      T3: {product.Tier3Min}-{product.Tier3Max || "∞"} @ $
                      {parseFloat(product.Tier3Price).toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {product.IsActive ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded block w-fit">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded block w-fit">
                        Inactive
                      </span>
                    )}
                    {product.IsRequired && (
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded block w-fit">
                        Required
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleDelete(product.Id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No SaaS products found
          </div>
        )}
      </div>
    </div>
  );
};

export default SaaSProductManager;
