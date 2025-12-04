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

  useEffect(() => {
    fetchPricingVersions();
    fetchSnippets();
  }, [selectedVersionFilter, fetchSnippets]);

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
    if (!editModal) return;

    try {
      const payload = {
        SnippetLabel: editForm.SnippetLabel,
        Content: editForm.Content,
        Category: editForm.Category,
        SortOrder: parseInt(editForm.SortOrder),
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

  if (loading) return <div className="p-4">Loading text snippets...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Text Snippets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Snippet"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Filter by Pricing Version:
        </label>
        <select
          value={selectedVersionFilter}
          onChange={(e) => setSelectedVersionFilter(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-64 focus:outline-none focus:border-blue-500"
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
          className="bg-gray-800 p-6 rounded-lg shadow-md mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
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
              <label className="block text-sm font-medium mb-2">
                Snippet Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSnippet.SnippetKey}
                onChange={(e) =>
                  setNewSnippet({ ...newSnippet, SnippetKey: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="INTRO_TEXT, TERMS"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSnippet.SnippetLabel}
                onChange={(e) =>
                  setNewSnippet({ ...newSnippet, SnippetLabel: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Introduction Text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSnippet.Category}
                onChange={(e) =>
                  setNewSnippet({ ...newSnippet, Category: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="OrderForm, Proposal, Legal"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={newSnippet.Content}
                onChange={(e) =>
                  setNewSnippet({ ...newSnippet, Content: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                rows={6}
                placeholder="Enter the text content..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSnippet.IsActive}
                  onChange={(e) =>
                    setNewSnippet({ ...newSnippet, IsActive: e.target.checked })
                  }
                  className="mr-2"
                />
                Active
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Create Snippet
          </button>
        </form>
      )}

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Key</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Label
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Category
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Version
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Content
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {snippets.map((snippet) => (
              <tr key={snippet.Id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                  {snippet.SnippetKey}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {snippet.SnippetLabel}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                    {snippet.Category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getVersionNumber(snippet.PricingVersionId)}
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div
                    className="text-sm text-gray-400 truncate"
                    title={snippet.Content}
                  >
                    {snippet.Content.substring(0, 100)}
                    {snippet.Content.length > 100 && "..."}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {snippet.IsActive ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => setViewModal(snippet)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(snippet)}
                    className="text-green-400 hover:text-green-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(snippet.Id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {snippets.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No text snippets found
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Text Snippet Details</h2>
                <button
                  onClick={() => setViewModal(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-400">Snippet Key:</label>
                  <p className="font-mono">{viewModal.SnippetKey}</p>
                </div>
                <div>
                  <label className="text-gray-400">Label:</label>
                  <p className="font-semibold">{viewModal.SnippetLabel}</p>
                </div>
                <div>
                  <label className="text-gray-400">Category:</label>
                  <p>{viewModal.Category}</p>
                </div>
                <div>
                  <label className="text-gray-400">Sort Order:</label>
                  <p>{viewModal.SortOrder}</p>
                </div>

                <div className="col-span-2 border-t border-gray-700 pt-4 mt-4">
                  <label className="text-gray-400">Content:</label>
                  <p className="mt-2 whitespace-pre-wrap bg-gray-700 p-3 rounded">
                    {viewModal.Content}
                  </p>
                </div>

                <div className="col-span-2 border-t border-gray-700 pt-4 mt-4"></div>
                <div>
                  <label className="text-gray-400">Active:</label>
                  <p>{viewModal.IsActive ? "✅ Yes" : "❌ No"}</p>
                </div>
                <div>
                  <label className="text-gray-400">Version:</label>
                  <p>{getVersionNumber(viewModal.PricingVersionId)}</p>
                </div>
                <div>
                  <label className="text-gray-400">Created:</label>
                  <p className="text-xs">
                    {new Date(viewModal.CreatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-gray-400">Updated:</label>
                  <p className="text-xs">
                    {new Date(viewModal.UpdatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewModal(null)}
                className="mt-6 bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600"
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
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpdate} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit Text Snippet</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(null);
                    setEditForm(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.SnippetLabel}
                    onChange={(e) =>
                      setEditForm({ ...editForm, SnippetLabel: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.Category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Category: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editForm.Content}
                    onChange={(e) =>
                      setEditForm({ ...editForm, Content: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    rows={10}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editForm.SortOrder}
                    onChange={(e) =>
                      setEditForm({ ...editForm, SortOrder: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.IsActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, IsActive: e.target.checked })
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
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditModal(null);
                    setEditForm(null);
                  }}
                  className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextSnippetManager;
