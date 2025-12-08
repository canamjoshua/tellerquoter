import React, { useState, useEffect, useCallback } from "react";

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
  const [viewModal, setViewModal] = useState<TravelZone | null>(null);
  const [editModal, setEditModal] = useState<TravelZone | null>(null);
  const [editForm, setEditForm] = useState<Partial<TravelZone> | null>(null);
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

  const fetchZones = useCallback(async () => {
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
  }, [selectedVersionFilter]);

  useEffect(() => {
    fetchPricingVersions();
    fetchZones();
  }, [fetchZones]);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal || !editForm) return;

    try {
      const payload = {
        Name: editForm.Name,
        Description: editForm.Description || null,
        MileageRate: parseFloat(editForm.MileageRate?.toString() || "0"),
        DailyRate: parseFloat(editForm.DailyRate?.toString() || "0"),
        AirfareRate: editForm.AirfareRate
          ? parseFloat(editForm.AirfareRate.toString())
          : null,
        HotelRate: editForm.HotelRate
          ? parseFloat(editForm.HotelRate.toString())
          : null,
        MealsRate: editForm.MealsRate
          ? parseFloat(editForm.MealsRate.toString())
          : null,
        RentalCarRate: editForm.RentalCarRate
          ? parseFloat(editForm.RentalCarRate.toString())
          : null,
        ParkingRate: editForm.ParkingRate
          ? parseFloat(editForm.ParkingRate.toString())
          : null,
        IsActive: editForm.IsActive,
        SortOrder: parseInt(editForm.SortOrder?.toString() || "0"),
      };
      const response = await fetch(
        `${API_BASE_URL}/travel-zones/${editModal.Id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update zone");
      }
      await fetchZones();
      setEditModal(null);
      setEditForm(null);
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

  const openEditModal = (zone: TravelZone) => {
    setEditModal(zone);
    setEditForm({
      Name: zone.Name,
      Description: zone.Description || "",
      MileageRate: zone.MileageRate,
      DailyRate: zone.DailyRate,
      AirfareRate: zone.AirfareRate || "",
      HotelRate: zone.HotelRate || "",
      MealsRate: zone.MealsRate || "",
      RentalCarRate: zone.RentalCarRate || "",
      ParkingRate: zone.ParkingRate || "",
      IsActive: zone.IsActive,
      SortOrder: zone.SortOrder,
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
            Loading travel zones...
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
              Travel Zones
            </h1>
            <p className="text-[#A5A5A5] font-light mt-2">
              Manage travel zones and their rates for different pricing versions
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#6BC153] hover:bg-[#5ba845] text-white px-6 py-2 rounded-lg font-normal transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Zone"}
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
              Create New Travel Zone
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Pricing Version <span className="text-red-500">*</span>
                </label>
                <select
                  value={newZone.PricingVersionId}
                  onChange={(e) =>
                    setNewZone({ ...newZone, PricingVersionId: e.target.value })
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
                  Zone Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newZone.ZoneCode}
                  onChange={(e) =>
                    setNewZone({ ...newZone, ZoneCode: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="ZONE-A"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newZone.Name}
                  onChange={(e) =>
                    setNewZone({ ...newZone, Name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
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
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Description
                </label>
                <textarea
                  value={newZone.Description}
                  onChange={(e) =>
                    setNewZone({ ...newZone, Description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Mileage Rate <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.MileageRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, MileageRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="0.65"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Daily Rate <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.DailyRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, DailyRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="150.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Airfare Rate
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.AirfareRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, AirfareRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Hotel Rate (per night)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.HotelRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, HotelRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="150.00"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Meals Rate (per day)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.MealsRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, MealsRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="75.00"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Rental Car Rate (per day)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.RentalCarRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, RentalCarRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="60.00"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-[#494D50] mb-2">
                  Parking Rate (per day)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newZone.ParkingRate}
                  onChange={(e) =>
                    setNewZone({ ...newZone, ParkingRate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                  placeholder="25.00"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center font-light text-[#494D50]">
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
                Create Zone
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-[#E6E6E6] overflow-hidden">
          <table className="min-w-full divide-y divide-[#E6E6E6]">
            <thead className="bg-[#F7F8F9]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Daily
                </th>
                <th className="px-6 py-3 text-left text-xs font-normal text-[#494D50] uppercase tracking-wider">
                  Other Rates
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
              {zones.map((zone) => (
                <tr
                  key={zone.Id}
                  className="hover:bg-[#F7F8F9] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-[#494D50]">
                    {zone.ZoneCode}
                  </td>
                  <td className="px-6 py-4 text-[#494D50] font-light">
                    {zone.Name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A5A5A5] font-light">
                    {getVersionNumber(zone.PricingVersionId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#494D50] font-light">
                    ${parseFloat(zone.MileageRate).toFixed(2)}/mi
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#494D50] font-light">
                    ${parseFloat(zone.DailyRate).toFixed(2)}/day
                  </td>
                  <td className="px-6 py-4 text-xs text-[#A5A5A5] font-light">
                    {zone.AirfareRate && (
                      <div>${parseFloat(zone.AirfareRate).toFixed(2)} air</div>
                    )}
                    {zone.HotelRate && (
                      <div>${parseFloat(zone.HotelRate).toFixed(2)} hotel</div>
                    )}
                    {zone.MealsRate && (
                      <div>${parseFloat(zone.MealsRate).toFixed(2)} meals</div>
                    )}
                    {zone.RentalCarRate && (
                      <div>
                        ${parseFloat(zone.RentalCarRate).toFixed(2)} car
                      </div>
                    )}
                    {zone.ParkingRate && (
                      <div>
                        ${parseFloat(zone.ParkingRate).toFixed(2)} parking
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {zone.IsActive ? (
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
                      onClick={() => setViewModal(zone)}
                      className="text-[#6FCBDC] hover:text-[#609bb0] font-light"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(zone)}
                      className="text-[#609bb0] hover:text-[#516B84] font-light"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone.Id)}
                      className="text-[#A5A5A5] hover:text-[#494D50] font-light"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {zones.length === 0 && (
            <div className="text-center py-12 bg-white">
              <p className="text-xl text-[#494D50] font-normal">
                No travel zones found
              </p>
              <p className="text-[#A5A5A5] font-light mt-2">
                Create your first travel zone to get started
              </p>
            </div>
          )}
        </div>

        {/* View Modal */}
        {viewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-normal text-[#494D50]">
                    Travel Zone Details
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
                    <label className="text-gray-400">Zone Code:</label>
                    <p className="font-mono">{viewModal.ZoneCode}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Name:</label>
                    <p className="font-semibold">{viewModal.Name}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400">Description:</label>
                    <p>{viewModal.Description || "—"}</p>
                  </div>

                  <div className="col-span-2 border-t border-gray-700 pt-4 mt-4">
                    <h3 className="font-semibold mb-2">Base Rates</h3>
                  </div>
                  <div>
                    <label className="text-gray-400">Mileage Rate:</label>
                    <p>
                      ${parseFloat(viewModal.MileageRate).toFixed(2)} per mile
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Daily Rate:</label>
                    <p>${parseFloat(viewModal.DailyRate).toFixed(2)} per day</p>
                  </div>

                  <div className="col-span-2 border-t border-gray-700 pt-4 mt-4">
                    <h3 className="font-semibold mb-2">Additional Expenses</h3>
                  </div>
                  <div>
                    <label className="text-gray-400">Airfare:</label>
                    <p>
                      {viewModal.AirfareRate
                        ? `$${parseFloat(viewModal.AirfareRate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Hotel (per night):</label>
                    <p>
                      {viewModal.HotelRate
                        ? `$${parseFloat(viewModal.HotelRate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Meals (per day):</label>
                    <p>
                      {viewModal.MealsRate
                        ? `$${parseFloat(viewModal.MealsRate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">
                      Rental Car (per day):
                    </label>
                    <p>
                      {viewModal.RentalCarRate
                        ? `$${parseFloat(viewModal.RentalCarRate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400">Parking (per day):</label>
                    <p>
                      {viewModal.ParkingRate
                        ? `$${parseFloat(viewModal.ParkingRate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-gray-700 pt-4 mt-4"></div>
                  <div>
                    <label className="text-gray-400">Active:</label>
                    <p>{viewModal.IsActive ? "✅ Yes" : "❌ No"}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">Sort Order:</label>
                    <p>{viewModal.SortOrder}</p>
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
                  <div className="col-span-2">
                    <label className="text-gray-400">Updated:</label>
                    <p className="text-xs">
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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleUpdate} className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-normal text-[#494D50]">
                    Edit Travel Zone
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
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.Name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, Name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
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
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.Description || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          Description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Mileage Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.MileageRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          MileageRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Daily Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.DailyRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          DailyRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Airfare Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.AirfareRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          AirfareRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Hotel Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.HotelRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          HotelRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Meals Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.MealsRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          MealsRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Rental Car Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.RentalCarRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          RentalCarRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-[#494D50] mb-2">
                      Parking Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.ParkingRate ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          ParkingRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E6E6E6] text-[#494D50] rounded px-3 py-2 focus:outline-none focus:border-[#6FCBDC] focus:ring-1 focus:ring-[#6FCBDC]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center">
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

export default TravelZoneManager;
