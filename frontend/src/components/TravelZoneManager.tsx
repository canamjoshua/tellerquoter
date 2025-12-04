import React, { useState, useEffect } from "react";

const API_BASE_URL = "/api";

interface PricingVersion {
  Id: string;
  VersionNumber: string;
  Description: string;
  IsCurrent: boolean;
  IsLocked: boolean;
}

interface TravelZone {
  Id: string;
  PricingVersionId: string;
  ZoneCode: string;
  Name: string;
  Description: string | null;
  MileageRate: string;
  DailyRate: string;
  AirfareRate: string | null;
  HotelRate: string | null;
  MealsRate: string | null;
  RentalCarRate: string | null;
  ParkingRate: string | null;
  IsActive: boolean;
  SortOrder: number;
  CreatedAt: string;
  UpdatedAt: string;
}

const TravelZoneManager: React.FC = () => {
  const [zones, setZones] = useState<TravelZone[]>([]);
  const [pricingVersions, setPricingVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] =
    useState<string>("");
  const [newZone, setNewZone] = useState({
    PricingVersionId: "",
    ZoneCode: "",
    Name: "",
    Description: "",
    MileageRate: "",
    DailyRate: "",
    AirfareRate: "",
    HotelRate: "",
    MealsRate: "",
    RentalCarRate: "",
    ParkingRate: "",
    IsActive: true,
    SortOrder: 0,
  });

  useEffect(() => {
    fetchPricingVersions();
    fetchZones();
  }, [selectedVersionFilter]);

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

  const fetchZones = async () => {
    try {
      setLoading(true);
      const url = selectedVersionFilter
        ? `${API_BASE_URL}/travel-zones/?pricing_version_id=${selectedVersionFilter}`
        : `${API_BASE_URL}/travel-zones/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch travel zones");
      const data = await response.json();
      setZones(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching zones:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newZone,
        MileageRate: parseFloat(newZone.MileageRate),
        DailyRate: parseFloat(newZone.DailyRate),
        AirfareRate: newZone.AirfareRate
          ? parseFloat(newZone.AirfareRate)
          : null,
        HotelRate: newZone.HotelRate ? parseFloat(newZone.HotelRate) : null,
        MealsRate: newZone.MealsRate ? parseFloat(newZone.MealsRate) : null,
        RentalCarRate: newZone.RentalCarRate
          ? parseFloat(newZone.RentalCarRate)
          : null,
        ParkingRate: newZone.ParkingRate
          ? parseFloat(newZone.ParkingRate)
          : null,
      };
      const response = await fetch(`${API_BASE_URL}/travel-zones/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create zone");
      }
      await fetchZones();
      setShowForm(false);
      setNewZone({
        PricingVersionId: "",
        ZoneCode: "",
        Name: "",
        Description: "",
        MileageRate: "",
        DailyRate: "",
        AirfareRate: "",
        HotelRate: "",
        MealsRate: "",
        RentalCarRate: "",
        ParkingRate: "",
        IsActive: true,
        SortOrder: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this travel zone?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/travel-zones/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete zone");
      }
      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const getVersionNumber = (versionId: string) => {
    const version = pricingVersions.find((v) => v.Id === versionId);
    return version ? version.VersionNumber : "Unknown";
  };

  if (loading) return <div className="p-4">Loading travel zones...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Travel Zones</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Zone"}
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
                value={newZone.PricingVersionId}
                onChange={(e) =>
                  setNewZone({ ...newZone, PricingVersionId: e.target.value })
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
                Zone Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newZone.ZoneCode}
                onChange={(e) =>
                  setNewZone({ ...newZone, ZoneCode: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="ZONE-A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newZone.Name}
                onChange={(e) =>
                  setNewZone({ ...newZone, Name: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={newZone.SortOrder}
                onChange={(e) =>
                  setNewZone({
                    ...newZone,
                    SortOrder: parseInt(e.target.value),
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={newZone.Description}
                onChange={(e) =>
                  setNewZone({ ...newZone, Description: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mileage Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.MileageRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, MileageRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="0.65"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Daily Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.DailyRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, DailyRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="150.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Airfare Rate
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.AirfareRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, AirfareRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="500.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Hotel Rate (per night)
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.HotelRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, HotelRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="150.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Meals Rate (per day)
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.MealsRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, MealsRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="75.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Rental Car Rate (per day)
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.RentalCarRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, RentalCarRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="60.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Parking Rate (per day)
              </label>
              <input
                type="number"
                step="0.01"
                value={newZone.ParkingRate}
                onChange={(e) =>
                  setNewZone({ ...newZone, ParkingRate: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="25.00"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newZone.IsActive}
                  onChange={(e) =>
                    setNewZone({ ...newZone, IsActive: e.target.checked })
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
            Create Zone
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mileage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Daily
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Other Rates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {zones.map((zone) => (
              <tr key={zone.Id}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {zone.ZoneCode}
                </td>
                <td className="px-6 py-4">{zone.Name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getVersionNumber(zone.PricingVersionId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${parseFloat(zone.MileageRate).toFixed(2)}/mi
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${parseFloat(zone.DailyRate).toFixed(2)}/day
                </td>
                <td className="px-6 py-4 text-xs">
                  {zone.AirfareRate && (
                    <div>✈️ ${parseFloat(zone.AirfareRate).toFixed(2)}</div>
                  )}
                  {zone.HotelRate && (
                    <div>🏨 ${parseFloat(zone.HotelRate).toFixed(2)}</div>
                  )}
                  {zone.MealsRate && (
                    <div>🍽️ ${parseFloat(zone.MealsRate).toFixed(2)}</div>
                  )}
                  {zone.RentalCarRate && (
                    <div>🚗 ${parseFloat(zone.RentalCarRate).toFixed(2)}</div>
                  )}
                  {zone.ParkingRate && (
                    <div>🅿️ ${parseFloat(zone.ParkingRate).toFixed(2)}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {zone.IsActive ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleDelete(zone.Id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {zones.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No travel zones found
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelZoneManager;
