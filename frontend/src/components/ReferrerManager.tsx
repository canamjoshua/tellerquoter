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
    if (!editModal) return;

    try {
      const payload = {
        ReferrerName: editForm.ReferrerName,
        StandardRate: parseFloat(editForm.StandardRate),
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

  if (loading) return <div className="p-4">Loading referrers...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Referrers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Referrer"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 p-6 rounded-lg shadow-md mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="ABC Partner Company"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="5.00"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center">
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

          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Create Referrer
          </button>
        </form>
      )}

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Standard Rate
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Created
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {referrers.map((referrer) => (
              <tr key={referrer.Id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium">
                  {referrer.ReferrerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {parseFloat(referrer.StandardRate).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referrer.IsActive ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {new Date(referrer.CreatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => setViewModal(referrer)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(referrer)}
                    className="text-green-400 hover:text-green-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(referrer.Id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {referrers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No referrers found
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Referrer Details</h2>
                <button
                  onClick={() => setViewModal(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-400">Name:</label>
                  <p className="font-semibold">{viewModal.ReferrerName}</p>
                </div>
                <div>
                  <label className="text-gray-400">Standard Rate:</label>
                  <p>{parseFloat(viewModal.StandardRate).toFixed(2)}%</p>
                </div>
                <div>
                  <label className="text-gray-400">Status:</label>
                  <p>{viewModal.IsActive ? "✅ Active" : "❌ Inactive"}</p>
                </div>
                <div>
                  <label className="text-gray-400">Created:</label>
                  <p className="text-xs">
                    {new Date(viewModal.CreatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
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
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <form onSubmit={handleUpdate} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit Referrer</h2>
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
                    Referrer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.ReferrerName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, ReferrerName: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Standard Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.StandardRate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, StandardRate: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2">
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

export default ReferrerManager;
