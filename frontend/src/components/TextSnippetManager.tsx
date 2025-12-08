import React, { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "/api";

interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

interface TextSnippet {
  Id: string;
  PricingVersionId: string;
  SnippetKey: string;
  SnippetLabel: string;
  Content: string;
  Category: string;
  SortOrder: number;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

const TextSnippetManager: React.FC = () => {
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [pricingVersions, setPricingVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] =
    useState<string>("");
  const [viewModal, setViewModal] = useState<TextSnippet | null>(null);
  const [editModal, setEditModal] = useState<TextSnippet | null>(null);
  const [editForm, setEditForm] = useState<Partial<TextSnippet> | null>(null);
  const [newSnippet, setNewSnippet] = useState({
    PricingVersionId: "",
    SnippetKey: "",
    SnippetLabel: "",
    Content: "",
    Category: "",
    SortOrder: 0,
    IsActive: true,
  });

  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedVersionFilter
        ? `${API_BASE_URL}/text-snippets/?pricing_version_id=${selectedVersionFilter}`
        : `${API_BASE_URL}/text-snippets/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch text snippets");
      const data = await response.json();
      setSnippets(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching snippets:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedVersionFilter]);

  useEffect(() => {
    fetchPricingVersions();
    fetchSnippets();
  }, [fetchSnippets]);

  const fetchPricingVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/`);
      if (!response.ok) throw new Error("Failed to fetch pricing versions");
      const data = await response.json();
      setPricingVersions(data);
    } catch (err) {
      console.error("Error fetching pricing versions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/text-snippets/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSnippet),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create snippet");
      }
      await fetchSnippets();
      setShowForm(false);
      setNewSnippet({
        PricingVersionId: "",
        SnippetKey: "",
        SnippetLabel: "",
        Content: "",
        Category: "",
        SortOrder: 0,
        IsActive: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal || !editForm) return;

    try {
      const payload = {
        SnippetLabel: editForm.SnippetLabel,
        Content: editForm.Content,
        Category: editForm.Category,
        SortOrder: parseInt(editForm.SortOrder?.toString() || "0"),
        IsActive: editForm.IsActive,
      };
      const response = await fetch(
        `${API_BASE_URL}/text-snippets/${editModal.Id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update snippet");
      }
      await fetchSnippets();
      setEditModal(null);
      setEditForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this text snippet?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/text-snippets/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete snippet");
      }
      await fetchSnippets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const openEditModal = (snippet: TextSnippet) => {
    setEditModal(snippet);
    setEditForm({
      SnippetLabel: snippet.SnippetLabel,
      Content: snippet.Content,
      Category: snippet.Category,
      SortOrder: snippet.SortOrder,
      IsActive: snippet.IsActive,
    });
  };

  const getVersionNumber = (versionId: string) => {
    const version = pricingVersions.find((v) => v.Id === versionId);
    return version ? version.VersionNumber : "Unknown";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC] mx-auto"></div>
          <p className="mt-4 text-[#A5A5A5] font-light">
            Loading text snippets...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-normal text-[#494D50]">
              Text Snippets
            </h1>
            <p className="text-[#A5A5A5] font-light mt-2">
              Manage reusable text content for quotes and proposals
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Snippet"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 font-light">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-light text-[#494D50] mb-2">
            Filter by Pricing Version:
          </label>
          <select
            value={selectedVersionFilter}
            onChange={(e) => setSelectedVersionFilter(e.target.value)}
            className="bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 w-64 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
          >
            <option value="">All Versions</option>
            {pricingVersions.map((version) => (
              <option key={version.Id} value={version.Id}>
                {version.VersionNumber}
                {version.IsCurrent && " (Current)"}
                {version.IsLocked && " 🔒"}
              </option>
            ))}
          </select>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl mb-6 border border-[#E6E6E6]"
          >
            <h2 className="text-2xl font-normal text-[#494D50] mb-4">
              Create New Snippet
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Pricing Version <span className="text-red-500">*</span>
                </label>
                <select
                  value={newSnippet.PricingVersionId}
                  onChange={(e) =>
                    setNewSnippet({
                      ...newSnippet,
                      PricingVersionId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  required
                >
                  <option value="">Select Version</option>
                  {pricingVersions
                    .filter((v) => !v.IsLocked)
                    .map((version) => (
                      <option key={version.Id} value={version.Id}>
                        {version.VersionNumber}
                        {version.IsCurrent && " (Current)"}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Snippet Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSnippet.SnippetKey}
                  onChange={(e) =>
                    setNewSnippet({ ...newSnippet, SnippetKey: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="INTRO_TEXT, TERMS"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSnippet.SnippetLabel}
                  onChange={(e) =>
                    setNewSnippet({
                      ...newSnippet,
                      SnippetLabel: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="Introduction Text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSnippet.Category}
                  onChange={(e) =>
                    setNewSnippet({ ...newSnippet, Category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="OrderForm, Proposal, Legal"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newSnippet.Content}
                  onChange={(e) =>
                    setNewSnippet({ ...newSnippet, Content: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  rows={6}
                  placeholder="Enter the text content..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={newSnippet.SortOrder}
                  onChange={(e) =>
                    setNewSnippet({
                      ...newSnippet,
                      SortOrder: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center font-light text-[#494D50]">
                  <input
                    type="checkbox"
                    checked={newSnippet.IsActive}
                    onChange={(e) =>
                      setNewSnippet({
                        ...newSnippet,
                        IsActive: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-[#A5A5A5] hover:bg-[#494D50] text-white rounded font-light transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#6BC153] hover:bg-[#5ba845] text-white rounded font-normal transition-colors"
              >
                Create Snippet
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
          <table className="min-w-full divide-y divide-[#E6E6E6]">
            <thead className="bg-[#F7F8F9]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E6E6E6]">
              {snippets.map((snippet) => (
                <tr
                  key={snippet.Id}
                  className="hover:bg-[#F7F8F9] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#494D50]">
                    {snippet.SnippetKey}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#494D50] font-light">
                    {snippet.SnippetLabel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-[#609bb0]/10 text-[#609bb0] border border-[#609bb0]/30 rounded font-light">
                      {snippet.Category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A5A5A5] font-light">
                    {getVersionNumber(snippet.PricingVersionId)}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div
                      className="text-sm text-[#A5A5A5] font-light truncate"
                      title={snippet.Content}
                    >
                      {snippet.Content.substring(0, 100)}
                      {snippet.Content.length > 100 && "..."}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {snippet.IsActive ? (
                      <span className="px-2 py-1 text-xs bg-[#6BC153]/10 text-[#6BC153] border border-[#6BC153]/30 rounded font-light">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-[#A5A5A5]/10 text-[#A5A5A5] border border-[#A5A5A5]/30 rounded font-light">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => setViewModal(snippet)}
                      className="text-[#6FCBDC] hover:text-[#609bb0] font-light"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(snippet)}
                      className="text-[#609bb0] hover:text-[#516B84] font-light"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(snippet.Id)}
                      className="text-[#A5A5A5] hover:text-[#494D50] font-light"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {snippets.length === 0 && (
            <div className="text-center py-12 bg-white">
              <p className="text-xl text-[#494D50] font-normal">
                No text snippets found
              </p>
              <p className="text-[#A5A5A5] font-light mt-2">
                Create your first snippet to get started
              </p>
            </div>
          )}
        </div>

        {/* View Modal */}
        {viewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-normal text-[#494D50]">
                    Text Snippet Details
                  </h2>
                  <button
                    onClick={() => setViewModal(null)}
                    className="text-[#A5A5A5] hover:text-[#494D50] text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Snippet Key:
                    </label>
                    <p className="font-mono text-[#494D50]">
                      {viewModal.SnippetKey}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">Label:</label>
                    <p className="font-normal text-[#494D50]">
                      {viewModal.SnippetLabel}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Category:
                    </label>
                    <p className="text-[#494D50] font-light">
                      {viewModal.Category}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Sort Order:
                    </label>
                    <p className="text-[#494D50] font-light">
                      {viewModal.SortOrder}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-[#E6E6E6] pt-4 mt-4">
                    <label className="text-[#A5A5A5] font-light">
                      Content:
                    </label>
                    <p className="mt-2 whitespace-pre-wrap bg-[#F7F8F9] text-[#494D50] p-3 rounded font-light">
                      {viewModal.Content}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-[#E6E6E6] pt-4 mt-4"></div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">Active:</label>
                    <p className="text-[#494D50] font-light">
                      {viewModal.IsActive ? "✅ Yes" : "❌ No"}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Version:
                    </label>
                    <p className="text-[#494D50] font-light">
                      {getVersionNumber(viewModal.PricingVersionId)}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Created:
                    </label>
                    <p className="text-xs text-[#A5A5A5] font-light">
                      {new Date(viewModal.CreatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Updated:
                    </label>
                    <p className="text-xs text-[#A5A5A5] font-light">
                      {new Date(viewModal.UpdatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewModal(null)}
                  className="mt-6 bg-[#A5A5A5] hover:bg-[#494D50] text-white px-6 py-2 rounded font-light transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModal && editForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleUpdate} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-normal text-[#494D50]">
                    Edit Text Snippet
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal(null);
                      setEditForm(null);
                    }}
                    className="text-[#A5A5A5] hover:text-[#494D50] text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.SnippetLabel}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          SnippetLabel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.Category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editForm.Content}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Content: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      rows={10}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={editForm.SortOrder}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          SortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center font-light text-[#494D50]">
                      <input
                        type="checkbox"
                        checked={editForm.IsActive}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            IsActive: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded font-normal transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal(null);
                      setEditForm(null);
                    }}
                    className="bg-[#A5A5A5] hover:bg-[#494D50] text-white px-6 py-2 rounded font-light transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextSnippetManager;
