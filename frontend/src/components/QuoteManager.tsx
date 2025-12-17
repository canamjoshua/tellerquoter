import { useState, useEffect } from "react";
import type { Quote, NewQuote } from "../types/quote";
import ConfigurableQuoteBuilder from "./ConfigurableQuoteBuilder";

const API_BASE_URL = "/api";

interface QuoteManagerProps {
  initialShowForm?: boolean;
  onFormClose?: () => void;
}

export default function QuoteManager({
  initialShowForm = false,
  onFormClose,
}: QuoteManagerProps = {}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initialShowForm);
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
        return "bg-[#F7F8F9] text-[#A5A5A5] border border-[#E6E6E6]";
      case "SENT":
        return "bg-[#6FCBDC]/10 text-[#609bb0] border border-[#6FCBDC]/30";
      case "ACCEPTED":
        return "bg-[#6BC153]/10 text-[#6BC153] border border-[#6BC153]/30";
      case "REJECTED":
        return "bg-red-500/10 text-red-600 border border-red-500/30";
      default:
        return "bg-[#F7F8F9] text-[#A5A5A5] border border-[#E6E6E6]";
    }
  };

  // If a quote is selected, show the configurable quote builder
  if (selectedQuoteId) {
    return (
      <ConfigurableQuoteBuilder
        quoteId={selectedQuoteId}
        onClose={() => {
          setSelectedQuoteId(null);
          fetchQuotes();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-normal text-[#494D50]">
              Quote Management
            </h1>
            <p className="text-[#A5A5A5] font-light mt-2">
              Create and manage client quotes with versions
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
          >
            {showForm ? "Cancel" : "+ New Quote"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 font-light">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white p-6 rounded-xl mb-6 border border-[#E6E6E6]">
            <h2 className="text-2xl font-normal text-[#494D50] mb-4">
              Create New Quote
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-light text-[#494D50] mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newQuote.ClientName}
                    onChange={(e) =>
                      setNewQuote({ ...newQuote, ClientName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-light text-[#494D50] mb-2">
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
                    className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    onFormClose?.();
                  }}
                  className="px-4 py-2 bg-[#A5A5A5] hover:bg-[#494D50] text-white rounded font-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6BC153] hover:bg-[#5ba845] text-white rounded font-normal transition-colors"
                >
                  Create Quote
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC] mx-auto"></div>
            <p className="mt-4 text-[#A5A5A5] font-light">Loading quotes...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E6E6E6]">
            <p className="text-xl text-[#494D50] font-normal">
              No quotes found
            </p>
            <p className="text-[#A5A5A5] font-light mt-2">
              Create your first quote to get started
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F8F9] border-b border-[#E6E6E6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Quote Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E6E6] bg-white">
                {quotes.map((quote) => (
                  <tr
                    key={quote.Id}
                    className="hover:bg-[#F7F8F9] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedQuoteId(quote.Id)}
                        className="font-mono text-[#6FCBDC] hover:text-[#609bb0] hover:underline font-light transition-colors"
                      >
                        {quote.QuoteNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#494D50] font-light">
                      {quote.ClientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#A5A5A5] font-light">
                      {quote.ClientOrganization || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-light rounded ${getStatusBadgeColor(
                          quote.Status,
                        )}`}
                      >
                        {quote.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A5A5A5] font-light">
                      {new Date(quote.CreatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => handleDelete(quote.Id)}
                        className="px-3 py-1 bg-[#A5A5A5] hover:bg-[#494D50] text-white rounded font-light transition-colors"
                      >
                        Delete
                      </button>
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
