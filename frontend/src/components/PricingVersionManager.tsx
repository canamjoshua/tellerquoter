import { useState, useEffect } from "react";

interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string | null;
  EffectiveDate: string;
  ExpirationDate: string | null;
  CreatedBy: string;
  CreatedAt: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

interface NewVersion {
  VersionNumber: string;
  Description: string;
  EffectiveDate: string;
  ExpirationDate: string;
  CreatedBy: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

const API_BASE_URL = "http://localhost:8000/api";

export default function PricingVersionManager() {
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newVersion, setNewVersion] = useState<NewVersion>({
    VersionNumber: "",
    Description: "",
    EffectiveDate: new Date().toISOString().split("T")[0],
    ExpirationDate: "",
    CreatedBy: "admin",
    IsCurrent: false,
    IsLocked: false,
  });

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/pricing-versions/`);
      if (!response.ok) throw new Error("Failed to fetch versions");
      const data = await response.json();
      setVersions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVersion),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create version");
      }

      await fetchVersions();
      setShowForm(false);
      setNewVersion({
        VersionNumber: "",
        Description: "",
        EffectiveDate: new Date().toISOString().split("T")[0],
        ExpirationDate: "",
        CreatedBy: "admin",
        IsCurrent: false,
        IsLocked: false,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create version");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this version?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete version");
      }

      await fetchVersions();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete version");
    }
  };

  const handleSetCurrent = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing-versions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IsCurrent: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update version");
      }

      await fetchVersions();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update version");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Pricing Version Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {showForm ? "Cancel" : "+ New Version"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Create New Version</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Version Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVersion.VersionNumber}
                    onChange={(e) =>
                      setNewVersion({
                        ...newVersion,
                        VersionNumber: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 2025.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Created By *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVersion.CreatedBy}
                    onChange={(e) =>
                      setNewVersion({
                        ...newVersion,
                        CreatedBy: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={newVersion.Description}
                  onChange={(e) =>
                    setNewVersion({
                      ...newVersion,
                      Description: e.target.value,
                    })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Describe changes in this version..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newVersion.EffectiveDate}
                    onChange={(e) =>
                      setNewVersion({
                        ...newVersion,
                        EffectiveDate: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={newVersion.ExpirationDate}
                    onChange={(e) =>
                      setNewVersion({
                        ...newVersion,
                        ExpirationDate: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newVersion.IsCurrent}
                    onChange={(e) =>
                      setNewVersion({
                        ...newVersion,
                        IsCurrent: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Set as Current
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newVersion.IsLocked}
                    onChange={(e) =>
                      setNewVersion({
                        ...newVersion,
                        IsLocked: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Lock Version
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Create Version
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">
              No pricing versions found. Create your first version!
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {versions.map((version) => (
                  <tr key={version.Id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="font-semibold">
                        {version.VersionNumber}
                      </div>
                      <div className="text-xs text-gray-400">
                        by {version.CreatedBy}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {version.Description || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(version.EffectiveDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {version.IsCurrent && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-900/50 text-green-300 border border-green-500">
                            Current
                          </span>
                        )}
                        {version.IsLocked && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-900/50 text-yellow-300 border border-yellow-500">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {!version.IsCurrent && !version.IsLocked && (
                          <button
                            onClick={() => handleSetCurrent(version.Id)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                          >
                            Set Current
                          </button>
                        )}
                        {!version.IsLocked && (
                          <button
                            onClick={() => handleDelete(version.Id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-400">
          <p>Total versions: {versions.length}</p>
        </div>
      </div>
    </div>
  );
}
