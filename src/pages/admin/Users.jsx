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
const EMPTY_FORM = { fullName: "", email: "", phone: "", password: "" };

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
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ fullName: user.fullName, email: user.email, phone: user.phone || "", password: "" });
    setFormError("");
    setShowForm(true);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = { fullName: form.fullName, email: form.email, phone: form.phone };
      if (editingUser) {
        await adminApi.updateUser(editingUser.id, payload);
      } else {
        await adminApi.createUser({ ...payload, password: form.password });
      }
      setEditingUser(null);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message || "Could not save this user.");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Deactivate ${user.fullName}? Their account and history will be preserved.`)) return;
    setActingId(user.id);
    try {
      await adminApi.deleteUser(user.id);
      load();
    } catch (err) {
      setError(err.message || "Could not deactivate this user.");
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
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold text-navy">Users</h1>
          <button className="btn-primary text-xs px-4 py-2" onClick={openCreate}>+ Add Client</button>
        </div>

        {showForm && (
          <form onSubmit={saveUser} className="card p-4 mb-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Full name</label>
              <input className="input text-sm" required minLength={2} maxLength={150} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input className="input text-sm" required type="email" maxLength={150} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input className="input text-sm" maxLength={30} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            {!editingUser && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Initial password</label>
                <input className="input text-sm" required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            )}
            {formError && <div className="md:col-span-4 text-xs text-red-600">{formError}</div>}
            <div className="md:col-span-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs px-3 py-2" onClick={() => { setEditingUser(null); setShowForm(false); }}>Cancel</button>
              <button type="submit" className="btn-primary text-xs px-3 py-2" disabled={saving}>{saving ? "Saving…" : editingUser ? "Save changes" : "Create client"}</button>
            </div>
          </form>
        )}

        {/* KPI chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5">
          {[
            { label: "Total Users", value: total, icon: "", border: "border-l-blue-500" },
            { label: "Clients", value: clients, icon: "", border: "border-l-green-brand" },
            { label: "Institution Admins", value: institutionAdmins, icon: "", border: "border-l-yellow-400" },
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
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)}>Edit</button>
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
                        {u.isActive && u.role !== "admin" && (
                          <button disabled={actingId === u.id} onClick={() => deleteUser(u)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">Delete</button>
                        )}
                      </div>
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
