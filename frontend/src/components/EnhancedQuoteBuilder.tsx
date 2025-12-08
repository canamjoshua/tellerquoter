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

// Product dependency mapping
const PRODUCT_SKU_SUGGESTIONS: Record<string, string[]> = {
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

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    products: true,
    packages: true,
    discounts: false,
  });

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

  // Auto-open Version 1 for editing when it's the only draft version
  useEffect(() => {
    if (
      quote &&
      quote.Versions &&
      quote.Versions.length === 1 &&
      quote.Versions[0].VersionStatus === "DRAFT" &&
      !showVersionForm
    ) {
      // Pre-fill the form with Version 1's data
      const version1 = quote.Versions[0];
      setNewVersion({
        PricingVersionId: version1.PricingVersionId,
        ClientData: version1.ClientData,
        ProjectionYears: version1.ProjectionYears,
        CreatedBy: "admin",
        SaaSProducts: [],
        SetupPackages: [],
      });
      setShowVersionForm(true);
    }
  }, [quote, showVersionForm]);

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

    selectedSetupPackages.forEach(({ skuId, quantity }) => {
      const sku = skuDefinitions.find((s) => s.Id === skuId);
      if (sku && sku.FixedPrice) {
        totalSetup += sku.FixedPrice * quantity;
      }
    });

    // Apply discounts
    let discountedSaasYear1 = totalSaaS * 12;
    let discountedSetup = totalSetup;

    if (discountConfig.saas_year1_pct) {
      discountedSaasYear1 *= 1 - discountConfig.saas_year1_pct / 100;
    }
    if (discountConfig.setup_pct) {
      discountedSetup *= 1 - discountConfig.setup_pct / 100;
    }
    if (discountConfig.setup_fixed) {
      discountedSetup -= discountConfig.setup_fixed;
    }

    return {
      totalSaaS,
      totalSetup,
      totalAnnual: totalSaaS * 12,
      discountedSaasYear1,
      discountedSetup,
      totalContract: discountedSaasYear1 + discountedSetup,
    };
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
      <div className="min-h-screen bg-[#F7F8F9] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-[#6FCBDC] rounded-full animate-ping opacity-20"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-t-[#6FCBDC] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-[#494D50] font-light text-lg">
            Loading quote...
          </p>
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
      <div className="min-h-screen bg-[#F7F8F9] p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 font-normal">Quote not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-3 bg-[#6FCBDC] hover:bg-[#609bb0] text-white rounded-lg transition-all transform hover:scale-105 font-normal"
          >
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <button
              onClick={onClose}
              className="text-[#A5A5A5] hover:text-[#494D50] mb-4 flex items-center gap-2 transition-colors font-light"
            >
              ← Back to Quotes
            </button>
            <h1 className="text-4xl font-normal text-[#494D50]">
              {quote.QuoteNumber}
            </h1>
            <p className="text-[#A5A5A5] mt-2 text-lg font-light">
              {quote.ClientName}
              {quote.ClientOrganization && ` • ${quote.ClientOrganization}`}
            </p>
          </div>
          <div className="flex gap-3">
            {quote.Versions && quote.Versions.length >= 2 && (
              <button
                onClick={() => setShowComparison(true)}
                className="bg-[#609bb0] hover:bg-[#516B84] text-white px-6 py-3 rounded-lg font-normal transition-all transform hover:scale-105 shadow-lg"
              >
                Compare
              </button>
            )}
            <button
              onClick={() => setShowVersionForm(!showVersionForm)}
              className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-3 rounded-lg font-normal transition-all transform hover:scale-105 shadow-lg"
            >
              {showVersionForm
                ? "Cancel"
                : quote.Versions && quote.Versions.length === 1
                  ? "Edit Version 1"
                  : "+ New Version"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6 font-light">
            {error}
          </div>
        )}

        {/* New Version Form - Split View */}
        {showVersionForm && (
          <form onSubmit={handleSubmitVersion} className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Builder */}
              <div className="lg:col-span-2 space-y-4">
                {/* Pricing Version */}
                <div className="bg-white rounded-xl border border-[#E6E6E6] p-6">
                  <label className="block text-sm font-normal text-[#494D50] mb-2">
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
                    className="w-full px-4 py-3 bg-white border border-[#E6E6E6] rounded-lg text-[#494D50] font-light focus:border-[#6FCBDC] focus:outline-none"
                  >
                    <option value="">Select Pricing Version</option>
                    {pricingVersions.map((pv) => (
                      <option key={pv.Id} value={pv.Id}>
                        {pv.VersionNumber} - {pv.Description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SaaS Products Section */}
                <div className="bg-white rounded-xl border border-[#E6E6E6]">
                  <button
                    type="button"
                    onClick={() => toggleSection("products")}
                    className="w-full px-6 py-4 flex justify-between items-center hover:bg-[#F7F8F9] transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">☁️</span>
                      <div className="text-left">
                        <h3 className="text-lg font-normal text-[#6FCBDC]">
                          SaaS Products
                        </h3>
                        <p className="text-sm text-[#A5A5A5] font-light">
                          {selectedSaaSProducts.length} selected
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl text-[#494D50]">
                      {expandedSections.products ? "−" : "+"}
                    </span>
                  </button>

                  {expandedSections.products && (
                    <div className="p-6 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {saasProducts.map((product) => {
                          const isSelected = selectedSaaSProducts.some(
                            (p) => p.productId === product.Id,
                          );
                          return (
                            <button
                              key={product.Id}
                              type="button"
                              onClick={() => toggleSaaSProduct(product.Id)}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                isSelected
                                  ? "bg-[#6FCBDC]/10 border-[#6FCBDC]"
                                  : "bg-[#F7F8F9] border-[#E6E6E6] hover:border-[#6FCBDC]"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-normal text-[#494D50]">
                                  {product.Name}
                                </span>
                                {isSelected && (
                                  <span className="text-[#6FCBDC]">✓</span>
                                )}
                              </div>
                              <div className="text-xl font-normal text-[#6FCBDC]">
                                ${product.Tier1Price}/mo
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Setup Packages Section */}
                <div className="bg-white rounded-xl border border-[#E6E6E6]">
                  <button
                    type="button"
                    onClick={() => toggleSection("packages")}
                    className="w-full px-6 py-4 flex justify-between items-center hover:bg-[#F7F8F9] transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div className="text-left">
                        <h3 className="text-lg font-normal text-[#609bb0]">
                          Setup Packages
                        </h3>
                        <p className="text-sm text-[#A5A5A5] font-light">
                          {selectedSetupPackages.length} selected
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl text-[#494D50]">
                      {expandedSections.packages ? "−" : "+"}
                    </span>
                  </button>

                  {expandedSections.packages && (
                    <div className="p-6 pt-0">
                      {getSuggestedSKUs().length > 0 && (
                        <div className="bg-[#6BC153]/10 border border-[#6BC153] rounded-lg p-3 mb-4">
                          <p className="text-sm text-[#494D50] font-normal mb-2">
                            💡 Recommended for your selection
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                              className={`p-4 rounded-lg border-2 text-left transition-all relative ${
                                isSelected
                                  ? "bg-[#609bb0]/10 border-[#609bb0]"
                                  : isSuggested
                                    ? "bg-[#6BC153]/5 border-[#6BC153]"
                                    : "bg-[#F7F8F9] border-[#E6E6E6] hover:border-[#609bb0]"
                              }`}
                            >
                              {isSuggested && !isSelected && (
                                <span className="absolute -top-2 -right-2 bg-[#6BC153] text-white text-xs px-2 py-1 rounded-full font-normal">
                                  ⭐
                                </span>
                              )}
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-normal text-[#494D50]">
                                  {sku.Name}
                                </span>
                                {isSelected && (
                                  <span className="text-[#609bb0]">✓</span>
                                )}
                              </div>
                              <div className="text-xl font-normal text-[#609bb0]">
                                ${sku.FixedPrice?.toLocaleString() || "0"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Discounts Section */}
                <div className="bg-white rounded-xl border border-[#E6E6E6]">
                  <button
                    type="button"
                    onClick={() => toggleSection("discounts")}
                    className="w-full px-6 py-4 flex justify-between items-center hover:bg-[#F7F8F9] transition-colors rounded-t-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💰</span>
                      <div className="text-left">
                        <h3 className="text-lg font-normal text-[#516B84]">
                          Discounts (Optional)
                        </h3>
                      </div>
                    </div>
                    <span className="text-2xl text-[#494D50]">
                      {expandedSections.discounts ? "−" : "+"}
                    </span>
                  </button>

                  {expandedSections.discounts && (
                    <div className="p-6 pt-0 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-[#494D50] font-light mb-1 block">
                          SaaS Year 1 %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={discountConfig.saas_year1_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              saas_year1_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E6E6E6] rounded-lg text-[#494D50] font-light focus:border-[#6FCBDC] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-[#494D50] font-light mb-1 block">
                          Setup %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={discountConfig.setup_pct ?? ""}
                          onChange={(e) =>
                            setDiscountConfig({
                              ...discountConfig,
                              setup_pct: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E6E6E6] rounded-lg text-[#494D50] font-light focus:border-[#6FCBDC] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Live Preview (Paper Document) */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <div
                    className="bg-white rounded-lg shadow-xl overflow-hidden border border-[#E6E6E6]"
                    style={{
                      boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                    }}
                  >
                    {/* Paper Header */}
                    <div className="bg-[#6FCBDC] text-white p-6">
                      <h2 className="text-2xl font-normal">Quote Preview</h2>
                      <p className="text-sm opacity-90 font-light">
                        {quote.ClientName}
                        {quote.ClientOrganization &&
                          ` • ${quote.ClientOrganization}`}
                      </p>
                    </div>

                    {/* Paper Content */}
                    <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                      {/* SaaS Products */}
                      {selectedSaaSProducts.length > 0 && (
                        <div>
                          <h3 className="font-normal text-lg mb-3 text-[#6FCBDC]">
                            ☁️ SaaS Services
                          </h3>
                          <div className="space-y-2">
                            {selectedSaaSProducts.map((sp) => {
                              const product = saasProducts.find(
                                (p) => p.Id === sp.productId,
                              );
                              return (
                                <div
                                  key={sp.productId}
                                  className="flex justify-between items-center p-2 bg-[#F7F8F9] rounded border border-[#E6E6E6]"
                                >
                                  <span className="text-sm text-[#494D50] font-light">
                                    {product?.Name}
                                  </span>
                                  <span className="font-mono font-normal text-[#6FCBDC]">
                                    ${product?.Tier1Price}/mo
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Setup Packages */}
                      {selectedSetupPackages.length > 0 && (
                        <div>
                          <h3 className="font-normal text-lg mb-3 text-[#609bb0]">
                            📦 Implementation
                          </h3>
                          <div className="space-y-2">
                            {selectedSetupPackages.map((sp) => {
                              const sku = skuDefinitions.find(
                                (s) => s.Id === sp.skuId,
                              );
                              return (
                                <div
                                  key={sp.skuId}
                                  className="flex justify-between items-center p-2 bg-[#F7F8F9] rounded border border-[#E6E6E6]"
                                >
                                  <span className="text-sm text-[#494D50] font-light">
                                    {sku?.Name}
                                  </span>
                                  <span className="font-mono font-normal text-[#609bb0]">
                                    $
                                    {(
                                      (sku?.FixedPrice || 0) * sp.quantity
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Totals */}
                      <div className="border-t-2 border-[#E6E6E6] pt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#A5A5A5] font-light">
                            SaaS Monthly
                          </span>
                          <span
                            className={`font-mono font-normal text-lg text-[#494D50] transition-transform ${
                              animatingTotal ? "scale-110" : "scale-100"
                            }`}
                          >
                            ${totals.totalSaaS.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#A5A5A5] font-light">
                            SaaS Year 1
                          </span>
                          <span
                            className={`font-mono font-normal text-lg text-[#494D50] transition-transform ${
                              animatingTotal ? "scale-110" : "scale-100"
                            }`}
                          >
                            ${totals.discountedSaasYear1.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#A5A5A5] font-light">
                            Setup Total
                          </span>
                          <span
                            className={`font-mono font-normal text-lg text-[#494D50] transition-transform ${
                              animatingTotal ? "scale-110" : "scale-100"
                            }`}
                          >
                            ${totals.discountedSetup.toLocaleString()}
                          </span>
                        </div>

                        {/* Grand Total */}
                        <div className="flex justify-between items-center pt-2 border-t-2 border-[#494D50]">
                          <span className="font-normal text-lg text-[#494D50]">
                            Total Contract
                          </span>
                          <span
                            className={`font-mono font-normal text-2xl text-[#494D50] transition-transform ${
                              animatingTotal ? "scale-110" : "scale-100"
                            }`}
                          >
                            ${totals.totalContract.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Empty State */}
                      {selectedSaaSProducts.length === 0 &&
                        selectedSetupPackages.length === 0 && (
                          <div className="text-center py-12 text-[#A5A5A5]">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="font-light">
                              Select products to see your quote
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Create Button */}
                  <button
                    type="submit"
                    disabled={
                      !newVersion.PricingVersionId ||
                      (selectedSaaSProducts.length === 0 &&
                        selectedSetupPackages.length === 0)
                    }
                    className="w-full mt-4 px-6 py-4 bg-[#6BC153] hover:bg-[#5ba845] disabled:bg-[#A5A5A5] disabled:cursor-not-allowed rounded-lg font-normal text-lg text-white transition-all transform hover:scale-105 shadow-xl"
                  >
                    Create Version
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Version History */}
        <div>
          <h2 className="text-2xl font-normal text-[#494D50] mb-6">
            Version History
          </h2>
          {!quote.Versions || quote.Versions.length === 0 ? (
            <div className="bg-white border border-[#E6E6E6] rounded-xl p-12 text-center">
              <p className="text-xl text-[#A5A5A5] font-light">
                No versions yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quote.Versions.map((version) => (
                <div
                  key={version.Id}
                  className="bg-white border border-[#E6E6E6] rounded-xl p-6 hover:border-[#6FCBDC] transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-normal text-[#494D50]">
                        Version {version.VersionNumber}
                      </h3>
                      <p className="text-sm text-[#A5A5A5] font-light">
                        {new Date(version.CreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-normal ${
                          version.VersionStatus === "DRAFT"
                            ? "bg-[#A5A5A5] text-white"
                            : version.VersionStatus === "SENT"
                              ? "bg-[#6FCBDC] text-white"
                              : "bg-[#6BC153] text-white"
                        }`}
                      >
                        {version.VersionStatus}
                      </span>
                      {version.VersionStatus === "DRAFT" && (
                        <button
                          onClick={() =>
                            handleDeleteVersion(version.VersionNumber)
                          }
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-normal"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#6FCBDC]/10 border border-[#6FCBDC] rounded-lg p-4">
                      <p className="text-xs text-[#A5A5A5] font-light mb-1">
                        SaaS Monthly
                      </p>
                      <p className="text-2xl font-normal text-[#6FCBDC]">
                        ${version.TotalSaaSMonthly?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="bg-[#6FCBDC]/10 border border-[#6FCBDC] rounded-lg p-4">
                      <p className="text-xs text-[#A5A5A5] font-light mb-1">
                        SaaS Annual (Year 1)
                      </p>
                      <p className="text-2xl font-normal text-[#6FCBDC]">
                        ${version.TotalSaaSAnnualYear1?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="bg-[#609bb0]/10 border border-[#609bb0] rounded-lg p-4">
                      <p className="text-xs text-[#A5A5A5] font-light mb-1">
                        Setup Packages
                      </p>
                      <p className="text-2xl font-normal text-[#609bb0]">
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
