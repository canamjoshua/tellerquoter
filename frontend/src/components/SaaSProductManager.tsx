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

  useEffect(() => {
    fetchPricingVersions();
    fetchProducts();
  }, [fetchProducts]);

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
    if (!editModal || !editForm) return;

    try {
      const payload = {
        Name: editForm.Name,
        Description: editForm.Description || null,
        Category: editForm.Category,
        PricingModel: editForm.PricingModel,
        Tier1Min: parseInt(editForm.Tier1Min?.toString() || "0"),
        Tier1Max: parseInt(editForm.Tier1Max?.toString() || "0"),
        Tier1Price: parseFloat(editForm.Tier1Price?.toString() || "0"),
        Tier2Min: editForm.Tier2Min
          ? parseInt(editForm.Tier2Min.toString())
          : null,
        Tier2Max: editForm.Tier2Max
          ? parseInt(editForm.Tier2Max.toString())
          : null,
        Tier2Price: editForm.Tier2Price
          ? parseFloat(editForm.Tier2Price.toString())
          : null,
        Tier3Min: editForm.Tier3Min
          ? parseInt(editForm.Tier3Min.toString())
          : null,
        Tier3Max: editForm.Tier3Max
          ? parseInt(editForm.Tier3Max.toString())
          : null,
        Tier3Price: editForm.Tier3Price
          ? parseFloat(editForm.Tier3Price.toString())
          : null,
        IsActive: editForm.IsActive,
        IsRequired: editForm.IsRequired,
        SortOrder: parseInt(editForm.SortOrder?.toString() || "0"),
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
      Description: product.Description ?? "",
      Category: product.Category,
      PricingModel: product.PricingModel,
      Tier1Min: product.Tier1Min,
      Tier1Max: product.Tier1Max,
      Tier1Price: product.Tier1Price,
      Tier2Min: product.Tier2Min ?? undefined,
      Tier2Max: product.Tier2Max ?? undefined,
      Tier2Price: product.Tier2Price ?? undefined,
      Tier3Min: product.Tier3Min ?? undefined,
      Tier3Max: product.Tier3Max ?? undefined,
      Tier3Price: product.Tier3Price ?? undefined,
      IsActive: product.IsActive,
      IsRequired: product.IsRequired,
      SortOrder: product.SortOrder,
    });
  };

  const getVersionNumber = (versionId: string) => {
    const version = pricingVersions.find((v) => v.Id === versionId);
    return version ? version.VersionNumber : "Unknown";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC] mx-auto"></div>
          <p className="mt-4 text-[#A5A5A5] font-light">
            Loading SaaS products...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-normal text-[#494D50]">
              SaaS Products
            </h1>
            <p className="text-[#A5A5A5] font-light mt-2">
              Manage SaaS products and pricing tiers
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 font-light">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-light text-[#494D50] mb-2">
            Filter by Pricing Version:
          </label>
          <select
            value={selectedVersionFilter}
            onChange={(e) => setSelectedVersionFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC] w-64"
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
            className="bg-white p-6 rounded-xl mb-6 border border-[#E6E6E6]"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
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
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
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
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Product Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.ProductCode}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      ProductCode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="SAAS-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.Name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.Category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="Core, Optional"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Description
                </label>
                <textarea
                  value={newProduct.Description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      Description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <h3 className="font-semibold mb-2">Tier 1 (Required)</h3>
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
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
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
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
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Price per User
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.Tier1Price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier1Price: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  required
                />
              </div>

              <div className="col-span-2">
                <h3 className="font-semibold mb-2">Tier 2 (Optional)</h3>
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Min Users
                </label>
                <input
                  type="number"
                  value={newProduct.Tier2Min}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier2Min: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Max Users
                </label>
                <input
                  type="number"
                  value={newProduct.Tier2Max}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier2Max: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Price per User
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.Tier2Price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier2Price: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>

              <div className="col-span-2">
                <h3 className="font-semibold mb-2">Tier 3 (Optional)</h3>
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Min Users
                </label>
                <input
                  type="number"
                  value={newProduct.Tier3Min}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier3Min: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Max Users (blank = unlimited)
                </label>
                <input
                  type="number"
                  value={newProduct.Tier3Max}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier3Max: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Price per User
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.Tier3Price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, Tier3Price: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newProduct.IsActive}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
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
              className="mt-4 bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
            >
              Create Product
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-[#F7F8F9] border-b border-[#E6E6E6]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Tiers
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E6E6] bg-white">
              {products.map((product) => (
                <tr
                  key={product.Id}
                  className="hover:bg-[#F7F8F9] transition-colors"
                >
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
                        <span className="px-2 py-1 text-xs bg-[#6BC153]/10 text-[#6BC153] border border-[#6BC153]/30 font-light rounded block w-fit">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-[#A5A5A5]/10 text-[#A5A5A5] border border-[#A5A5A5]/30 font-light rounded block w-fit">
                          Inactive
                        </span>
                      )}
                      {product.IsRequired && (
                        <span className="px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-300 font-light rounded block w-fit">
                          Required
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => setViewModal(product)}
                      className="text-[#6FCBDC] hover:text-[#609bb0] font-light"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-[#609bb0] hover:text-[#516B84] font-light"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.Id)}
                      className="text-[#A5A5A5] hover:text-[#494D50] font-light"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="text-center py-12 text-teller-dark-silver font-light">
              No SaaS products found
            </div>
          )}
        </div>

        {/* View Modal */}
        {viewModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">SaaS Product Details</h2>
                  <button
                    onClick={() => setViewModal(null)}
                    className="text-teller-dark-silver hover:text-teller-charcoal text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-teller-charcoal">
                  <div>
                    <label className="text-gray-400">Product Code:</label>
                    <p className="font-mono">{viewModal.ProductCode}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Name:</label>
                    <p className="font-normal text-teller-dark-silver">
                      {viewModal.Name}
                    </p>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                    className="text-teller-dark-silver hover:text-teller-charcoal text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.Name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.Category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.Description ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      rows={2}
                    />
                  </div>

                  <div className="col-span-2">
                    <h3 className="font-semibold mb-2">Tier 1</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Min Users
                    </label>
                    <input
                      type="number"
                      value={editForm.Tier1Min ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier1Min: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={editForm.Tier1Max ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier1Max: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Price per User
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.Tier1Price ?? ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Tier1Price: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <h3 className="font-semibold mb-2">Tier 2 (Optional)</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Min Users
                    </label>
                    <input
                      type="number"
                      value={editForm.Tier2Min ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier2Min: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={editForm.Tier2Max ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier2Max: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Price per User
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.Tier2Price ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier2Price: e.target.value || undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div className="col-span-2">
                    <h3 className="font-semibold mb-2">Tier 3 (Optional)</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Min Users
                    </label>
                    <input
                      type="number"
                      value={editForm.Tier3Min ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier3Min: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={editForm.Tier3Max ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier3Max: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Price per User
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.Tier3Price ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Tier3Price: e.target.value || undefined,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={editForm.SortOrder ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          SortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
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
                    className="bg-teller-cta-green hover:bg-teller-cta-green-hover text-white px-6 py-2 rounded-lg font-normal transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal(null);
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

export default SaaSProductManager;
