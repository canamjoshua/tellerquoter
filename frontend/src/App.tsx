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

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "quotes":
        return <QuoteManager />;
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
        return <Dashboard />;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Sidebar Navigation */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <nav className="w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700 flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Teller Quoter
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Quote Management System
            </p>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                Main
              </p>
            </div>
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full px-6 py-3 text-left flex items-center gap-3 transition-all ${
                  currentView === item.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400"
                    : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}

            {/* Admin Section */}
            <div className="mt-6">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="w-full px-6 py-3 text-left flex items-center justify-between text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚙️</span>
                  <span className="font-medium">Admin</span>
                </div>
                <span className="text-sm">
                  {adminExpanded || isAdminView ? "−" : "+"}
                </span>
              </button>
              {(adminExpanded || isAdminView) && (
                <div className="bg-gray-900/30">
                  {adminNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full px-6 py-2.5 pl-12 text-left flex items-center gap-3 text-sm transition-all ${
                        currentView === item.id
                          ? "bg-gray-700 text-white border-l-4 border-purple-400"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
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
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>System Online</span>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}

export default App;
