import React, { useState, useEffect } from "react";

const API_BASE_URL = "/api";

interface Referrer {
  Id: string;
  ReferrerName: string;
  StandardRate: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

const ReferrerManager: React.FC = () => {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewModal, setViewModal] = useState<Referrer | null>(null);
  const [editModal, setEditModal] = useState<Referrer | null>(null);
  const [editForm, setEditForm] = useState<Partial<Referrer> | null>(null);
  const [newReferrer, setNewReferrer] = useState({
    ReferrerName: "",
    StandardRate: "",
    IsActive: true,
  });

  useEffect(() => {
    fetchReferrers();
  }, []);

  const fetchReferrers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/referrers/`);
      if (!response.ok) throw new Error("Failed to fetch referrers");
      const data = await response.json();
      setReferrers(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching referrers:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newReferrer,
        StandardRate: parseFloat(newReferrer.StandardRate),
      };
      const response = await fetch(`${API_BASE_URL}/referrers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create referrer");
      }
      await fetchReferrers();
      setShowForm(false);
      setNewReferrer({
        ReferrerName: "",
        StandardRate: "",
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
        ReferrerName: editForm.ReferrerName,
        StandardRate: parseFloat(editForm.StandardRate?.toString() || "0"),
        IsActive: editForm.IsActive,
      };
      const response = await fetch(
        `${API_BASE_URL}/referrers/${editModal.Id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update referrer");
      }
      await fetchReferrers();
      setEditModal(null);
      setEditForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this referrer?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/referrers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete referrer");
      }
      await fetchReferrers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const openEditModal = (referrer: Referrer) => {
    setEditModal(referrer);
    setEditForm({
      ReferrerName: referrer.ReferrerName,
      StandardRate: referrer.StandardRate,
      IsActive: referrer.IsActive,
    });
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6FCBDC] mx-auto"></div>
          <p className="mt-4 text-[#A5A5A5] font-light">Loading referrers...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-normal text-[#494D50]">Referrers</h1>
            <p className="text-[#A5A5A5] font-light mt-2">
              Manage referrer partners and their standard rates
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Referrer"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-6 font-light">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-md mb-6 border border-[#E6E6E6]"
          >
            <h2 className="text-2xl font-normal text-[#494D50] mb-4">
              Create New Referrer
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Referrer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newReferrer.ReferrerName}
                  onChange={(e) =>
                    setNewReferrer({
                      ...newReferrer,
                      ReferrerName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="ABC Partner Company"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Standard Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newReferrer.StandardRate}
                  onChange={(e) =>
                    setNewReferrer({
                      ...newReferrer,
                      StandardRate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="5.00"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center text-[#494D50] font-light">
                  <input
                    type="checkbox"
                    checked={newReferrer.IsActive}
                    onChange={(e) =>
                      setNewReferrer({
                        ...newReferrer,
                        IsActive: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
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
                Create Referrer
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
          <table className="min-w-full divide-y divide-[#E6E6E6]">
            <thead className="bg-[#F7F8F9]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Standard Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E6E6E6]">
              {referrers.map((referrer) => (
                <tr
                  key={referrer.Id}
                  className="hover:bg-[#F7F8F9] transition-colors"
                >
                  <td className="px-6 py-4 font-normal text-[#494D50]">
                    {referrer.ReferrerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#A5A5A5] font-light">
                    {parseFloat(referrer.StandardRate).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {referrer.IsActive ? (
                      <span className="px-2 py-1 text-xs font-light bg-[#6BC153]/10 text-[#6BC153] border border-[#6BC153]/30 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-light bg-[#A5A5A5]/10 text-[#A5A5A5] border border-[#A5A5A5]/30 rounded">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A5A5A5] font-light">
                    {new Date(referrer.CreatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => setViewModal(referrer)}
                      className="text-[#6FCBDC] hover:text-[#609bb0] font-light"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(referrer)}
                      className="text-[#609bb0] hover:text-[#516B84] font-light"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(referrer.Id)}
                      className="text-[#A5A5A5] hover:text-[#494D50] font-light"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {referrers.length === 0 && (
            <div className="text-center py-12 text-[#A5A5A5] font-light">
              No referrers found
            </div>
          )}
        </div>

        {/* View Modal */}
        {viewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-normal text-[#494D50]">
                    Referrer Details
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
                    <label className="text-[#A5A5A5] font-light">Name:</label>
                    <p className="font-normal text-[#494D50]">
                      {viewModal.ReferrerName}
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">
                      Standard Rate:
                    </label>
                    <p className="text-[#494D50] font-light">
                      {parseFloat(viewModal.StandardRate).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <label className="text-[#A5A5A5] font-light">Status:</label>
                    <p className="text-[#494D50] font-light">
                      {viewModal.IsActive ? "✅ Active" : "❌ Inactive"}
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
                  <div className="col-span-2">
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
                  className="mt-6 bg-[#609bb0] text-white px-6 py-2 rounded-lg hover:bg-[#516B84] font-normal transition-colors"
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
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
              <form onSubmit={handleUpdate} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-normal text-[#494D50]">
                    Edit Referrer
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
                      Referrer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.ReferrerName}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          ReferrerName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Standard Rate (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.StandardRate}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          StandardRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center text-[#494D50] font-light">
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
                    className="px-4 py-2 bg-[#6BC153] hover:bg-[#5ba845] text-white rounded font-normal transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModal(null);
                      setEditForm(null);
                    }}
                    className="px-4 py-2 bg-[#A5A5A5] hover:bg-[#494D50] text-white rounded font-light transition-colors"
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

export default ReferrerManager;
