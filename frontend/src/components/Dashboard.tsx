import { useState, useEffect, useCallback } from "react";
import type { Quote } from "../types/quote";

const API_BASE_URL = "/api";

export default function Dashboard() {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Overview of your quoting activity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Quotes</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">
                {stats.totalQuotes}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Draft Versions</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">
                {stats.draftVersions}
              </p>
            </div>
            <div className="text-4xl">✏️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Sent Versions</p>
              <p className="text-3xl font-bold text-purple-400 mt-1">
                {stats.sentVersions}
              </p>
            </div>
            <div className="text-4xl">📤</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Accepted Versions</p>
              <p className="text-3xl font-bold text-green-400 mt-1">
                {stats.acceptedVersions}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Recent Quotes</h2>
          <p className="text-sm text-gray-400 mt-1">
            Your most recently created quotes
          </p>
        </div>
        <div className="overflow-x-auto">
          {recentQuotes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-xl text-gray-400">No quotes yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Create your first quote to get started
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Quote #
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {recentQuotes.map((quote) => (
                  <tr
                    key={quote.Id}
                    className="hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-blue-400">
                      {quote.QuoteNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {quote.ClientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {quote.ClientOrganization || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.Status === "DRAFT"
                            ? "bg-gray-700 text-gray-300"
                            : quote.Status === "SENT"
                              ? "bg-blue-700 text-blue-300"
                              : "bg-green-700 text-green-300"
                        }`}
                      >
                        {quote.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(quote.CreatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
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
        <button className="bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl p-6 text-left transition-all transform hover:scale-105">
          <div className="text-3xl mb-2">➕</div>
          <div className="font-bold text-lg">Create New Quote</div>
          <div className="text-sm opacity-90 mt-1">
            Start a new quote for a client
          </div>
        </button>

        <button className="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl p-6 text-left transition-all transform hover:scale-105">
          <div className="text-3xl mb-2">📊</div>
          <div className="font-bold text-lg">View All Quotes</div>
          <div className="text-sm opacity-90 mt-1">
            Browse and manage all quotes
          </div>
        </button>

        <button className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl p-6 text-left transition-all transform hover:scale-105">
          <div className="text-3xl mb-2">📈</div>
          <div className="font-bold text-lg">Reports</div>
          <div className="text-sm opacity-90 mt-1">
            View quote analytics and reports
          </div>
        </button>
      </div>
    </div>
  );
}
