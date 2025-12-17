/**
 * Configuration-Driven Quote Builder
 *
 * This component uses the new /api/saas-config/configure endpoint
 * with module-based configuration and named integrations.
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Check } from "lucide-react";

const API_BASE_URL = "/api";

// API Response Types
interface SaaSProductResult {
  product_id: string;
  product_code: string;
  name: string;
  category: string;
  monthly_cost: number;
  quantity: number;
  total_monthly_cost: number;
  reason: string;
  volume?: number | null;
  volume_unit?: string | null;
  integration_details?: {
    system_name: string;
    vendor: string;
    is_new: boolean;
  } | null;
}

interface SetupSKUResult {
  sku_id: string;
  sku_code: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason: string;
}

interface ConfigurationResult {
  selected_products: SaaSProductResult[];
  setup_skus: SetupSKUResult[];
  total_monthly_cost: number;
  total_setup_cost: number;
  summary: string;
}

interface MatureIntegration {
  integration_code: string;
  system_name: string;
  vendor: string;
  comments: string;
}

interface Integration {
  system_name: string;
  vendor: string;
  is_new: boolean;
}

interface ConfigurableQuoteBuilderProps {
  quoteId?: string;
  onClose?: () => void;
}

export default function ConfigurableQuoteBuilder({
  quoteId,
  onClose,
}: ConfigurableQuoteBuilderProps = {}) {
  const [expandedSections, setExpandedSections] = useState({
    orgParams: true,
    saas: true,
    modules: true,
    onlineForms: false,
    integrations: false,
    discounts: false,
    referral: false,
    quoteOptions: false,
    travel: false,
    review: false,
  });

  // Configuration state
  const [baseProduct, setBaseProduct] = useState<"standard" | "basic">(
    "standard",
  );
  const [additionalUsers, setAdditionalUsers] = useState(0);

  // Organization Parameters state (for Complexity Factor)
  const [orgParams, setOrgParams] = useState({
    departments: 1,
    revenueTemplates: 0,
    paymentImports: 0,
  });

  // Complexity Factor calculation result
  const [complexityResult, setComplexityResult] = useState<{
    complexity_score: number;
    tier: string;
    tier_name: string;
    base_price: number;
    sku_code: string;
    additional_dept_count: number;
    additional_dept_price: number;
  } | null>(null);

  // Online Forms state (separate forms and workflows)
  const [onlineForms, setOnlineForms] = useState({
    enabled: false,
    simpleCount: 0,
    mediumCount: 0,
    complexCount: 0,
    workflowCount: 0,
  });

  // Modules state
  const [checkRecognition, setCheckRecognition] = useState({
    enabled: false,
    is_new: true,
    scan_volume: 50000,
  });

  const [revenueSubmission, setRevenueSubmission] = useState({
    enabled: false,
    is_new: true,
    num_submitters: 25,
  });

  const [tellerOnline, setTellerOnline] = useState({
    enabled: false,
    is_new: true,
    transactions_per_year: 50000,
  });

  // Integrations state
  const [bidirectionalIntegrations, setBidirectionalIntegrations] = useState<
    Integration[]
  >([]);
  const [paymentImportIntegrations, setPaymentImportIntegrations] = useState<
    Integration[]
  >([]);

  // Discounts state
  const [discounts, setDiscounts] = useState({
    saas_year1_pct: 0,
    saas_all_years_pct: 0,
    setup_fixed: 0,
    setup_pct: 0,
  });

  // Referral state
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referralRateOverride, setReferralRateOverride] = useState<
    number | null
  >(null);
  const [referrers, setReferrers] = useState<
    Array<{ Id: string; ReferrerName: string; DefaultRate: number }>
  >([]);

  // Quote Options state
  const [quoteOptions, setQuoteOptions] = useState({
    projectionYears: 5,
    escalationModel: "STANDARD_4PCT",
    multiYearFreezeYears: null as number | null,
    levelLoadingEnabled: false,
    tellerPaymentsEnabled: false,
  });

  // Travel state
  const [travelZoneId, setTravelZoneId] = useState<string | null>(null);
  const [travelTrips, setTravelTrips] = useState<
    Array<{ days: number; people: number }>
  >([]);
  const [travelZones, setTravelZones] = useState<
    Array<{ Id: string; ZoneName: string; DailyRate: number }>
  >([]);

  // Available integrations from API
  const [matureIntegrations, setMatureIntegrations] = useState<
    MatureIntegration[]
  >([]);

  // Results
  const [configResult, setConfigResult] = useState<ConfigurationResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [pricingVersionId, setPricingVersionId] = useState<string | null>(null);

  // Load available integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/saas-config/available-integrations`,
        );
        if (!response.ok) throw new Error("Failed to load integrations");
        const data = await response.json();
        setMatureIntegrations(data.mature_integrations);
      } catch (err) {
        console.error("Error loading integrations:", err);
      }
    };
    fetchIntegrations();
  }, []);

  // Load referrers
  useEffect(() => {
    const fetchReferrers = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/referrers/?is_active=true`,
        );
        if (!response.ok) throw new Error("Failed to load referrers");
        const data = await response.json();
        setReferrers(data);
      } catch (err) {
        console.error("Error loading referrers:", err);
      }
    };
    fetchReferrers();
  }, []);

  // Load travel zones
  useEffect(() => {
    const fetchTravelZones = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/travel-zones/?is_active=true`,
        );
        if (!response.ok) throw new Error("Failed to load travel zones");
        const data = await response.json();
        setTravelZones(data);
      } catch (err) {
        console.error("Error loading travel zones:", err);
      }
    };
    fetchTravelZones();
  }, []);

  // Calculate complexity factor when org params change
  useEffect(() => {
    const calculateComplexity = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/quote-calculations/complexity-factor`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              departments: orgParams.departments,
              revenue_templates: orgParams.revenueTemplates,
              payment_imports: orgParams.paymentImports,
            }),
          },
        );
        if (response.ok) {
          const result = await response.json();
          setComplexityResult(result);
        }
      } catch (err) {
        console.error("Error calculating complexity:", err);
      }
    };

    const timer = setTimeout(calculateComplexity, 300);
    return () => clearTimeout(timer);
  }, [orgParams]);

  // Auto-configure on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      configure();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [
    baseProduct,
    additionalUsers,
    checkRecognition,
    revenueSubmission,
    tellerOnline,
    bidirectionalIntegrations,
    paymentImportIntegrations,
  ]);

  const configure = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        base_product: baseProduct,
        additional_users: additionalUsers,
        modules: {
          ...(checkRecognition.enabled && {
            check_recognition: checkRecognition,
          }),
          ...(revenueSubmission.enabled && {
            revenue_submission: revenueSubmission,
          }),
          ...(tellerOnline.enabled && {
            teller_online: tellerOnline,
          }),
        },
        integrations: {
          bidirectional: bidirectionalIntegrations,
          payment_import: paymentImportIntegrations,
        },
      };

      const response = await fetch(`${API_BASE_URL}/saas-config/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Configuration failed: ${errorText}`);
      }

      const result = await response.json();
      setConfigResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Configuration error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load quote version data when editing an existing quote
  useEffect(() => {
    if (!quoteId) return;

    const loadQuoteVersion = async () => {
      try {
        // Load quote with versions
        const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}`);
        if (!response.ok) throw new Error("Failed to load quote");
        const quote = await response.json();

        // Find the latest version (for editing)
        const versions = quote.versions || [];
        if (versions.length === 0) return;

        const latestVersion = versions.reduce(
          (prev: { VersionNumber: number }, curr: { VersionNumber: number }) =>
            curr.VersionNumber > prev.VersionNumber ? curr : prev,
          versions[0],
        );

        setVersionNumber(latestVersion.VersionNumber);
        setPricingVersionId(latestVersion.PricingVersionId);

        // Load configuration from version's ClientData if available
        const clientData = latestVersion.ClientData || {};
        if (clientData.configuration) {
          const config = clientData.configuration;
          // Restore base product
          if (config.base_product) {
            setBaseProduct(config.base_product);
          }
          if (config.additional_users) {
            setAdditionalUsers(config.additional_users);
          }
          // Restore modules
          if (config.modules?.check_recognition) {
            setCheckRecognition(config.modules.check_recognition);
          }
          if (config.modules?.revenue_submission) {
            setRevenueSubmission(config.modules.revenue_submission);
          }
          if (config.modules?.teller_online) {
            setTellerOnline(config.modules.teller_online);
          }
          // Restore integrations
          if (config.integrations?.bidirectional) {
            setBidirectionalIntegrations(config.integrations.bidirectional);
          }
          if (config.integrations?.payment_import) {
            setPaymentImportIntegrations(config.integrations.payment_import);
          }
        }

        // Restore discount config
        if (latestVersion.DiscountConfig) {
          setDiscounts(latestVersion.DiscountConfig);
        }

        // Restore quote options
        setQuoteOptions({
          projectionYears: latestVersion.ProjectionYears || 5,
          escalationModel: latestVersion.EscalationModel || "STANDARD_4PCT",
          multiYearFreezeYears: latestVersion.MultiYearFreezeYears,
          levelLoadingEnabled: latestVersion.LevelLoadingEnabled || false,
          tellerPaymentsEnabled: latestVersion.TellerPaymentsEnabled || false,
        });

        // Restore travel
        if (latestVersion.TravelZoneId) {
          setTravelZoneId(latestVersion.TravelZoneId);
        }
        if (latestVersion.TravelConfig?.trips) {
          setTravelTrips(latestVersion.TravelConfig.trips);
        }

        // Restore referral
        if (latestVersion.ReferrerId) {
          setReferrerId(latestVersion.ReferrerId);
        }
        if (latestVersion.ReferralRateOverride) {
          setReferralRateOverride(latestVersion.ReferralRateOverride);
        }
      } catch (err) {
        console.error("Error loading quote:", err);
        setError(err instanceof Error ? err.message : "Failed to load quote");
      }
    };

    loadQuoteVersion();
  }, [quoteId]);

  // Save quote to backend
  const saveQuote = async () => {
    if (!quoteId || !configResult || !pricingVersionId) {
      setSaveError("Cannot save: missing quote ID or configuration");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Build configuration payload to store in ClientData
      const configurationPayload = {
        base_product: baseProduct,
        additional_users: additionalUsers,
        modules: {
          check_recognition: checkRecognition,
          revenue_submission: revenueSubmission,
          teller_online: tellerOnline,
        },
        integrations: {
          bidirectional: bidirectionalIntegrations,
          payment_import: paymentImportIntegrations,
        },
      };

      // Build SaaS products payload
      const saasProducts = configResult.selected_products
        .filter((p) => p.product_id) // Only include products with IDs
        .map((p) => ({
          SaaSProductId: p.product_id,
          Quantity: p.quantity,
          Notes: p.integration_details
            ? `${p.integration_details.system_name} (${p.integration_details.vendor})`
            : null,
        }));

      // Build setup packages payload
      const setupPackages = configResult.setup_skus
        .filter((s) => s.sku_id) // Only include SKUs with IDs
        .map((s, index) => ({
          SKUDefinitionId: s.sku_id,
          Quantity: s.quantity,
          CustomScopeNotes: s.reason,
          SequenceOrder: index,
        }));

      // Build version update payload
      const versionPayload = {
        ClientData: {
          configuration: configurationPayload,
        },
        ProjectionYears: quoteOptions.projectionYears,
        EscalationModel: quoteOptions.escalationModel,
        MultiYearFreezeYears: quoteOptions.multiYearFreezeYears,
        LevelLoadingEnabled: quoteOptions.levelLoadingEnabled,
        TellerPaymentsEnabled: quoteOptions.tellerPaymentsEnabled,
        DiscountConfig: discounts,
        ReferrerId: referrerId,
        ReferralRateOverride: referralRateOverride,
        TravelZoneId: travelZoneId,
        TravelConfig: {
          trips: travelTrips,
        },
        SaaSProducts: saasProducts,
        SetupPackages: setupPackages,
      };

      // Update the quote version
      const response = await fetch(
        `${API_BASE_URL}/quotes/${quoteId}/versions/${versionNumber}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(versionPayload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save quote: ${errorText}`);
      }

      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save quote");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const addBidirectionalIntegration = () => {
    setBidirectionalIntegrations([
      ...bidirectionalIntegrations,
      { system_name: "", vendor: "", is_new: true },
    ]);
  };

  const removeBidirectionalIntegration = (index: number) => {
    setBidirectionalIntegrations(
      bidirectionalIntegrations.filter((_, i) => i !== index),
    );
  };

  const updateBidirectionalIntegration = (
    index: number,
    field: keyof Integration,
    value: string | boolean,
  ) => {
    const updated = [...bidirectionalIntegrations];
    updated[index] = { ...updated[index], [field]: value };
    setBidirectionalIntegrations(updated);
  };

  const addPaymentImportIntegration = () => {
    setPaymentImportIntegrations([
      ...paymentImportIntegrations,
      { system_name: "", vendor: "", is_new: true },
    ]);
  };

  const removePaymentImportIntegration = (index: number) => {
    setPaymentImportIntegrations(
      paymentImportIntegrations.filter((_, i) => i !== index),
    );
  };

  const updatePaymentImportIntegration = (
    index: number,
    field: keyof Integration,
    value: string | boolean,
  ) => {
    const updated = [...paymentImportIntegrations];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentImportIntegrations(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d21] via-[#2a2f35] to-[#1a1d21] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6FCBDC] to-[#4A9BAA] rounded-xl p-8 mb-8 shadow-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white">
                {quoteId
                  ? `Quote ${quoteId}`
                  : "Configuration-Driven Quote Builder"}
              </h1>
              <p className="text-white/90 mt-2 font-light">
                Module-based configuration with named integrations
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                ← Back to Quotes
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Parameters Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-[#6FCBDC]/20">
              <button
                onClick={() => toggleSection("orgParams")}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#6FCBDC]/20 to-[#6FCBDC]/5 hover:from-[#6FCBDC]/30 hover:to-[#6FCBDC]/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏢</span>
                  <h2 className="text-xl font-semibold text-white">
                    Organization Parameters
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {complexityResult && (
                    <span className="text-xs bg-[#6FCBDC]/20 text-[#6FCBDC] px-2 py-1 rounded-full">
                      {complexityResult.tier_name} Tier
                    </span>
                  )}
                  {expandedSections.orgParams ? (
                    <ChevronDown className="text-[#6FCBDC]" />
                  ) : (
                    <ChevronRight className="text-[#6FCBDC]" />
                  )}
                </div>
              </button>

              {expandedSections.orgParams && (
                <div className="p-6 space-y-6">
                  {/* Complexity Factor Inputs */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#E6E6E6] mb-2">
                        Number of Departments
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={orgParams.departments}
                        onChange={(e) =>
                          setOrgParams({
                            ...orgParams,
                            departments: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-4 py-2 bg-[#1a1d21] border border-[#4a5563] rounded-lg text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                      />
                      <p className="text-xs text-[#A5A5A5] mt-1">
                        Cashiering departments
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#E6E6E6] mb-2">
                        Revenue Submission Templates
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={orgParams.revenueTemplates}
                        onChange={(e) =>
                          setOrgParams({
                            ...orgParams,
                            revenueTemplates: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 bg-[#1a1d21] border border-[#4a5563] rounded-lg text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                      />
                      <p className="text-xs text-[#A5A5A5] mt-1">
                        Number of templates (÷4 in formula)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#E6E6E6] mb-2">
                        Payment Imports
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={orgParams.paymentImports}
                        onChange={(e) =>
                          setOrgParams({
                            ...orgParams,
                            paymentImports: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2 bg-[#1a1d21] border border-[#4a5563] rounded-lg text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                      />
                      <p className="text-xs text-[#A5A5A5] mt-1">
                        Number of payment import interfaces
                      </p>
                    </div>
                  </div>

                  {/* Complexity Factor Result Display */}
                  {complexityResult && (
                    <div className="bg-gradient-to-r from-[#6FCBDC]/10 to-[#4A9BAA]/10 rounded-lg p-4 border border-[#6FCBDC]/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white">
                          Complexity Factor Calculation
                        </h4>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            complexityResult.tier === "BASIC"
                              ? "bg-green-500/20 text-green-400"
                              : complexityResult.tier === "MEDIUM"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-orange-500/20 text-orange-400"
                          }`}
                        >
                          {complexityResult.tier_name}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[#A5A5A5]">Formula:</p>
                          <p className="text-[#E6E6E6] font-mono">
                            {orgParams.departments} + (
                            {orgParams.revenueTemplates} ÷ 4) +{" "}
                            {orgParams.paymentImports}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#A5A5A5]">Complexity Score:</p>
                          <p className="text-[#6FCBDC] text-xl font-bold">
                            {complexityResult.complexity_score}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#A5A5A5]">Organization Setup:</p>
                          <p className="text-[#E6E6E6]">
                            ${complexityResult.base_price.toLocaleString()}
                          </p>
                        </div>
                        {complexityResult.additional_dept_count > 0 && (
                          <div>
                            <p className="text-[#A5A5A5]">
                              Additional Depts (
                              {complexityResult.additional_dept_count}):
                            </p>
                            <p className="text-[#E6E6E6]">
                              $
                              {complexityResult.additional_dept_price.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#6FCBDC]/20">
                        <p className="text-xs text-[#A5A5A5]">
                          Tier thresholds: Basic (0-10) | Medium (11-20) | Large
                          (21+)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SaaS Products Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-[#6FCBDC]/20">
              <button
                onClick={() => toggleSection("saas")}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#3a9b7f]/20 to-[#3a9b7f]/5 hover:from-[#3a9b7f]/30 hover:to-[#3a9b7f]/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">☁️</span>
                  <h2 className="text-xl font-semibold text-white">
                    SaaS Products
                  </h2>
                </div>
                {expandedSections.saas ? (
                  <ChevronDown className="text-[#6FCBDC]" />
                ) : (
                  <ChevronRight className="text-[#6FCBDC]" />
                )}
              </button>

              {expandedSections.saas && (
                <div className="p-6 space-y-6">
                  {/* Base Product */}
                  <div>
                    <label className="block text-sm font-medium text-[#E6E6E6] mb-2">
                      Base Product
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setBaseProduct("standard")}
                        className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                          baseProduct === "standard"
                            ? "border-[#6FCBDC] bg-[#6FCBDC]/10 text-[#6FCBDC]"
                            : "border-[#4a5563] bg-[#1a1d21] text-[#A5A5A5] hover:border-[#6FCBDC]/50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {baseProduct === "standard" && <Check size={16} />}
                          Teller Standard ($2,950/mo)
                        </div>
                      </button>
                      <button
                        onClick={() => setBaseProduct("basic")}
                        className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                          baseProduct === "basic"
                            ? "border-[#6FCBDC] bg-[#6FCBDC]/10 text-[#6FCBDC]"
                            : "border-[#4a5563] bg-[#1a1d21] text-[#A5A5A5] hover:border-[#6FCBDC]/50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {baseProduct === "basic" && <Check size={16} />}
                          Teller Basic ($1,950/mo)
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Additional Users */}
                  <div>
                    <label className="block text-sm font-medium text-[#E6E6E6] mb-2">
                      Additional Named Users ($60/mo each)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={additionalUsers}
                      onChange={(e) =>
                        setAdditionalUsers(parseInt(e.target.value) || 0)
                      }
                      className="w-full px-4 py-2 bg-[#1a1d21] border border-[#4a5563] rounded-lg text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modules Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-[#6FCBDC]/20">
              <button
                onClick={() => toggleSection("modules")}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#7B68EE]/20 to-[#7B68EE]/5 hover:from-[#7B68EE]/30 hover:to-[#7B68EE]/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <h2 className="text-xl font-semibold text-white">
                    Application Modules
                  </h2>
                </div>
                {expandedSections.modules ? (
                  <ChevronDown className="text-[#6FCBDC]" />
                ) : (
                  <ChevronRight className="text-[#6FCBDC]" />
                )}
              </button>

              {expandedSections.modules && (
                <div className="p-6 space-y-6">
                  {/* Check Recognition */}
                  <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={checkRecognition.enabled}
                        onChange={(e) =>
                          setCheckRecognition({
                            ...checkRecognition,
                            enabled: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                      />
                      <label className="text-base font-medium text-[#E6E6E6]">
                        Check Recognition & Bulk Scanning
                      </label>
                    </div>
                    {checkRecognition.enabled && (
                      <div className="ml-8 space-y-3">
                        <div>
                          <label className="block text-sm text-[#A5A5A5] mb-1">
                            Annual Scan Volume
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={checkRecognition.scan_volume}
                            onChange={(e) =>
                              setCheckRecognition({
                                ...checkRecognition,
                                scan_volume: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                          />
                          <p className="text-xs text-[#A5A5A5] mt-1">
                            ≤50K: $1,030/mo | 50K-150K: $1,500/mo | &gt;150K:
                            $2,100/mo
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checkRecognition.is_new}
                            onChange={(e) =>
                              setCheckRecognition({
                                ...checkRecognition,
                                is_new: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                          />
                          <label className="text-sm text-[#A5A5A5]">
                            New implementation (requires setup: $12,880)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Revenue Submission */}
                  <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={revenueSubmission.enabled}
                        onChange={(e) =>
                          setRevenueSubmission({
                            ...revenueSubmission,
                            enabled: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                      />
                      <label className="text-base font-medium text-[#E6E6E6]">
                        Revenue Submission Portal
                      </label>
                    </div>
                    {revenueSubmission.enabled && (
                      <div className="ml-8 space-y-3">
                        <div>
                          <label className="block text-sm text-[#A5A5A5] mb-1">
                            Number of Submitters
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={revenueSubmission.num_submitters}
                            onChange={(e) =>
                              setRevenueSubmission({
                                ...revenueSubmission,
                                num_submitters: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                          />
                          <p className="text-xs text-[#A5A5A5] mt-1">
                            ≤25: $600/mo | 26-100: $1,000/mo | &gt;100:
                            $1,500/mo
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={revenueSubmission.is_new}
                            onChange={(e) =>
                              setRevenueSubmission({
                                ...revenueSubmission,
                                is_new: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                          />
                          <label className="text-sm text-[#A5A5A5]">
                            New implementation (requires setup: $9,200)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Teller Online */}
                  <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={tellerOnline.enabled}
                        onChange={(e) =>
                          setTellerOnline({
                            ...tellerOnline,
                            enabled: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                      />
                      <label className="text-base font-medium text-[#E6E6E6]">
                        Teller Online Customer Portal
                      </label>
                    </div>
                    {tellerOnline.enabled && (
                      <div className="ml-8 space-y-3">
                        <div>
                          <label className="block text-sm text-[#A5A5A5] mb-1">
                            Estimated Transactions Per Year
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tellerOnline.transactions_per_year}
                            onChange={(e) =>
                              setTellerOnline({
                                ...tellerOnline,
                                transactions_per_year:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                          />
                          <p className="text-xs text-[#A5A5A5] mt-1">
                            ≤50K: $800/mo | 50K-150K: $1,200/mo | &gt;150K:
                            $1,600/mo
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tellerOnline.is_new}
                            onChange={(e) =>
                              setTellerOnline({
                                ...tellerOnline,
                                is_new: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                          />
                          <label className="text-sm text-[#A5A5A5]">
                            New implementation (requires setup: $6,440)
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Online Forms Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-pink-500/20">
              <button
                onClick={() => toggleSection("onlineForms")}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-pink-600/10 hover:from-pink-500/20 hover:to-pink-600/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">
                      Online Forms
                    </h3>
                    <p className="text-sm text-[#A5A5A5]">
                      Web forms with optional workflows
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {onlineForms.enabled && (
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full">
                      {onlineForms.simpleCount +
                        onlineForms.mediumCount +
                        onlineForms.complexCount}{" "}
                      forms
                    </span>
                  )}
                  {expandedSections.onlineForms ? (
                    <ChevronDown className="text-[#6FCBDC]" />
                  ) : (
                    <ChevronRight className="text-[#6FCBDC]" />
                  )}
                </div>
              </button>

              {expandedSections.onlineForms && (
                <div className="p-6 space-y-6 border-t border-pink-500/20">
                  {/* Enable Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={onlineForms.enabled}
                      onChange={(e) =>
                        setOnlineForms({
                          ...onlineForms,
                          enabled: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-[#4a5563] text-pink-500 focus:ring-pink-500"
                    />
                    <label className="text-base font-medium text-[#E6E6E6]">
                      Enable Online Forms
                    </label>
                  </div>

                  {onlineForms.enabled && (
                    <>
                      {/* Form Counts by Tier */}
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3">
                          Form Counts by Complexity
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                            <label className="block text-sm text-green-400 mb-2 font-medium">
                              Tier 1 - Simple
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={onlineForms.simpleCount}
                              onChange={(e) =>
                                setOnlineForms({
                                  ...onlineForms,
                                  simpleCount: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-pink-500"
                            />
                            <p className="text-xs text-[#A5A5A5] mt-2">
                              &lt;15 fields, simple sums
                            </p>
                            <p className="text-xs text-green-400 mt-1">
                              $4,600 each
                            </p>
                          </div>
                          <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                            <label className="block text-sm text-yellow-400 mb-2 font-medium">
                              Tier 2 - Medium
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={onlineForms.mediumCount}
                              onChange={(e) =>
                                setOnlineForms({
                                  ...onlineForms,
                                  mediumCount: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-pink-500"
                            />
                            <p className="text-xs text-[#A5A5A5] mt-2">
                              15-29 fields OR complex calcs
                            </p>
                            <p className="text-xs text-yellow-400 mt-1">
                              $9,200 each
                            </p>
                          </div>
                          <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                            <label className="block text-sm text-orange-400 mb-2 font-medium">
                              Tier 3 - Complex
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={onlineForms.complexCount}
                              onChange={(e) =>
                                setOnlineForms({
                                  ...onlineForms,
                                  complexCount: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-pink-500"
                            />
                            <p className="text-xs text-[#A5A5A5] mt-2">
                              30+ fields OR custom code
                            </p>
                            <p className="text-xs text-orange-400 mt-1">
                              $13,800 each
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Workflow Count (separate from forms) */}
                      <div className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]">
                        <label className="block text-sm font-medium text-[#E6E6E6] mb-2">
                          Workflow Add-ons
                        </label>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            min="0"
                            max={
                              onlineForms.simpleCount +
                              onlineForms.mediumCount +
                              onlineForms.complexCount
                            }
                            value={onlineForms.workflowCount}
                            onChange={(e) =>
                              setOnlineForms({
                                ...onlineForms,
                                workflowCount: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-24 px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-pink-500"
                          />
                          <div>
                            <p className="text-sm text-[#A5A5A5]">
                              Approval/routing workflows ($11,500 each)
                            </p>
                            <p className="text-xs text-[#6a7583] mt-1">
                              Multiple forms can share a workflow. Max:{" "}
                              {onlineForms.simpleCount +
                                onlineForms.mediumCount +
                                onlineForms.complexCount}{" "}
                              (total forms)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cost Summary */}
                      {(onlineForms.simpleCount > 0 ||
                        onlineForms.mediumCount > 0 ||
                        onlineForms.complexCount > 0) && (
                        <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-lg p-4 border border-pink-500/30">
                          <h4 className="text-sm font-semibold text-white mb-3">
                            Online Forms Setup Cost
                          </h4>
                          <div className="space-y-2 text-sm">
                            {onlineForms.simpleCount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#A5A5A5]">
                                  {onlineForms.simpleCount} × Tier 1 (Simple)
                                </span>
                                <span className="text-[#E6E6E6]">
                                  $
                                  {(
                                    onlineForms.simpleCount * 4600
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {onlineForms.mediumCount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#A5A5A5]">
                                  {onlineForms.mediumCount} × Tier 2 (Medium)
                                </span>
                                <span className="text-[#E6E6E6]">
                                  $
                                  {(
                                    onlineForms.mediumCount * 9200
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {onlineForms.complexCount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#A5A5A5]">
                                  {onlineForms.complexCount} × Tier 3 (Complex)
                                </span>
                                <span className="text-[#E6E6E6]">
                                  $
                                  {(
                                    onlineForms.complexCount * 13800
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {onlineForms.workflowCount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#A5A5A5]">
                                  {onlineForms.workflowCount} × Workflow Add-on
                                </span>
                                <span className="text-[#E6E6E6]">
                                  $
                                  {(
                                    onlineForms.workflowCount * 11500
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-pink-500/20 font-bold">
                              <span className="text-white">Total Setup</span>
                              <span className="text-pink-400">
                                $
                                {(
                                  onlineForms.simpleCount * 4600 +
                                  onlineForms.mediumCount * 9200 +
                                  onlineForms.complexCount * 13800 +
                                  onlineForms.workflowCount * 11500
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Integrations Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-[#6FCBDC]/20">
              <button
                onClick={() => toggleSection("integrations")}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#FF6B6B]/20 to-[#FF6B6B]/5 hover:from-[#FF6B6B]/30 hover:to-[#FF6B6B]/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔌</span>
                  <h2 className="text-xl font-semibold text-white">
                    System Integrations
                  </h2>
                </div>
                {expandedSections.integrations ? (
                  <ChevronDown className="text-[#6FCBDC]" />
                ) : (
                  <ChevronRight className="text-[#6FCBDC]" />
                )}
              </button>

              {expandedSections.integrations && (
                <div className="p-6 space-y-6">
                  {/* Bidirectional Integrations */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-base font-medium text-[#E6E6E6]">
                        Bi-Directional Interfaces ($285/mo each)
                      </label>
                      <button
                        onClick={addBidirectionalIntegration}
                        className="px-3 py-1 bg-[#6FCBDC] hover:bg-[#5ABBC9] text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {bidirectionalIntegrations.map((integration, index) => (
                        <div
                          key={index}
                          className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div>
                                <label className="block text-sm text-[#A5A5A5] mb-1">
                                  System Name
                                </label>
                                <select
                                  value={integration.system_name}
                                  onChange={(e) =>
                                    updateBidirectionalIntegration(
                                      index,
                                      "system_name",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                                >
                                  <option value="">
                                    Select or type custom...
                                  </option>
                                  {matureIntegrations.map((mi) => (
                                    <option
                                      key={mi.integration_code}
                                      value={mi.system_name}
                                    >
                                      {mi.system_name} ({mi.vendor})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm text-[#A5A5A5] mb-1">
                                  Vendor
                                </label>
                                <input
                                  type="text"
                                  value={integration.vendor}
                                  onChange={(e) =>
                                    updateBidirectionalIntegration(
                                      index,
                                      "vendor",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={integration.is_new}
                                  onChange={(e) =>
                                    updateBidirectionalIntegration(
                                      index,
                                      "is_new",
                                      e.target.checked,
                                    )
                                  }
                                  className="w-4 h-4 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                                />
                                <label className="text-sm text-[#A5A5A5]">
                                  New integration (setup: $7,360 mature /
                                  $28,520 custom)
                                </label>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                removeBidirectionalIntegration(index)
                              }
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {bidirectionalIntegrations.length === 0 && (
                        <p className="text-sm text-[#A5A5A5] text-center py-4">
                          No bi-directional integrations added
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Import Integrations */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-base font-medium text-[#E6E6E6]">
                        Payment Import Interfaces ($170/mo each)
                      </label>
                      <button
                        onClick={addPaymentImportIntegration}
                        className="px-3 py-1 bg-[#6FCBDC] hover:bg-[#5ABBC9] text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {paymentImportIntegrations.map((integration, index) => (
                        <div
                          key={index}
                          className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div>
                                <label className="block text-sm text-[#A5A5A5] mb-1">
                                  System Name
                                </label>
                                <select
                                  value={integration.system_name}
                                  onChange={(e) =>
                                    updatePaymentImportIntegration(
                                      index,
                                      "system_name",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                                >
                                  <option value="">
                                    Select or type custom...
                                  </option>
                                  {matureIntegrations.map((mi) => (
                                    <option
                                      key={mi.integration_code}
                                      value={mi.system_name}
                                    >
                                      {mi.system_name} ({mi.vendor})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm text-[#A5A5A5] mb-1">
                                  Vendor
                                </label>
                                <input
                                  type="text"
                                  value={integration.vendor}
                                  onChange={(e) =>
                                    updatePaymentImportIntegration(
                                      index,
                                      "vendor",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-[#6FCBDC]"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={integration.is_new}
                                  onChange={(e) =>
                                    updatePaymentImportIntegration(
                                      index,
                                      "is_new",
                                      e.target.checked,
                                    )
                                  }
                                  className="w-4 h-4 rounded border-[#4a5563] text-[#6FCBDC] focus:ring-[#6FCBDC]"
                                />
                                <label className="text-sm text-[#A5A5A5]">
                                  New integration (setup: $7,360 mature /
                                  $28,520 custom)
                                </label>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                removePaymentImportIntegration(index)
                              }
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {paymentImportIntegrations.length === 0 && (
                        <p className="text-sm text-[#A5A5A5] text-center py-4">
                          No payment import integrations added
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Discounts Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-purple-500/20">
              <button
                onClick={() =>
                  setExpandedSections({
                    ...expandedSections,
                    discounts: !expandedSections.discounts,
                  })
                }
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">
                      Discounts
                    </h3>
                    <p className="text-sm text-[#A5A5A5]">
                      Optional price reductions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(discounts.saas_year1_pct > 0 ||
                    discounts.saas_all_years_pct > 0 ||
                    discounts.setup_fixed > 0 ||
                    discounts.setup_pct > 0) && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                  {expandedSections.discounts ? (
                    <ChevronDown className="text-[#6FCBDC]" />
                  ) : (
                    <ChevronRight className="text-[#6FCBDC]" />
                  )}
                </div>
              </button>

              {expandedSections.discounts && (
                <div className="p-6 space-y-4 border-t border-purple-500/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        SaaS Year 1 Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discounts.saas_year1_pct}
                        onChange={(e) =>
                          setDiscounts({
                            ...discounts,
                            saas_year1_pct: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        SaaS All Years Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discounts.saas_all_years_pct}
                        onChange={(e) =>
                          setDiscounts({
                            ...discounts,
                            saas_all_years_pct: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        Setup Fixed Discount ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={discounts.setup_fixed}
                        onChange={(e) =>
                          setDiscounts({
                            ...discounts,
                            setup_fixed: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        Setup Percentage Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discounts.setup_pct}
                        onChange={(e) =>
                          setDiscounts({
                            ...discounts,
                            setup_pct: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Referral Partner Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-yellow-500/20">
              <button
                onClick={() =>
                  setExpandedSections({
                    ...expandedSections,
                    referral: !expandedSections.referral,
                  })
                }
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤝</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">
                      Referral Partner
                    </h3>
                    <p className="text-sm text-[#A5A5A5]">
                      Optional partner commission
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {referrerId && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                      Selected
                    </span>
                  )}
                  {expandedSections.referral ? (
                    <ChevronDown className="text-[#6FCBDC]" />
                  ) : (
                    <ChevronRight className="text-[#6FCBDC]" />
                  )}
                </div>
              </button>

              {expandedSections.referral && (
                <div className="p-6 space-y-4 border-t border-yellow-500/20">
                  <div>
                    <label className="block text-sm text-[#A5A5A5] mb-2">
                      Select Partner
                    </label>
                    <select
                      value={referrerId || ""}
                      onChange={(e) => setReferrerId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-yellow-500"
                    >
                      <option value="">No referral partner</option>
                      {referrers.map((ref) => (
                        <option key={ref.Id} value={ref.Id}>
                          {ref.ReferrerName} ({ref.DefaultRate}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  {referrerId && (
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        Override Rate (%) - Leave blank to use default
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={referralRateOverride ?? ""}
                        onChange={(e) =>
                          setReferralRateOverride(
                            e.target.value ? parseFloat(e.target.value) : null,
                          )
                        }
                        placeholder="Use default rate"
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quote Options Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-orange-500/20">
              <button
                onClick={() =>
                  setExpandedSections({
                    ...expandedSections,
                    quoteOptions: !expandedSections.quoteOptions,
                  })
                }
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚙️</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">
                      Quote Options
                    </h3>
                    <p className="text-sm text-[#A5A5A5]">
                      Escalation & contract terms
                    </p>
                  </div>
                </div>
                {expandedSections.quoteOptions ? (
                  <ChevronDown className="text-[#6FCBDC]" />
                ) : (
                  <ChevronRight className="text-[#6FCBDC]" />
                )}
              </button>

              {expandedSections.quoteOptions && (
                <div className="p-6 space-y-4 border-t border-orange-500/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        Projection Years
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={quoteOptions.projectionYears}
                        onChange={(e) =>
                          setQuoteOptions({
                            ...quoteOptions,
                            projectionYears: parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        Escalation Model
                      </label>
                      <select
                        value={quoteOptions.escalationModel}
                        onChange={(e) =>
                          setQuoteOptions({
                            ...quoteOptions,
                            escalationModel: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-orange-500"
                      >
                        <option value="STANDARD_4PCT">Standard 4%</option>
                        <option value="CPI">CPI-Based</option>
                        <option value="MULTI_YEAR_FREEZE">
                          Multi-Year Freeze
                        </option>
                      </select>
                    </div>
                  </div>
                  {quoteOptions.escalationModel === "MULTI_YEAR_FREEZE" && (
                    <div>
                      <label className="block text-sm text-[#A5A5A5] mb-2">
                        Freeze Years
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={quoteOptions.multiYearFreezeYears ?? ""}
                        onChange={(e) =>
                          setQuoteOptions({
                            ...quoteOptions,
                            multiYearFreezeYears: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quoteOptions.levelLoadingEnabled}
                        onChange={(e) =>
                          setQuoteOptions({
                            ...quoteOptions,
                            levelLoadingEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-[#4a5563] text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-[#E6E6E6]">
                        Enable Level Loading
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quoteOptions.tellerPaymentsEnabled}
                        onChange={(e) =>
                          setQuoteOptions({
                            ...quoteOptions,
                            tellerPaymentsEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-[#4a5563] text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-[#E6E6E6]">
                        Enable Teller Payments
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Travel Configuration Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-cyan-500/20">
              <button
                onClick={() =>
                  setExpandedSections({
                    ...expandedSections,
                    travel: !expandedSections.travel,
                  })
                }
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 hover:from-cyan-500/20 hover:to-cyan-600/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✈️</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Travel</h3>
                    <p className="text-sm text-[#A5A5A5]">
                      Optional travel expenses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {travelTrips.length > 0 && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">
                      {travelTrips.length} trip
                      {travelTrips.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {expandedSections.travel ? (
                    <ChevronDown className="text-[#6FCBDC]" />
                  ) : (
                    <ChevronRight className="text-[#6FCBDC]" />
                  )}
                </div>
              </button>

              {expandedSections.travel && (
                <div className="p-6 space-y-4 border-t border-cyan-500/20">
                  <div>
                    <label className="block text-sm text-[#A5A5A5] mb-2">
                      Travel Zone
                    </label>
                    <select
                      value={travelZoneId || ""}
                      onChange={(e) => setTravelZoneId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">No travel required</option>
                      {travelZones.map((zone) => (
                        <option key={zone.Id} value={zone.Id}>
                          {zone.ZoneName} (${zone.DailyRate}/day)
                        </option>
                      ))}
                    </select>
                  </div>

                  {travelZoneId && (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">
                          Trips
                        </h4>
                        <button
                          onClick={() =>
                            setTravelTrips([
                              ...travelTrips,
                              { days: 3, people: 1 },
                            ])
                          }
                          className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded text-sm flex items-center gap-1 transition-colors"
                        >
                          <Plus size={16} /> Add Trip
                        </button>
                      </div>

                      <div className="space-y-3">
                        {travelTrips.map((trip, index) => (
                          <div
                            key={index}
                            className="bg-[#1a1d21] rounded-lg p-4 border border-[#4a5563]"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-white">
                                Trip {index + 1}
                              </span>
                              <button
                                onClick={() =>
                                  setTravelTrips(
                                    travelTrips.filter((_, i) => i !== index),
                                  )
                                }
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-[#A5A5A5] mb-1">
                                  Days
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={trip.days}
                                  onChange={(e) => {
                                    const updated = [...travelTrips];
                                    updated[index].days =
                                      parseInt(e.target.value) || 1;
                                    setTravelTrips(updated);
                                  }}
                                  className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] text-sm focus:outline-none focus:border-cyan-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-[#A5A5A5] mb-1">
                                  People
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={trip.people}
                                  onChange={(e) => {
                                    const updated = [...travelTrips];
                                    updated[index].people =
                                      parseInt(e.target.value) || 1;
                                    setTravelTrips(updated);
                                  }}
                                  className="w-full px-3 py-2 bg-[#2a2f35] border border-[#4a5563] rounded text-[#E6E6E6] text-sm focus:outline-none focus:border-cyan-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {travelTrips.length === 0 && (
                          <p className="text-sm text-[#A5A5A5] text-center py-4">
                            No trips added yet
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Review & Confirmation Section */}
            <div className="bg-[#2a2f35] rounded-xl shadow-xl overflow-hidden border border-green-500/20">
              <button
                onClick={() =>
                  setExpandedSections({
                    ...expandedSections,
                    review: !expandedSections.review,
                  })
                }
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">
                      Review & Confirm
                    </h3>
                    <p className="text-sm text-[#A5A5A5]">
                      Review all SKUs and line items
                    </p>
                  </div>
                </div>
                {expandedSections.review ? (
                  <ChevronDown className="text-[#6FCBDC]" />
                ) : (
                  <ChevronRight className="text-[#6FCBDC]" />
                )}
              </button>

              {expandedSections.review && (
                <div className="p-6 space-y-4 border-t border-green-500/20">
                  {configResult ? (
                    <>
                      {/* SaaS Products Review */}
                      {configResult.selected_products.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="text-green-400">☁️</span>
                            SaaS Products (
                            {configResult.selected_products.length})
                          </h4>
                          <div className="space-y-2">
                            {configResult.selected_products.map(
                              (product, index) => (
                                <div
                                  key={index}
                                  className="bg-[#1a1d21] rounded-lg p-3 border border-[#4a5563]"
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">
                                          {product.name}
                                        </span>
                                        {product.quantity > 1 && (
                                          <span className="text-xs bg-[#4a5563] text-[#A5A5A5] px-2 py-0.5 rounded">
                                            ×{product.quantity}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#6a7583] mt-1">
                                        {product.reason}
                                      </p>
                                    </div>
                                    <span className="text-sm font-bold text-green-400 ml-2">
                                      ${product.total_monthly_cost.toFixed(2)}
                                      /mo
                                    </span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Setup SKUs Review */}
                      {configResult.setup_skus.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="text-blue-400">📦</span>
                            Setup Services ({configResult.setup_skus.length})
                          </h4>
                          <div className="space-y-2">
                            {configResult.setup_skus.map((sku, index) => (
                              <div
                                key={index}
                                className="bg-[#1a1d21] rounded-lg p-3 border border-[#4a5563]"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white">
                                        {sku.name}
                                      </span>
                                      {sku.quantity > 1 && (
                                        <span className="text-xs bg-[#4a5563] text-[#A5A5A5] px-2 py-0.5 rounded">
                                          ×{sku.quantity}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#6a7583] mt-1">
                                      {sku.reason}
                                    </p>
                                  </div>
                                  <span className="text-sm font-bold text-blue-400 ml-2">
                                    ${sku.total_price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Organization Setup Summary (from Complexity Calculation) */}
                      {complexityResult && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="text-[#6FCBDC]">🏢</span>
                            Organization Setup
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                complexityResult.tier === "BASIC"
                                  ? "bg-green-500/20 text-green-400"
                                  : complexityResult.tier === "MEDIUM"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-orange-500/20 text-orange-400"
                              }`}
                            >
                              {complexityResult.tier_name}
                            </span>
                          </h4>
                          <div className="bg-[#1a1d21] rounded-lg p-3 border border-[#4a5563] space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#A5A5A5]">
                                Complexity Score ({orgParams.departments} depts
                                + {orgParams.revenueTemplates}/4 templates +{" "}
                                {orgParams.paymentImports} imports)
                              </span>
                              <span className="text-[#6FCBDC] font-bold">
                                {complexityResult.complexity_score}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#A5A5A5]">
                                Teller Setup - {complexityResult.tier_name}
                              </span>
                              <span className="text-[#E6E6E6]">
                                ${complexityResult.base_price.toLocaleString()}
                              </span>
                            </div>
                            {complexityResult.additional_dept_count > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-[#A5A5A5]">
                                  Additional Departments (
                                  {complexityResult.additional_dept_count})
                                </span>
                                <span className="text-[#E6E6E6]">
                                  $
                                  {complexityResult.additional_dept_price.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm pt-2 border-t border-[#4a5563] font-medium">
                              <span className="text-white">
                                Org Setup Total
                              </span>
                              <span className="text-[#6FCBDC]">
                                $
                                {(
                                  complexityResult.base_price +
                                  complexityResult.additional_dept_price
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Online Forms Summary */}
                      {onlineForms.enabled &&
                        (onlineForms.simpleCount > 0 ||
                          onlineForms.mediumCount > 0 ||
                          onlineForms.complexCount > 0) && (
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                              <span className="text-pink-400">📝</span>
                              Online Forms (
                              {onlineForms.simpleCount +
                                onlineForms.mediumCount +
                                onlineForms.complexCount}{" "}
                              forms)
                            </h4>
                            <div className="bg-[#1a1d21] rounded-lg p-3 border border-[#4a5563] space-y-2">
                              {onlineForms.simpleCount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#A5A5A5]">
                                    Tier 1 - Simple ({onlineForms.simpleCount})
                                  </span>
                                  <span className="text-[#E6E6E6]">
                                    $
                                    {(
                                      onlineForms.simpleCount * 4600
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {onlineForms.mediumCount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#A5A5A5]">
                                    Tier 2 - Medium ({onlineForms.mediumCount})
                                  </span>
                                  <span className="text-[#E6E6E6]">
                                    $
                                    {(
                                      onlineForms.mediumCount * 9200
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {onlineForms.complexCount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#A5A5A5]">
                                    Tier 3 - Complex ({onlineForms.complexCount}
                                    )
                                  </span>
                                  <span className="text-[#E6E6E6]">
                                    $
                                    {(
                                      onlineForms.complexCount * 13800
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {onlineForms.workflowCount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#A5A5A5]">
                                    Workflow Add-ons (
                                    {onlineForms.workflowCount})
                                  </span>
                                  <span className="text-[#E6E6E6]">
                                    $
                                    {(
                                      onlineForms.workflowCount * 11500
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm pt-2 border-t border-[#4a5563] font-medium">
                                <span className="text-white">Forms Total</span>
                                <span className="text-pink-400">
                                  $
                                  {(
                                    onlineForms.simpleCount * 4600 +
                                    onlineForms.mediumCount * 9200 +
                                    onlineForms.complexCount * 13800 +
                                    onlineForms.workflowCount * 11500
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Totals Summary */}
                      <div className="pt-4 border-t border-green-500/20">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#A5A5A5]">
                              Monthly Recurring:
                            </span>
                            <span className="text-lg font-bold text-green-400">
                              ${configResult.total_monthly_cost.toFixed(2)}/mo
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[#A5A5A5]">
                              One-Time Setup:
                            </span>
                            <span className="text-lg font-bold text-blue-400">
                              ${configResult.total_setup_cost.toFixed(2)}
                            </span>
                          </div>
                          {/* Show Organization Setup and Online Forms additions */}
                          {(complexityResult ||
                            (onlineForms.enabled &&
                              onlineForms.simpleCount +
                                onlineForms.mediumCount +
                                onlineForms.complexCount >
                                0)) && (
                            <div className="text-xs text-[#6a7583] italic">
                              + Organization Setup & Online Forms from
                              parameters above
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-[#4a5563]">
                            <span className="text-sm font-semibold text-white">
                              Year 1 Total:
                            </span>
                            <span className="text-xl font-bold text-[#6FCBDC]">
                              $
                              {(
                                configResult.total_monthly_cost * 12 +
                                configResult.total_setup_cost
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Save Quote Button */}
                      <div className="pt-4 space-y-2">
                        {saveError && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-red-400 text-sm">{saveError}</p>
                          </div>
                        )}
                        {saveSuccess && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <p className="text-green-400 text-sm">
                              Quote saved successfully!
                            </p>
                          </div>
                        )}
                        <button
                          onClick={saveQuote}
                          disabled={saving || !quoteId}
                          className={`w-full px-6 py-3 font-semibold rounded-lg transition-all transform flex items-center justify-center gap-2 ${
                            !quoteId
                              ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                              : saving
                                ? "bg-gray-600 text-gray-300 cursor-wait"
                                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-[1.02]"
                          }`}
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check size={20} />
                              {quoteId ? "Save Quote" : "Select a Quote First"}
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#6a7583]">
                        Configure your quote to review
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Results Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden sticky top-8">
              <div className="bg-gradient-to-r from-[#6FCBDC] to-[#4A9BAA] p-6">
                <h3 className="text-2xl font-bold text-white">Live Quote</h3>
                <p className="text-white/90 text-sm mt-1">Real-time pricing</p>
              </div>

              <div className="p-6 space-y-4">
                {loading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC] mx-auto"></div>
                    <p className="text-[#4a5563] mt-4">Calculating...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {!loading && !error && configResult && (
                  <>
                    {/* Summary */}
                    <div className="bg-gradient-to-br from-[#6FCBDC]/10 to-[#4A9BAA]/10 rounded-lg p-4 border border-[#6FCBDC]/30">
                      <p className="text-[#2a2f35] text-sm font-medium">
                        {configResult.summary}
                      </p>
                    </div>

                    {/* Products */}
                    {configResult.selected_products.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[#2a2f35] mb-3">
                          SaaS Products ({configResult.selected_products.length}
                          )
                        </h4>
                        <div className="space-y-2">
                          {configResult.selected_products.map(
                            (product, index) => (
                              <div
                                key={index}
                                className="bg-[#f5f5f5] rounded-lg p-3 border border-[#e5e5e5]"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-sm font-medium text-[#2a2f35]">
                                    {product.name}
                                  </span>
                                  <span className="text-sm font-bold text-[#6FCBDC]">
                                    ${product.total_monthly_cost.toFixed(2)}/mo
                                  </span>
                                </div>
                                <p className="text-xs text-[#6a7583]">
                                  {product.reason}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Setup SKUs */}
                    {configResult.setup_skus.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[#2a2f35] mb-3">
                          Setup Services ({configResult.setup_skus.length})
                        </h4>
                        <div className="space-y-2">
                          {configResult.setup_skus.map((sku, index) => (
                            <div
                              key={index}
                              className="bg-[#f5f5f5] rounded-lg p-3 border border-[#e5e5e5]"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-[#2a2f35]">
                                  {sku.name}
                                </span>
                                <span className="text-sm font-bold text-[#4A9BAA]">
                                  ${sku.total_price.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-xs text-[#6a7583]">
                                {sku.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="pt-4 border-t-2 border-[#e5e5e5] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#2a2f35]">
                          Monthly Total:
                        </span>
                        <span className="text-xl font-bold text-[#6FCBDC]">
                          ${configResult.total_monthly_cost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#2a2f35]">
                          Setup Total:
                        </span>
                        <span className="text-xl font-bold text-[#4A9BAA]">
                          ${configResult.total_setup_cost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {!loading && !error && !configResult && (
                  <div className="text-center py-8">
                    <p className="text-[#6a7583]">
                      Configure your quote to see pricing
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
