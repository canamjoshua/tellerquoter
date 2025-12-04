import React, { useState, useEffect, useCallback } from "react";

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
  const [viewModal, setViewModal] = useState<SaaSProduct | null>(null);
  const [editModal, setEditModal] = useState<SaaSProduct | null>(null);
  const [editForm, setEditForm] = useState<Partial<SaaSProduct> | null>(null);
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
  }, [selectedVersionFilter, fetchProducts]);

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

  const fetchProducts = useCallback(async () => {
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
  }, [selectedVersionFilter]);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    try {
      const payload = {
        Name: editForm.Name,
        Description: editForm.Description || null,
        Category: editForm.Category,
        PricingModel: editForm.PricingModel,
        Tier1Min: parseInt(editForm.Tier1Min),
        Tier1Max: parseInt(editForm.Tier1Max),
        Tier1Price: parseFloat(editForm.Tier1Price),
        Tier2Min: editForm.Tier2Min ? parseInt(editForm.Tier2Min) : null,
        Tier2Max: editForm.Tier2Max ? parseInt(editForm.Tier2Max) : null,
        Tier2Price: editForm.Tier2Price
          ? parseFloat(editForm.Tier2Price)
          : null,
        Tier3Min: editForm.Tier3Min ? parseInt(editForm.Tier3Min) : null,
        Tier3Max: editForm.Tier3Max ? parseInt(editForm.Tier3Max) : null,
        Tier3Price: editForm.Tier3Price
          ? parseFloat(editForm.Tier3Price)
          : null,
        IsActive: editForm.IsActive,
        IsRequired: editForm.IsRequired,
        SortOrder: parseInt(editForm.SortOrder),
      };
      const response = await fetch(
        `${API_BASE_URL}/saas-products/${editModal.Id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update product");
      }
      await fetchProducts();
      setEditModal(null);
      setEditForm(null);
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

  const openEditModal = (product: SaaSProduct) => {
    setEditModal(product);
    setEditForm({
      Name: product.Name,
      Description: product.Description || "",
      Category: product.Category,
      PricingModel: product.PricingModel,
      Tier1Min: product.Tier1Min,
      Tier1Max: product.Tier1Max,
      Tier1Price: product.Tier1Price,
      Tier2Min: product.Tier2Min || "",
      Tier2Max: product.Tier2Max || "",
      Tier2Price: product.Tier2Price || "",
      Tier3Min: product.Tier3Min || "",
      Tier3Max: product.Tier3Max || "",
      Tier3Price: product.Tier3Price || "",
      IsActive: product.IsActive,
      IsRequired: product.IsRequired,
      SortOrder: product.SortOrder,
    });
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
                value={newProduct.PricingVersionId}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    PricingVersionId: e.target.value,
                  })
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
                Product Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProduct.ProductCode}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, ProductCode: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="SAAS-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProduct.Name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Name: e.target.value })
                }
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
                value={newProduct.Category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Category: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Core, Optional"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={newProduct.Description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Description: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Tier 1 (Required)</h3>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Price per User
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.Tier1Price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier1Price: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Tier 2 (Optional)</h3>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Min Users
              </label>
              <input
                type="number"
                value={newProduct.Tier2Min}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier2Min: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Users
              </label>
              <input
                type="number"
                value={newProduct.Tier2Max}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier2Max: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Price per User
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.Tier2Price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier2Price: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Tier 3 (Optional)</h3>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Min Users
              </label>
              <input
                type="number"
                value={newProduct.Tier3Min}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier3Min: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Users (blank = unlimited)
              </label>
              <input
                type="number"
                value={newProduct.Tier3Max}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier3Max: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Price per User
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.Tier3Price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, Tier3Price: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
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

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Code
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
                Tiers
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
            {products.map((product) => (
              <tr key={product.Id} className="hover:bg-gray-700/50">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => setViewModal(product)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(product)}
                    className="text-green-400 hover:text-green-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.Id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No SaaS products found
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">SaaS Product Details</h2>
                <button
                  onClick={() => setViewModal(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-400">Product Code:</label>
                  <p className="font-mono">{viewModal.ProductCode}</p>
                </div>
                <div>
                  <label className="text-gray-400">Name:</label>
                  <p className="font-semibold">{viewModal.Name}</p>
                </div>
                <div>
                  <label className="text-gray-400">Category:</label>
                  <p>{viewModal.Category}</p>
                </div>
                <div>
                  <label className="text-gray-400">Pricing Model:</label>
                  <p>{viewModal.PricingModel}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400">Description:</label>
                  <p>{viewModal.Description || "—"}</p>
                </div>

                <div className="col-span-2 border-t border-gray-700 pt-4 mt-4">
                  <h3 className="font-semibold mb-2">Tier 1</h3>
                </div>
                <div>
                  <label className="text-gray-400">Users:</label>
                  <p>
                    {viewModal.Tier1Min} - {viewModal.Tier1Max}
                  </p>
                </div>
                <div>
                  <label className="text-gray-400">Price per User:</label>
                  <p>${parseFloat(viewModal.Tier1Price).toFixed(2)}</p>
                </div>

                {viewModal.Tier2Price && (
                  <>
                    <div className="col-span-2 border-t border-gray-700 pt-4 mt-4">
                      <h3 className="font-semibold mb-2">Tier 2</h3>
                    </div>
                    <div>
                      <label className="text-gray-400">Users:</label>
                      <p>
                        {viewModal.Tier2Min} - {viewModal.Tier2Max}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-400">Price per User:</label>
                      <p>${parseFloat(viewModal.Tier2Price).toFixed(2)}</p>
                    </div>
                  </>
                )}

                {viewModal.Tier3Price && (
                  <>
                    <div className="col-span-2 border-t border-gray-700 pt-4 mt-4">
                      <h3 className="font-semibold mb-2">Tier 3</h3>
                    </div>
                    <div>
                      <label className="text-gray-400">Users:</label>
                      <p>
                        {viewModal.Tier3Min} - {viewModal.Tier3Max || "∞"}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-400">Price per User:</label>
                      <p>${parseFloat(viewModal.Tier3Price).toFixed(2)}</p>
                    </div>
                  </>
                )}

                <div className="col-span-2 border-t border-gray-700 pt-4 mt-4"></div>
                <div>
                  <label className="text-gray-400">Active:</label>
                  <p>{viewModal.IsActive ? "✅ Yes" : "❌ No"}</p>
                </div>
                <div>
                  <label className="text-gray-400">Required:</label>
                  <p>{viewModal.IsRequired ? "✅ Yes" : "❌ No"}</p>
                </div>
                <div>
                  <label className="text-gray-400">Sort Order:</label>
                  <p>{viewModal.SortOrder}</p>
                </div>
                <div>
                  <label className="text-gray-400">Version:</label>
                  <p>{getVersionNumber(viewModal.PricingVersionId)}</p>
                </div>
                <div>
                  <label className="text-gray-400">Created:</label>
                  <p className="text-xs">
                    {new Date(viewModal.CreatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-gray-400">Updated:</label>
                  <p className="text-xs">
                    {new Date(viewModal.UpdatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewModal(null)}
                className="mt-6 bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdate} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit SaaS Product</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(null);
                    setEditForm(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.Name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Name: e.target.value })
                    }
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
                    value={editForm.Category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Category: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={editForm.Description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Description: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    rows={2}
                  />
                </div>

                <div className="col-span-2">
                  <h3 className="font-semibold mb-2">Tier 1</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Users
                  </label>
                  <input
                    type="number"
                    value={editForm.Tier1Min}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier1Min: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={editForm.Tier1Max}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier1Max: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price per User
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.Tier1Price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier1Price: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <h3 className="font-semibold mb-2">Tier 2 (Optional)</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Users
                  </label>
                  <input
                    type="number"
                    value={editForm.Tier2Min}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier2Min: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={editForm.Tier2Max}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier2Max: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price per User
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.Tier2Price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier2Price: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <h3 className="font-semibold mb-2">Tier 3 (Optional)</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Users
                  </label>
                  <input
                    type="number"
                    value={editForm.Tier3Min}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier3Min: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={editForm.Tier3Max}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier3Max: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price per User
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.Tier3Price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Tier3Price: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editForm.SortOrder}
                    onChange={(e) =>
                      setEditForm({ ...editForm, SortOrder: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.IsActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, IsActive: e.target.checked })
                      }
                      className="mr-2"
                    />
                    Active
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.IsRequired}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          IsRequired: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Required in all quotes
                  </label>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(null);
                    setEditForm(null);
                  }}
                  className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSProductManager;
