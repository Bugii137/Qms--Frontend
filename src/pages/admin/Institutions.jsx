import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import institutionApi from "../../utils/institutionApi";

const CAT_COLORS = {
  Hospital:   "bg-blue-100 text-blue-700",
  Bank:       "bg-purple-100 text-purple-700",
  Government: "bg-yellow-100 text-yellow-700",
  University: "bg-green-100 text-green-700",
  Other:      "bg-gray-100 text-gray-700",
};

const STATUS_FILTERS = ["All Status", "Active", "Pending", "Suspended"];
const CATEGORY_FILTERS = ["All Categories", "Hospital", "Bank", "Government", "University", "Other"];

export default function AdminInstitutions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const status = statusFilter === "All Status" ? undefined : statusFilter.toLowerCase();
    institutionApi
      .listForSystemAdmin(status)
      .then(({ institutions }) => setInstitutions(institutions))
      .catch(err => setError(err.message || "Could not load institutions."))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load() }, [load]);

  const handleSetStatus = async (id, status) => {
    setActingId(id);
    try {
      await institutionApi.setStatus(id, status);
      load();
    } catch (err) {
      setError(err.message || "Could not update this institution.");
    } finally {
      setActingId(null);
    }
  };

  const filtered = institutions.filter(inst => {
    const matchesSearch = inst.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || inst.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">Institutions</h1>

        {/* Filter bar */}
        <div className="card p-3 mb-4 flex items-center gap-3">
          <input className="input flex-1" placeholder="Search institutions..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-36" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {CATEGORY_FILTERS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400">No institutions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Address</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Appointments</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{inst.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CAT_COLORS[inst.category] || CAT_COLORS.Other}`}>
                        {inst.category || "Other"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inst.address || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{inst.ownerName}</td>
                    <td className="px-4 py-3 text-gray-600">{(inst.appointmentsCount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={
                        inst.status === "active" ? "badge-approved" :
                        inst.status === "pending" ? "badge-pending" : "badge-suspended"
                      }>
                        {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {inst.status === "pending" ? (
                          <>
                            <button
                              disabled={actingId === inst.id}
                              onClick={() => handleSetStatus(inst.id, "active")}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 disabled:opacity-40"
                            >Approve</button>
                            <button
                              disabled={actingId === inst.id}
                              onClick={() => handleSetStatus(inst.id, "suspended")}
                              className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 disabled:opacity-40"
                            >Reject</button>
                          </>
                        ) : inst.status === "active" ? (
                          <button
                            disabled={actingId === inst.id}
                            onClick={() => handleSetStatus(inst.id, "suspended")}
                            className="text-gray-400 hover:text-yellow-500 text-base disabled:opacity-40"
                            title="Suspend"
                          >⚠</button>
                        ) : (
                          <button
                            disabled={actingId === inst.id}
                            onClick={() => handleSetStatus(inst.id, "active")}
                            className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 disabled:opacity-40"
                          >Reactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              Showing {filtered.length} of {institutions.length} institutions
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
