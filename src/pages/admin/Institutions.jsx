import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import institutionApi from "../../utils/institutionApi";
import adminApi from "../../utils/adminApi";

const CAT_COLORS = {
  Hospital:   "bg-blue-100 text-blue-700",
  Bank:       "bg-purple-100 text-purple-700",
  Government: "bg-yellow-100 text-yellow-700",
  University: "bg-green-100 text-green-700",
  Other:      "bg-gray-100 text-gray-700",
};

const STATUS_FILTERS = ["All Status", "Active", "Pending", "Suspended"];
const CATEGORY_FILTERS = ["All Categories", "Hospital", "Bank", "Government", "University", "Other"];
const EMPTY_FORM = { ownerId: "", name: "", category: "", description: "", address: "", phone: "", email: "", logoUrl: "" };

export default function AdminInstitutions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusNotice, setStatusNotice] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [institutionOwnerIds, setInstitutionOwnerIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    Promise.all([
      adminApi.listUsers({ role: "institution_admin", isActive: true }),
      institutionApi.listForSystemAdmin(),
    ])
      .then(([{ users: institutionAdmins }, { institutions: allInstitutions }]) => {
        setUsers(institutionAdmins);
        setInstitutionOwnerIds(allInstitutions.map(institution => institution.ownerId));
      })
      .catch(err => setError(err.message || "Could not load institution admin accounts."));
  }, []);

  const openCreate = () => {
    setEditingInstitution(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (institution) => {
    setEditingInstitution(institution);
    setForm({
      ...EMPTY_FORM,
      name: institution.name || "",
      category: institution.category || "",
      description: institution.description || "",
      address: institution.address || "",
      phone: institution.phone || "",
      email: institution.email || "",
      logoUrl: institution.logoUrl || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const saveInstitution = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const { ownerId, ...details } = form;
    try {
      if (editingInstitution) {
        await institutionApi.updateForSystemAdmin(editingInstitution.id, details);
      } else {
        await institutionApi.createForSystemAdmin({ ...details, ownerId: Number(ownerId) });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message || "Could not save this institution.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetStatus = async (id, status) => {
    setActingId(id);
    setStatusNotice(null);
    try {
      const result = await institutionApi.setStatus(id, status);
      if (result.emailSent === false) {
        setStatusNotice({
          type: "warning",
          message: "Institution status updated, but the email notification could not be sent.",
        });
      } else if (result.emailSent === true) {
        setStatusNotice({
          type: "success",
          message: "Institution status updated and the email notification was accepted for delivery.",
        });
      }
      load();
    } catch (err) {
      setError(err.message || "Could not update this institution.");
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (institution) => {
    if (!window.confirm(`Suspend ${institution.name}? Its records will be preserved.`)) return;
    setActingId(institution.id);
    try {
      await institutionApi.deleteForSystemAdmin(institution.id);
      load();
    } catch (err) {
      setError(err.message || "Could not suspend this institution.");
    } finally {
      setActingId(null);
    }
  };

  const filtered = institutions.filter(inst => {
    const matchesSearch = inst.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || inst.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  const ownersWithInstitutions = new Set(institutionOwnerIds);
  const availableOwners = users.filter(user => !ownersWithInstitutions.has(user.id));

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold text-navy">Institutions</h1>
          <button className="btn-primary text-xs px-4 py-2" onClick={openCreate}>+ Add Institution</button>
        </div>

        {showForm && (
          <form onSubmit={saveInstitution} className="card p-4 mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {!editingInstitution && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Institution admin</label>
                <select className="input text-sm" required value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
                  <option value="">Select an active admin</option>
                  {availableOwners.map(user => <option key={user.id} value={user.id}>{user.fullName} — {user.email}</option>)}
                </select>
              </div>
            )}
            {[
              ["name", "Institution name", true],
              ["category", "Category", false],
              ["email", "Email", false],
              ["phone", "Phone", false],
              ["address", "Address", false],
              ["logoUrl", "Logo URL", false],
            ].map(([field, label, required]) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input className="input text-sm" required={required} type={field === "email" ? "email" : field === "logoUrl" ? "url" : "text"} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <textarea className="input text-sm" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {formError && <div className="md:col-span-3 text-xs text-red-600">{formError}</div>}
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs px-3 py-2" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs px-3 py-2" disabled={saving}>{saving ? "Saving…" : editingInstitution ? "Save changes" : "Create institution"}</button>
            </div>
          </form>
        )}

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
        {statusNotice && (
          <div
            role="status"
            className={`rounded-lg px-3 py-2 mb-4 text-xs ${
              statusNotice.type === "warning"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-green-50 border border-green-200 text-green-800"
            }`}
          >
            {statusNotice.message}
          </div>
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
                        <button disabled={actingId === inst.id} onClick={() => openEdit(inst)} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 disabled:opacity-40">Edit</button>
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
                            className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded hover:bg-yellow-100 disabled:opacity-40"
                            title="Suspend"
                          >Suspend</button>
                        ) : (
                          <button
                            disabled={actingId === inst.id}
                            onClick={() => handleSetStatus(inst.id, "active")}
                            className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 disabled:opacity-40"
                          >Reactivate</button>
                        )}
                        {inst.status !== "suspended" && (
                          <button disabled={actingId === inst.id} onClick={() => handleDelete(inst)} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 disabled:opacity-40">Delete</button>
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
