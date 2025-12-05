import { useState, useEffect, useCallback } from "react";
import type {
  QuoteWithVersions,
  NewQuoteVersion,
  PricingVersion,
  SaaSProduct,
  SKUDefinition,
  DiscountConfig,
} from "../types/quote";
import QuoteVersionComparison from "./QuoteVersionComparison";

const API_BASE_URL = "/api";

interface QuoteBuilderProps {
  quoteId: string;
  onClose: () => void;
}

export default function QuoteBuilder({ quoteId, onClose }: QuoteBuilderProps) {
  const [quote, setQuote] = useState<QuoteWithVersions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Form data
  const [pricingVersions, setPricingVersions] = useState<PricingVersion[]>([]);
  const [saasProducts, setSaaSProducts] = useState<SaaSProduct[]>([]);
  const [skuDefinitions, setSKUDefinitions] = useState<SKUDefinition[]>([]);

  const [newVersion, setNewVersion] = useState<NewQuoteVersion>({
    PricingVersionId: "",
    ClientData: { name: "", email: "", phone: "" },
    ProjectionYears: 5,
    CreatedBy: "admin",
    SaaSProducts: [],
    SetupPackages: [],
  });

  const [selectedSaaSProducts, setSelectedSaaSProducts] = useState<
    { productId: string; quantity: string; notes: string }[]
  >([]);

  const [selectedSetupPackages, setSelectedSetupPackages] = useState<
    { skuId: string; quantity: number; notes: string }[]
  >([]);

  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({
    saas_year1_pct: undefined,
    saas_all_years_pct: undefined,
    setup_fixed: undefined,
    setup_pct: undefined,
  });

  const fetchQuote = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}`);
      if (!response.ok) throw new Error("Failed to fetch quote");
      const data = await response.json();
      setQuote(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  const fetchPricingVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/`);
      if (!response.ok) throw new Error("Failed to fetch pricing versions");
      const data = await response.json();
      setPricingVersions(
        data.filter((v: PricingVersion) => v.IsCurrent || true),
      );
    } catch (err) {
      console.error("Failed to fetch pricing versions:", err);
    }
  };

  const fetchSaaSProducts = async (pricingVersionId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/saas-products/?pricing_version_id=${pricingVersionId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch SaaS products");
      const data = await response.json();
      setSaaSProducts(data.filter((p: SaaSProduct) => p.IsActive));
    } catch (err) {
      console.error("Failed to fetch SaaS products:", err);
    }
  };

  const fetchSKUDefinitions = async (pricingVersionId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/sku-definitions/?pricing_version_id=${pricingVersionId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch SKU definitions");
      const data = await response.json();
      setSKUDefinitions(data.filter((s: SKUDefinition) => s.IsActive));
    } catch (err) {
      console.error("Failed to fetch SKU definitions:", err);
    }
  };

  useEffect(() => {
    fetchQuote();
    fetchPricingVersions();
  }, [quoteId, fetchQuote]);

  useEffect(() => {
    if (newVersion.PricingVersionId) {
      fetchSaaSProducts(newVersion.PricingVersionId);
      fetchSKUDefinitions(newVersion.PricingVersionId);
    }
  }, [newVersion.PricingVersionId]);

  const handleAddSaaSProduct = () => {
    setSelectedSaaSProducts([
      ...selectedSaaSProducts,
      { productId: "", quantity: "0", notes: "" },
    ]);
  };

  const handleRemoveSaaSProduct = (index: number) => {
    setSelectedSaaSProducts(selectedSaaSProducts.filter((_, i) => i !== index));
  };

  const handleAddSetupPackage = () => {
    setSelectedSetupPackages([
      ...selectedSetupPackages,
      { skuId: "", quantity: 1, notes: "" },
    ]);
  };

  const handleRemoveSetupPackage = (index: number) => {
    setSelectedSetupPackages(
      selectedSetupPackages.filter((_, i) => i !== index),
    );
  };

  const calculateTotals = () => {
    let totalSaaS = 0;
    let totalSetup = 0;

    // Calculate SaaS totals
    selectedSaaSProducts.forEach(({ productId, quantity }) => {
      const product = saasProducts.find((p) => p.Id === productId);
      if (product && quantity) {
        const qty = parseFloat(quantity);
        // Simple tier calculation (you can enhance this)
        if (
          qty >= (product.Tier1Min || 0) &&
          qty <= (product.Tier1Max || Infinity)
        ) {
          totalSaaS += product.Tier1Price;
        } else if (
          product.Tier2Min &&
          qty >= product.Tier2Min &&
          (!product.Tier2Max || qty <= product.Tier2Max)
        ) {
          totalSaaS += product.Tier2Price || 0;
        } else if (product.Tier3Min && qty >= product.Tier3Min) {
          totalSaaS += product.Tier3Price || 0;
        }
      }
    });

    // Calculate Setup totals
    selectedSetupPackages.forEach(({ skuId, quantity }) => {
      const sku = skuDefinitions.find((s) => s.Id === skuId);
      if (sku && sku.FixedPrice) {
        totalSetup += sku.FixedPrice * quantity;
      }
    });

    return { totalSaaS, totalSetup, totalAnnual: totalSaaS * 12 };
  };

  const handleSubmitVersion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Clean up discount config - only include fields with values
      const cleanDiscountConfig: Record<string, number> = {};
      if (discountConfig.saas_year1_pct !== undefined) {
        cleanDiscountConfig.saas_year1_pct = discountConfig.saas_year1_pct;
      }
      if (discountConfig.saas_all_years_pct !== undefined) {
        cleanDiscountConfig.saas_all_years_pct =
          discountConfig.saas_all_years_pct;
      }
      if (discountConfig.setup_fixed !== undefined) {
        cleanDiscountConfig.setup_fixed = discountConfig.setup_fixed;
      }
      if (discountConfig.setup_pct !== undefined) {
        cleanDiscountConfig.setup_pct = discountConfig.setup_pct;
      }

      const versionPayload = {
        ...newVersion,
        DiscountConfig:
          Object.keys(cleanDiscountConfig).length > 0
            ? cleanDiscountConfig
            : undefined,
        SaaSProducts: selectedSaaSProducts
          .filter((p) => p.productId)
          .map((p) => ({
            SaaSProductId: p.productId,
            Quantity: p.quantity,
            Notes: p.notes || undefined,
          })),
        SetupPackages: selectedSetupPackages
          .filter((p) => p.skuId)
          .map((p, idx) => ({
            SKUDefinitionId: p.skuId,
            Quantity: p.quantity,
            CustomScopeNotes: p.notes || undefined,
            SequenceOrder: idx + 1,
          })),
      };

      const response = await fetch(
        `${API_BASE_URL}/quotes/${quoteId}/versions/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(versionPayload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create version");
      }

      await fetchQuote();
      setShowVersionForm(false);
      setNewVersion({
        PricingVersionId: "",
        ClientData: { name: "", email: "", phone: "" },
        ProjectionYears: 5,
        CreatedBy: "admin",
        SaaSProducts: [],
        SetupPackages: [],
      });
      setSelectedSaaSProducts([]);
      setSelectedSetupPackages([]);
      setDiscountConfig({
        saas_year1_pct: undefined,
        saas_all_years_pct: undefined,
        setup_fixed: undefined,
        setup_pct: undefined,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create version");
    }
  };

  const handleDeleteVersion = async (versionNumber: number) => {
    if (!confirm(`Delete version ${versionNumber}?`)) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/quotes/${quoteId}/versions/${versionNumber}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete version");
      }

      await fetchQuote();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete version");
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading quote...</p>
        </div>
      </div>
    );
  }

  // Show comparison view if active
  if (showComparison) {
    return (
      <QuoteVersionComparison
        quoteId={quoteId}
        onClose={() => {
          setShowComparison(false);
          fetchQuote(); // Refresh in case anything changed
        }}
      />
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400">Quote not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <button
              onClick={onClose}
              className="text-blue-400 hover:text-blue-300 mb-2"
            >
              ← Back to Quotes
            </button>
            <h1 className="text-4xl font-bold">{quote.QuoteNumber}</h1>
            <p className="text-gray-400 mt-2">
              {quote.ClientName}
              {quote.ClientOrganization && ` • ${quote.ClientOrganization}`}
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-gray-700 rounded text-sm">
              Status: {quote.Status}
            </span>
          </div>
          <div className="flex space-x-3">
            {quote.Versions && quote.Versions.length >= 2 && (
              <button
                onClick={() => setShowComparison(true)}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                🔄 Compare Versions
              </button>
            )}
            <button
              onClick={() => setShowVersionForm(!showVersionForm)}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {showVersionForm ? "✕ Cancel" : "+ New Version"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Version Form */}
        {showVersionForm && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Create New Version</h2>
            <form onSubmit={handleSubmitVersion} className="space-y-6">
              {/* Pricing Version Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pricing Version *
                </label>
                <select
                  required
                  value={newVersion.PricingVersionId}
                  onChange={(e) =>
                    setNewVersion({
                      ...newVersion,
                      PricingVersionId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select pricing version...</option>
                  {pricingVersions.map((v) => (
                    <option key={v.Id} value={v.Id}>
                      {v.VersionNumber} {v.IsCurrent && "(Current)"}
                      {v.Description && ` - ${v.Description}`}
                    </option>
                  ))}
                </select>
              </div>

              {newVersion.PricingVersionId && (
                <>
                  {/* Client Data */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Client Contact Name
                      </label>
                      <input
                        type="text"
                        value={(newVersion.ClientData.name as string) || ""}
                        onChange={(e) =>
                          setNewVersion({
                            ...newVersion,
                            ClientData: {
                              ...newVersion.ClientData,
                              name: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={(newVersion.ClientData.email as string) || ""}
                        onChange={(e) =>
                          setNewVersion({
                            ...newVersion,
                            ClientData: {
                              ...newVersion.ClientData,
                              email: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={(newVersion.ClientData.phone as string) || ""}
                        onChange={(e) =>
                          setNewVersion({
                            ...newVersion,
                            ClientData: {
                              ...newVersion.ClientData,
                              phone: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  {/* SaaS Products */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium">
                        SaaS Products
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSaaSProduct}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        + Add Product
                      </button>
                    </div>
                    {selectedSaaSProducts.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 mb-2 items-end"
                      >
                        <div className="col-span-6">
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const updated = [...selectedSaaSProducts];
                              updated[index].productId = e.target.value;
                              setSelectedSaaSProducts(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                          >
                            <option value="">Select product...</option>
                            {saasProducts.map((p) => (
                              <option key={p.Id} value={p.Id}>
                                {p.ProductCode} - {p.Name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Quantity"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...selectedSaaSProducts];
                              updated[index].quantity = e.target.value;
                              setSelectedSaaSProducts(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Notes"
                            value={item.notes}
                            onChange={(e) => {
                              const updated = [...selectedSaaSProducts];
                              updated[index].notes = e.target.value;
                              setSelectedSaaSProducts(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveSaaSProduct(index)}
                            className="w-full px-2 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Setup Packages */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium">
                        Setup Packages
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSetupPackage}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        + Add Package
                      </button>
                    </div>
                    {selectedSetupPackages.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 mb-2 items-end"
                      >
                        <div className="col-span-6">
                          <select
                            value={item.skuId}
                            onChange={(e) => {
                              const updated = [...selectedSetupPackages];
                              updated[index].skuId = e.target.value;
                              setSelectedSetupPackages(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                          >
                            <option value="">Select package...</option>
                            {skuDefinitions.map((s) => (
                              <option key={s.Id} value={s.Id}>
                                {s.SKUCode} - {s.Name} ($
                                {s.FixedPrice?.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...selectedSetupPackages];
                              updated[index].quantity = parseInt(
                                e.target.value,
                              );
                              setSelectedSetupPackages(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Custom notes"
                            value={item.notes}
                            onChange={(e) => {
                              const updated = [...selectedSetupPackages];
                              updated[index].notes = e.target.value;
                              setSelectedSetupPackages(updated);
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveSetupPackage(index)}
                            className="w-full px-2 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Discount Configuration */}
                  <div className="bg-gray-750 p-4 rounded border border-gray-600">
                    <h3 className="font-semibold mb-3 text-purple-400">
                      💰 Discount Configuration (Optional)
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Apply percentage or fixed discounts to SaaS and/or Setup
                      costs
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                          SaaS Year 1 Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g., 10 for 10%"
                          value={discountConfig.saas_year1_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              saas_year1_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Applies to first year SaaS only
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                          SaaS All Years Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g., 5 for 5%"
                          value={discountConfig.saas_all_years_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              saas_all_years_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Applies across all projection years
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                          Setup Fixed Discount ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 1000"
                          value={discountConfig.setup_fixed ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              setup_fixed: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Fixed dollar discount on setup
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                          Setup Percentage Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g., 15 for 15%"
                          value={discountConfig.setup_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              setup_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Percentage discount on setup
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Totals Preview */}
                  <div className="bg-gray-700/50 p-4 rounded border border-gray-600">
                    <h3 className="font-semibold mb-2">Estimated Totals</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">SaaS Monthly</p>
                        <p className="text-xl font-bold text-green-400">
                          ${totals.totalSaaS.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">SaaS Annual</p>
                        <p className="text-xl font-bold text-green-400">
                          ${totals.totalAnnual.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Setup Packages</p>
                        <p className="text-xl font-bold text-blue-400">
                          ${totals.totalSetup.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowVersionForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newVersion.PricingVersionId}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Version
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Versions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            Versions ({quote.Versions?.length || 0})
          </h2>

          {!quote.Versions || quote.Versions.length === 0 ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <p className="text-xl text-gray-400">No versions yet</p>
              <p className="text-gray-500 mt-2">
                Create your first version to build this quote
              </p>
            </div>
          ) : (
            quote.Versions.map((version) => (
              <div
                key={version.Id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      Version {version.VersionNumber}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Created {new Date(version.CreatedAt).toLocaleDateString()}
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-700 rounded text-xs">
                      {version.VersionStatus}
                    </span>
                  </div>
                  {version.VersionStatus === "DRAFT" && (
                    <button
                      onClick={() => handleDeleteVersion(version.VersionNumber)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-700/50 p-3 rounded">
                    <p className="text-gray-400 text-xs mb-1">SaaS Monthly</p>
                    <p className="text-lg font-bold text-green-400">
                      ${version.TotalSaaSMonthly?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded">
                    <p className="text-gray-400 text-xs mb-1">
                      SaaS Annual (Year 1)
                    </p>
                    <p className="text-lg font-bold text-green-400">
                      ${version.TotalSaaSAnnualYear1?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded">
                    <p className="text-gray-400 text-xs mb-1">Setup Packages</p>
                    <p className="text-lg font-bold text-blue-400">
                      ${version.TotalSetupPackages?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">SaaS Products:</p>
                    <p className="font-mono">
                      {version.SaaSProducts?.length || 0} selected
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Setup Packages:</p>
                    <p className="font-mono">
                      {version.SetupPackages?.length || 0} selected
                    </p>
                  </div>
                </div>

                {version.DiscountConfig &&
                  Object.keys(version.DiscountConfig).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-purple-400 text-sm font-semibold mb-2">
                        💰 Discounts Applied:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {version.DiscountConfig.saas_year1_pct && (
                          <div className="bg-purple-900/30 p-2 rounded">
                            <p className="text-gray-400">SaaS Year 1</p>
                            <p className="font-mono text-purple-300">
                              {version.DiscountConfig.saas_year1_pct}%
                            </p>
                          </div>
                        )}
                        {version.DiscountConfig.saas_all_years_pct && (
                          <div className="bg-purple-900/30 p-2 rounded">
                            <p className="text-gray-400">SaaS All Years</p>
                            <p className="font-mono text-purple-300">
                              {version.DiscountConfig.saas_all_years_pct}%
                            </p>
                          </div>
                        )}
                        {version.DiscountConfig.setup_fixed && (
                          <div className="bg-purple-900/30 p-2 rounded">
                            <p className="text-gray-400">Setup Fixed</p>
                            <p className="font-mono text-purple-300">
                              $
                              {version.DiscountConfig.setup_fixed.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {version.DiscountConfig.setup_pct && (
                          <div className="bg-purple-900/30 p-2 rounded">
                            <p className="text-gray-400">Setup Percentage</p>
                            <p className="font-mono text-purple-300">
                              {version.DiscountConfig.setup_pct}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
