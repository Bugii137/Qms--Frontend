import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import adminApi from "../../utils/adminApi";

const ROLE_BADGE = {
  client:            "bg-green-100 text-green-800",
  institution_admin: "bg-yellow-100 text-yellow-800",
  staff:             "bg-blue-100 text-blue-800",
  admin:             "bg-navy/10 text-navy",
};
const ROLE_LABEL = { client: "Client", institution_admin: "Institution Admin", staff: "Staff", admin: "Admin" };
const ROLE_FILTERS = { "All Roles": undefined, "Client": "client", "Institution Admin": "institution_admin", "Staff": "staff", "Admin": "admin" };

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const isActive = statusFilter === "Active" ? true : statusFilter === "Suspended" ? false : undefined;
    adminApi.listUsers({ search: search || undefined, role: ROLE_FILTERS[roleFilter], isActive })
      .then(({ users }) => setUsers(users))
      .catch(err => setError(err.message || "Could not load users."))
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  const toggleActive = async (user) => {
    setActingId(user.id);
    try {
      await adminApi.setUserActive(user.id, !user.isActive);
      load();
    } catch (err) {
      setError(err.message || "Could not update this user.");
    } finally {
      setActingId(null);
    }
  };

  const total = users.length;
  const clients = users.filter(u => u.role === "client").length;
  const institutionAdmins = users.filter(u => u.role === "institution_admin").length;

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">Users</h1>

        {/* KPI chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5">
          {[
            { label: "Total Users", value: total, icon: "👥", border: "border-l-blue-500" },
            { label: "Clients", value: clients, icon: "👤", border: "border-l-green-brand" },
            { label: "Institution Admins", value: institutionAdmins, icon: "🏢", border: "border-l-yellow-400" },
          ].map(k => (
            <div key={k.label} className={`card p-4 border-l-4 ${k.border}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-gray-500">{k.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{loading ? "…" : k.value}</div>
                </div>
                <span className="text-xl">{k.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="card p-3 mb-4 flex items-center gap-3 flex-wrap">
          <input className="input flex-1 min-w-[160px]" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            {Object.keys(ROLE_FILTERS).map(r => <option key={r}>{r}</option>)}
          </select>
          <select className="input w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {["All Status", "Active", "Suspended"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
          ) : users.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400">No users match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Name", "Email", "Role", "Joined", "Appointments", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{u.appointmentCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? "badge-active" : "badge-suspended"}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={actingId === u.id}
                        onClick={() => toggleActive(u)}
                        className={`text-xs px-2.5 py-1 rounded border disabled:opacity-40 ${
                          u.isActive
                            ? "text-red-500 border-red-200 hover:bg-red-50"
                            : "text-green-600 border-green-200 hover:bg-green-50"
                        }`}
                      >
                        {u.isActive ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Showing {users.length} user{users.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
