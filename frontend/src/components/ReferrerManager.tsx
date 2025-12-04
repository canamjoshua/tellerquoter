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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg shadow-md mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
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
                className="w-full border rounded px-3 py-2"
                placeholder="ABC Partner Company"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
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
                className="w-full border rounded px-3 py-2"
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Standard Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {referrers.map((referrer) => (
              <tr key={referrer.Id}>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(referrer.CreatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleDelete(referrer.Id)}
                    className="text-red-600 hover:text-red-900"
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
    </div>
  );
};

export default ReferrerManager;
