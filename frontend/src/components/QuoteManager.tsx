import { useState, useEffect } from "react";
import type { Quote, NewQuote } from "../types/quote";
import QuoteBuilder from "./QuoteBuilder";

const API_BASE_URL = "/api";

export default function QuoteManager() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState<NewQuote>({
    ClientName: "",
    ClientOrganization: "",
    CreatedBy: "admin",
  });

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/quotes/`);
      if (!response.ok) throw new Error("Failed to fetch quotes");
      const data = await response.json();
      setQuotes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/quotes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuote),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create quote");
      }

      const createdQuote = await response.json();
      await fetchQuotes();
      setShowForm(false);
      setNewQuote({
        ClientName: "",
        ClientOrganization: "",
        CreatedBy: "admin",
      });
      // Automatically open the quote builder for the new quote
      setSelectedQuoteId(createdQuote.Id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this quote and all its versions?",
      )
    )
      return;

    try {
      const response = await fetch(`${API_BASE_URL}/quotes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete quote");
      }

      await fetchQuotes();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quote");
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "SENT":
        return "bg-blue-500";
      case "ACCEPTED":
        return "bg-green-500";
      case "REJECTED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // If a quote is selected, show the quote builder
  if (selectedQuoteId) {
    return (
      <QuoteBuilder
        quoteId={selectedQuoteId}
        onClose={() => {
          setSelectedQuoteId(null);
          fetchQuotes();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Quote Management</h1>
            <p className="text-gray-400 mt-2">
              Create and manage client quotes with versions
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {showForm ? "✕ Cancel" : "+ New Quote"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Create New Quote</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newQuote.ClientName}
                    onChange={(e) =>
                      setNewQuote({ ...newQuote, ClientName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client Organization
                  </label>
                  <input
                    type="text"
                    value={newQuote.ClientOrganization}
                    onChange={(e) =>
                      setNewQuote({
                        ...newQuote,
                        ClientOrganization: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition-colors"
                >
                  Create Quote
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading quotes...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xl text-gray-400">No quotes found</p>
            <p className="text-gray-500 mt-2">
              Create your first quote to get started
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Quote Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {quotes.map((quote) => (
                  <tr
                    key={quote.Id}
                    className="hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-400">
                      {quote.QuoteNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {quote.ClientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {quote.ClientOrganization || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadgeColor(
                          quote.Status,
                        )}`}
                      >
                        {quote.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(quote.CreatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedQuoteId(quote.Id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                          📝 Open
                        </button>
                        <button
                          onClick={() => handleDelete(quote.Id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
