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

interface EnhancedQuoteBuilderProps {
  quoteId: string;
  onClose: () => void;
}

type WizardStep = "products" | "packages" | "discounts" | "review";

// Product dependency mapping (this could come from backend)
const PRODUCT_SKU_SUGGESTIONS: Record<string, string[]> = {
  // Map SaaS product categories to recommended SKU categories
  "Core Platform": ["Implementation", "Training", "Integration"],
  "Advanced Analytics": ["Data Migration", "Custom Reports", "Training"],
  "API Access": ["Integration", "Developer Training"],
};

export default function EnhancedQuoteBuilder({
  quoteId,
  onClose,
}: EnhancedQuoteBuilderProps) {
  const [quote, setQuote] = useState<QuoteWithVersions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>("products");

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

  // Animation state for totals
  const [animatingTotal, setAnimatingTotal] = useState(false);

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

  // Smart SKU suggestions based on selected SaaS products
  const getSuggestedSKUs = (): SKUDefinition[] => {
    const selectedProducts = selectedSaaSProducts
      .map((sp) => saasProducts.find((p) => p.Id === sp.productId))
      .filter((p) => p !== undefined);

    const suggestedCategories = new Set<string>();
    selectedProducts.forEach((product) => {
      const suggestions = PRODUCT_SKU_SUGGESTIONS[product.Category];
      if (suggestions) {
        suggestions.forEach((cat) => suggestedCategories.add(cat));
      }
    });

    return skuDefinitions.filter((sku) =>
      suggestedCategories.has(sku.Category),
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

  const totals = calculateTotals();

  const toggleSaaSProduct = (productId: string) => {
    setAnimatingTotal(true);
    setTimeout(() => setAnimatingTotal(false), 600);

    const exists = selectedSaaSProducts.find((p) => p.productId === productId);
    if (exists) {
      setSelectedSaaSProducts(
        selectedSaaSProducts.filter((p) => p.productId !== productId),
      );
    } else {
      setSelectedSaaSProducts([
        ...selectedSaaSProducts,
        { productId, quantity: "1", notes: "" },
      ]);
    }
  };

  const toggleSetupPackage = (skuId: string) => {
    setAnimatingTotal(true);
    setTimeout(() => setAnimatingTotal(false), 600);

    const exists = selectedSetupPackages.find((p) => p.skuId === skuId);
    if (exists) {
      setSelectedSetupPackages(
        selectedSetupPackages.filter((p) => p.skuId !== skuId),
      );
    } else {
      setSelectedSetupPackages([
        ...selectedSetupPackages,
        { skuId, quantity: 1, notes: "" },
      ]);
    }
  };

  const handleSubmitVersion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
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
      setCurrentStep("products");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-300 text-lg">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (showComparison) {
    return (
      <QuoteVersionComparison
        quoteId={quoteId}
        onClose={() => {
          setShowComparison(false);
          fetchQuote();
        }}
      />
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400">Quote not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all transform hover:scale-105"
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  const stepProgress = {
    products: 0,
    packages: 33,
    discounts: 66,
    review: 100,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
            >
              ← Back to Quotes
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {quote.QuoteNumber}
            </h1>
            <p className="text-gray-300 mt-2 text-lg">
              {quote.ClientName}
              {quote.ClientOrganization && ` • ${quote.ClientOrganization}`}
            </p>
            <div className="flex gap-2 mt-3">
              <span className="px-3 py-1 bg-blue-600/30 border border-blue-500 rounded-full text-sm">
                {quote.Status}
              </span>
              <span className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-full text-sm">
                {quote.Versions?.length || 0} version
                {quote.Versions?.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {quote.Versions && quote.Versions.length >= 2 && (
              <button
                onClick={() => setShowComparison(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                🔄 Compare Versions
              </button>
            )}
            <button
              onClick={() => setShowVersionForm(!showVersionForm)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              {showVersionForm ? "✕ Cancel" : "+ New Version"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6 backdrop-blur-sm animate-shake">
            {error}
          </div>
        )}

        {/* New Version Form - Visual Wizard */}
        {showVersionForm && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8 mb-8 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Create New Version
            </h2>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {["products", "packages", "discounts", "review"].map((step) => (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step as WizardStep)}
                    className={`text-sm font-medium capitalize transition-colors ${
                      currentStep === step
                        ? "text-blue-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transition-all duration-500 ease-out"
                  style={{ width: `${stepProgress[currentStep]}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmitVersion} className="space-y-8">
              {/* Pricing Version Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Pricing Version
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
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Pricing Version</option>
                  {pricingVersions.map((pv) => (
                    <option key={pv.Id} value={pv.Id}>
                      {pv.VersionNumber} - {pv.Description || "No description"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step Content */}
              {currentStep === "products" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-green-400">
                      Select SaaS Products
                    </h3>
                    <span className="text-sm text-gray-400">
                      {selectedSaaSProducts.length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {saasProducts.map((product) => {
                      const isSelected = selectedSaaSProducts.some(
                        (p) => p.productId === product.Id,
                      );
                      return (
                        <button
                          key={product.Id}
                          type="button"
                          onClick={() => toggleSaaSProduct(product.Id)}
                          className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                            isSelected
                              ? "bg-green-600/20 border-green-500 shadow-lg shadow-green-500/20"
                              : "bg-gray-700/30 border-gray-600 hover:border-green-400"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="text-3xl">☁️</div>
                            {isSelected && (
                              <div className="text-green-400 text-2xl animate-bounce">
                                ✓
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-lg mb-2 text-left">
                            {product.Name}
                          </h4>
                          <p className="text-sm text-gray-400 mb-3 text-left">
                            {product.Description || "No description"}
                          </p>
                          <div className="text-left">
                            <span className="text-xs bg-blue-600/30 px-2 py-1 rounded-full">
                              {product.Category}
                            </span>
                          </div>
                          <div className="mt-4 text-left">
                            <span className="text-2xl font-bold text-green-400">
                              ${product.Tier1Price}
                            </span>
                            <span className="text-sm text-gray-400">/mo</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("packages")}
                      disabled={selectedSaaSProducts.length === 0}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      Next: Setup Packages →
                    </button>
                  </div>
                </div>
              )}

              {currentStep === "packages" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-blue-400">
                      Select Setup Packages
                    </h3>
                    <span className="text-sm text-gray-400">
                      {selectedSetupPackages.length} selected
                    </span>
                  </div>

                  {/* Smart Suggestions */}
                  {getSuggestedSKUs().length > 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">💡</span>
                        <h4 className="font-semibold text-yellow-400">
                          Recommended Packages
                        </h4>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        Based on your selected SaaS products, we recommend these
                        setup packages:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getSuggestedSKUs().map((sku) => (
                          <button
                            key={sku.Id}
                            type="button"
                            onClick={() => toggleSetupPackage(sku.Id)}
                            className="text-sm px-3 py-1 bg-yellow-600/30 border border-yellow-500 rounded-full hover:bg-yellow-600/50 transition-colors"
                          >
                            {sku.Name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skuDefinitions.map((sku) => {
                      const isSelected = selectedSetupPackages.some(
                        (p) => p.skuId === sku.Id,
                      );
                      const isSuggested = getSuggestedSKUs().some(
                        (s) => s.Id === sku.Id,
                      );
                      return (
                        <button
                          key={sku.Id}
                          type="button"
                          onClick={() => toggleSetupPackage(sku.Id)}
                          className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 relative ${
                            isSelected
                              ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20"
                              : isSuggested
                                ? "bg-yellow-900/10 border-yellow-600 hover:border-blue-400"
                                : "bg-gray-700/30 border-gray-600 hover:border-blue-400"
                          }`}
                        >
                          {isSuggested && !isSelected && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                              ⭐
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <div className="text-3xl">📦</div>
                            {isSelected && (
                              <div className="text-blue-400 text-2xl animate-bounce">
                                ✓
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-lg mb-2 text-left">
                            {sku.Name}
                          </h4>
                          <p className="text-sm text-gray-400 mb-3 text-left">
                            {sku.Description || "No description"}
                          </p>
                          <div className="text-left">
                            <span className="text-xs bg-purple-600/30 px-2 py-1 rounded-full">
                              {sku.Category}
                            </span>
                          </div>
                          <div className="mt-4 text-left">
                            <span className="text-2xl font-bold text-blue-400">
                              ${sku.FixedPrice?.toLocaleString() || "0"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("products")}
                      className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep("discounts")}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      Next: Discounts →
                    </button>
                  </div>
                </div>
              )}

              {currentStep === "discounts" && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-purple-400">
                    💰 Apply Discounts (Optional)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600 rounded-xl p-6">
                      <label className="block text-lg font-medium mb-3 text-purple-300">
                        SaaS Year 1 Discount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          value={discountConfig.saas_year1_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              saas_year1_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-2xl font-bold pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        First year only
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600 rounded-xl p-6">
                      <label className="block text-lg font-medium mb-3 text-purple-300">
                        SaaS All Years Discount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          value={discountConfig.saas_all_years_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              saas_all_years_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-2xl font-bold pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        All projection years
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-600 rounded-xl p-6">
                      <label className="block text-lg font-medium mb-3 text-blue-300">
                        Setup Fixed Discount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={discountConfig.setup_fixed ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              setup_fixed: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl font-bold pl-12"
                        />
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Fixed dollar amount
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-600 rounded-xl p-6">
                      <label className="block text-lg font-medium mb-3 text-blue-300">
                        Setup Percentage Discount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          value={discountConfig.setup_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              setup_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl font-bold pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Percentage off setup
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("packages")}
                      className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep("review")}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      Next: Review →
                    </button>
                  </div>
                </div>
              )}

              {currentStep === "review" && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-cyan-400">
                    📊 Review & Submit
                  </h3>

                  {/* Animated Totals Display */}
                  <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-8">
                    <h4 className="text-lg font-semibold text-gray-300 mb-6">
                      Estimated Totals
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-2">
                          SaaS Monthly
                        </p>
                        <p
                          className={`text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent transition-all duration-600 ${
                            animatingTotal ? "scale-110" : "scale-100"
                          }`}
                        >
                          ${totals.totalSaaS.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-2">
                          SaaS Annual (Year 1)
                        </p>
                        <p
                          className={`text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent transition-all duration-600 ${
                            animatingTotal ? "scale-110" : "scale-100"
                          }`}
                        >
                          ${totals.totalAnnual.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-2">
                          Setup Total
                        </p>
                        <p
                          className={`text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent transition-all duration-600 ${
                            animatingTotal ? "scale-110" : "scale-100"
                          }`}
                        >
                          ${totals.totalSetup.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-900/20 border border-green-600 rounded-xl p-6">
                      <h5 className="font-semibold text-green-400 mb-4">
                        Selected Products ({selectedSaaSProducts.length})
                      </h5>
                      <ul className="space-y-2">
                        {selectedSaaSProducts.map((sp) => {
                          const product = saasProducts.find(
                            (p) => p.Id === sp.productId,
                          );
                          return (
                            <li key={sp.productId} className="text-sm">
                              ✓ {product?.Name}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-600 rounded-xl p-6">
                      <h5 className="font-semibold text-blue-400 mb-4">
                        Selected Packages ({selectedSetupPackages.length})
                      </h5>
                      <ul className="space-y-2">
                        {selectedSetupPackages.map((sp) => {
                          const sku = skuDefinitions.find(
                            (s) => s.Id === sp.skuId,
                          );
                          return (
                            <li key={sp.skuId} className="text-sm">
                              ✓ {sku?.Name} (x{sp.quantity})
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep("discounts")}
                      className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-xl"
                    >
                      ✓ Create Version
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Existing Versions */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Version History</h2>
          {!quote.Versions || quote.Versions.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-12 text-center">
              <p className="text-xl text-gray-400">No versions yet</p>
              <p className="text-gray-500 mt-2">
                Create your first version to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quote.Versions.map((version) => (
                <div
                  key={version.Id}
                  className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        Version {version.VersionNumber}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {new Date(version.CreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          version.VersionStatus === "DRAFT"
                            ? "bg-gray-600"
                            : version.VersionStatus === "SENT"
                              ? "bg-blue-600"
                              : "bg-green-600"
                        }`}
                      >
                        {version.VersionStatus}
                      </span>
                      {version.VersionStatus === "DRAFT" && (
                        <button
                          onClick={() =>
                            handleDeleteVersion(version.VersionNumber)
                          }
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-full text-sm transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">SaaS Monthly</p>
                      <p className="text-2xl font-bold text-green-400">
                        ${version.TotalSaaSMonthly?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        SaaS Annual (Year 1)
                      </p>
                      <p className="text-2xl font-bold text-green-400">
                        ${version.TotalSaaSAnnualYear1?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        Setup Packages
                      </p>
                      <p className="text-2xl font-bold text-blue-400">
                        ${version.TotalSetupPackages?.toLocaleString() || "0"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
