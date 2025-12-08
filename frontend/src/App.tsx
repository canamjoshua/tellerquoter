import { useState } from "react";
import Dashboard from "./components/Dashboard";
import QuoteManager from "./components/QuoteManager";
import PricingVersionManager from "./components/PricingVersionManager";
import SKUDefinitionManager from "./components/SKUDefinitionManager";
import SaaSProductManager from "./components/SaaSProductManager";
import TravelZoneManager from "./components/TravelZoneManager";
import ReferrerManager from "./components/ReferrerManager";
import TextSnippetManager from "./components/TextSnippetManager";

type View =
  | "dashboard"
  | "quotes"
  | "pricing"
  | "sku"
  | "saas"
  | "travel"
  | "referrer"
  | "snippet";

function App() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [adminExpanded, setAdminExpanded] = useState(false);

  const [shouldShowQuoteForm, setShouldShowQuoteForm] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Dashboard
            onNavigate={setCurrentView}
            onCreateQuote={() => {
              setShouldShowQuoteForm(true);
              setCurrentView("quotes");
            }}
          />
        );
      case "quotes":
        return (
          <QuoteManager
            initialShowForm={shouldShowQuoteForm}
            onFormClose={() => setShouldShowQuoteForm(false)}
          />
        );
      case "pricing":
        return <PricingVersionManager />;
      case "sku":
        return <SKUDefinitionManager />;
      case "saas":
        return <SaaSProductManager />;
      case "travel":
        return <TravelZoneManager />;
      case "referrer":
        return <ReferrerManager />;
      case "snippet":
        return <TextSnippetManager />;
      default:
        return (
          <Dashboard
            onNavigate={setCurrentView}
            onCreateQuote={() => {
              setShouldShowQuoteForm(true);
              setCurrentView("quotes");
            }}
          />
        );
    }
  };

  const mainNavItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: "📊" },
    { id: "quotes" as View, label: "Quotes", icon: "💰" },
  ];

  const adminNavItems = [
    { id: "pricing" as View, label: "Pricing Versions", icon: "📋" },
    { id: "sku" as View, label: "SKU Definitions", icon: "🏷️" },
    { id: "saas" as View, label: "SaaS Products", icon: "☁️" },
    { id: "travel" as View, label: "Travel Zones", icon: "✈️" },
    { id: "referrer" as View, label: "Referrers", icon: "🤝" },
    { id: "snippet" as View, label: "Text Snippets", icon: "📝" },
  ];

  const isAdminView = adminNavItems.some((item) => item.id === currentView);

  return (
    <div className="min-h-screen bg-[#494D50]">
      {/* Sidebar Navigation */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <nav className="w-64 bg-[#494D50] border-r border-[#6FCBDC]/20 flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-[#6FCBDC]/20">
            <div className="flex items-center gap-3">
              <img src="/teller-logo.svg" alt="Teller" className="h-8" />
            </div>
            <p className="text-xs text-[#A5A5A5] mt-2 font-light">Quoter</p>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider px-3">
                Main
              </p>
            </div>
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-all font-light ${
                  currentView === item.id
                    ? "bg-[#6FCBDC]/10 text-[#6FCBDC] border-l-4 border-[#6FCBDC]"
                    : "text-[#E6E6E6] hover:bg-[#6FCBDC]/5 hover:text-[#6FCBDC]"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-normal">{item.label}</span>
              </button>
            ))}

            {/* Admin Section */}
            <div className="mt-6">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="w-full px-6 py-3 text-left flex items-center justify-between text-[#E6E6E6] hover:bg-[#6FCBDC]/5 hover:text-[#6FCBDC] transition-all font-light"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚙️</span>
                  <span className="font-normal">Admin</span>
                </div>
                <span className="text-sm">
                  {adminExpanded || isAdminView ? "−" : "+"}
                </span>
              </button>
              {(adminExpanded || isAdminView) && (
                <div className="bg-black/10">
                  {adminNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full px-6 py-2.5 pl-12 text-left flex items-center gap-3 text-sm transition-all font-light ${
                        currentView === item.id
                          ? "bg-[#609bb0]/20 text-[#6FCBDC] border-l-4 border-[#609bb0]"
                          : "text-[#A5A5A5] hover:bg-black/10 hover:text-[#E6E6E6]"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#6FCBDC]/20">
            <div className="flex items-center gap-2 text-[#A5A5A5] text-xs font-light">
              <span className="w-2 h-2 bg-[#6BC153] rounded-full animate-pulse"></span>
              <span>System Online</span>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F7F8F9]">
          <div className="p-8">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}

export default App;
