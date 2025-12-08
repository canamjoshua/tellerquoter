import { useState, useEffect, useCallback } from "react";
import type { Quote } from "../types/quote";

const API_BASE_URL = "/api";

type View =
  | "dashboard"
  | "quotes"
  | "pricing"
  | "sku"
  | "saas"
  | "travel"
  | "referrer"
  | "snippet";

interface DashboardProps {
  onNavigate: (view: View) => void;
  onCreateQuote: () => void;
}

export default function Dashboard({
  onNavigate,
  onCreateQuote,
}: DashboardProps) {
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalQuotes: 0,
    draftVersions: 0,
    sentVersions: 0,
    acceptedVersions: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch recent quotes
      const quotesResponse = await fetch(`${API_BASE_URL}/quotes/`);
      if (!quotesResponse.ok) throw new Error("Failed to fetch quotes");
      const quotesData = await quotesResponse.json();

      // Sort by most recent and take top 10
      const sortedQuotes = quotesData.sort(
        (a: Quote, b: Quote) =>
          new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime(),
      );
      setRecentQuotes(sortedQuotes.slice(0, 10));

      // Calculate stats
      setStats({
        totalQuotes: quotesData.length,
        draftVersions: 0, // TODO: Calculate from versions
        sentVersions: 0,
        acceptedVersions: 0,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-4">
        <p className="text-red-600 font-light">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-normal text-[#494D50]">Dashboard</h1>
          <p className="text-[#A5A5A5] mt-1 font-light">
            Overview of your quoting activity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#F7F8F9] border border-[#E6E6E6] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A5A5A5] font-light">Total Quotes</p>
              <p className="text-3xl font-normal text-[#6FCBDC] mt-1">
                {stats.totalQuotes}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-[#F7F8F9] border border-[#E6E6E6] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A5A5A5] font-light">
                Draft Versions
              </p>
              <p className="text-3xl font-normal text-[#609bb0] mt-1">
                {stats.draftVersions}
              </p>
            </div>
            <div className="text-4xl">✏️</div>
          </div>
        </div>

        <div className="bg-[#F7F8F9] border border-[#E6E6E6] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A5A5A5] font-light">Sent Versions</p>
              <p className="text-3xl font-normal text-[#516B84] mt-1">
                {stats.sentVersions}
              </p>
            </div>
            <div className="text-4xl">📤</div>
          </div>
        </div>

        <div className="bg-[#F7F8F9] border border-[#E6E6E6] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A5A5A5] font-light">
                Accepted Versions
              </p>
              <p className="text-3xl font-normal text-[#6BC153] mt-1">
                {stats.acceptedVersions}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6E6E6]">
          <h2 className="text-xl font-normal text-[#494D50]">Recent Quotes</h2>
          <p className="text-sm text-[#A5A5A5] mt-1 font-light">
            Your most recently created quotes
          </p>
        </div>
        <div className="overflow-x-auto">
          {recentQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-xl text-[#494D50] font-light">No quotes yet</p>
              <p className="text-sm text-[#A5A5A5] mt-2 font-light">
                Create your first quote to get started
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#F7F8F9]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-normal text-[#494D50]">
                    Quote #
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-normal text-[#494D50]">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-normal text-[#494D50]">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-normal text-[#494D50]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-normal text-[#494D50]">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-normal text-[#494D50]">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E6E6]">
                {recentQuotes.map((quote) => (
                  <tr
                    key={quote.Id}
                    className="hover:bg-[#F7F8F9] transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => onNavigate("quotes")}
                        className="font-mono text-[#6FCBDC] hover:text-[#609bb0] hover:underline transition-colors"
                      >
                        {quote.QuoteNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#494D50] font-light">
                      {quote.ClientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5] font-light">
                      {quote.ClientOrganization || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-light ${
                          quote.Status === "DRAFT"
                            ? "bg-[#F7F8F9] text-[#A5A5A5] border border-[#E6E6E6]"
                            : quote.Status === "SENT"
                              ? "bg-[#6FCBDC]/10 text-[#609bb0] border border-[#6FCBDC]/30"
                              : "bg-[#6BC153]/10 text-[#6BC153] border border-[#6BC153]/30"
                        }`}
                      >
                        {quote.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5] font-light">
                      {new Date(quote.CreatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5] font-light">
                      {quote.CreatedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={onCreateQuote}
          className="bg-[#6FCBDC] hover:bg-[#609bb0] text-white rounded-xl p-6 text-left transition-all transform hover:scale-105"
        >
          <div className="text-3xl mb-2">➕</div>
          <div className="font-normal text-lg">Create New Quote</div>
          <div className="text-sm opacity-90 mt-1 font-light">
            Start a new quote for a client
          </div>
        </button>

        <button
          onClick={() => onNavigate("quotes")}
          className="bg-[#516B84] hover:bg-[#609bb0] text-white rounded-xl p-6 text-left transition-all transform hover:scale-105"
        >
          <div className="text-3xl mb-2">📊</div>
          <div className="font-normal text-lg">View All Quotes</div>
          <div className="text-sm opacity-90 mt-1 font-light">
            Browse and manage all quotes
          </div>
        </button>

        <button
          onClick={() => onNavigate("quotes")}
          className="bg-[#6BC153] hover:bg-[#6FCBDC] text-white rounded-xl p-6 text-left transition-all transform hover:scale-105"
        >
          <div className="text-3xl mb-2">📈</div>
          <div className="font-normal text-lg">Reports</div>
          <div className="text-sm opacity-90 mt-1 font-light">
            View quote analytics and reports
          </div>
        </button>
      </div>
    </div>
  );
}
