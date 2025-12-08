import { useState, useEffect } from "react";
import VersionComparison from "./VersionComparison";

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

const API_BASE_URL = "/api";

export default function PricingVersionManager() {
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
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

  if (showComparison) {
    return <VersionComparison onClose={() => setShowComparison(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-normal text-[#494D50]">
              Pricing Version Management
            </h1>
            <p className="text-[#A5A5A5] font-light mt-2">
              Manage pricing versions and compare changes
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowComparison(true)}
              className="bg-[#609bb0] hover:bg-[#516B84] text-white px-6 py-2 rounded-lg font-normal transition-colors"
            >
              🔄 Compare Versions
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
            >
              {showForm ? "Cancel" : "+ New Version"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 font-light">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white p-6 rounded-xl mb-6 border border-[#E6E6E6]">
            <h2 className="text-2xl font-normal text-[#494D50] mb-4">
              Create New Version
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-light text-[#494D50] mb-2">
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
                    className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    placeholder="e.g., 2025.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-light text-[#494D50] mb-2">
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
                    className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
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
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  rows={3}
                  placeholder="Describe changes in this version..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-light text-[#494D50] mb-2">
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
                    className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-light text-[#494D50] mb-2">
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
                    className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 text-[#494D50]">
                <label className="flex items-center font-light">
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
                <label className="flex items-center font-light">
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
                  className="px-4 py-2 bg-[#A5A5A5] hover:bg-[#494D50] text-white rounded font-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6BC153] hover:bg-[#5ba845] text-white rounded font-normal transition-colors"
                >
                  Create Version
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC] mx-auto"></div>
            <p className="mt-4 text-[#A5A5A5] font-light">
              Loading versions...
            </p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E6E6E6]">
            <p className="text-xl text-[#494D50] font-normal">
              No pricing versions found
            </p>
            <p className="text-[#A5A5A5] font-light mt-2">
              Create your first version to get started
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F8F9] border-b border-[#E6E6E6]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E6E6] bg-white">
                {versions.map((version) => (
                  <tr
                    key={version.Id}
                    className="hover:bg-[#F7F8F9] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-normal text-[#494D50]">
                        {version.VersionNumber}
                      </div>
                      <div className="text-xs text-[#A5A5A5] font-light">
                        by {version.CreatedBy}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5] font-light">
                      {version.Description || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5] font-light">
                      {new Date(version.EffectiveDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {version.IsCurrent && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-light bg-[#6BC153]/10 text-[#6BC153] border border-[#6BC153]/30">
                            Current
                          </span>
                        )}
                        {version.IsLocked && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-light bg-[#609bb0]/10 text-[#609bb0] border border-[#609bb0]/30">
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
                            className="text-[#6FCBDC] hover:text-[#609bb0] text-sm font-light"
                          >
                            Set Current
                          </button>
                        )}
                        {!version.IsLocked && (
                          <button
                            onClick={() => handleDelete(version.Id)}
                            className="text-[#A5A5A5] hover:text-[#494D50] text-sm font-light"
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

        <div className="mt-6 text-sm text-[#A5A5A5] font-light">
          <p>Total versions: {versions.length}</p>
        </div>
      </div>
    </div>
  );
}
