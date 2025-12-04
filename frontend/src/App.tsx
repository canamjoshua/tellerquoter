import { useState } from "react";
import PricingVersionManager from "./components/PricingVersionManager";
import SKUDefinitionManager from "./components/SKUDefinitionManager";
import SaaSProductManager from "./components/SaaSProductManager";
import TravelZoneManager from "./components/TravelZoneManager";
import ReferrerManager from "./components/ReferrerManager";
import TextSnippetManager from "./components/TextSnippetManager";
import QuoteManager from "./components/QuoteManager";

type View =
  | "quotes"
  | "pricing"
  | "sku"
  | "saas"
  | "travel"
  | "referrer"
  | "snippet";

function App() {
  const [currentView, setCurrentView] = useState<View>("quotes");

  const renderView = () => {
    switch (currentView) {
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
        return <QuoteManager />;
    }
  };

  const navItems = [
    { id: "quotes" as View, label: "Quotes", icon: "💰" },
    { id: "pricing" as View, label: "Pricing Versions", icon: "📋" },
    { id: "sku" as View, label: "SKU Definitions", icon: "🏷️" },
    { id: "saas" as View, label: "SaaS Products", icon: "☁️" },
    { id: "travel" as View, label: "Travel Zones", icon: "✈️" },
    { id: "referrer" as View, label: "Referrers", icon: "🤝" },
    { id: "snippet" as View, label: "Text Snippets", icon: "📝" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-800">
                Teller Quoter
              </h1>
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                MVP Testing UI
              </span>
            </div>
          </div>
          <div className="flex space-x-1 pb-2 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`px-4 py-2 rounded-t text-sm font-semibold whitespace-nowrap transition-colors ${
                  currentView === item.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-300"
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{renderView()}</main>
    </div>
  );
}

export default App;
