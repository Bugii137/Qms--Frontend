import { useState, useEffect, useCallback } from "react";
import InstitutionLayout from "../../components/layout/InstitutionLayout";
import staffApi from "../../utils/staffApi";
import { accessLevelToLabel, accessLevelToValue } from "../../utils/accessLevel";

const STATUS_BADGE = { active: "badge-active", inactive: "badge-inactive", invited: "badge-pending" };
const STATUS_LABEL = { active: "Active", inactive: "Inactive", invited: "Invited (legacy)" };

const AVATAR_COLORS = ["bg-navy", "bg-green-600", "bg-purple-600", "bg-teal-600", "bg-yellow-500", "bg-gray-500", "bg-blue-500", "bg-red-500"];
function colorFor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}
function initialsOf(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const EMPTY_FORM = { fullName: "", email: "", phone: "", jobTitle: "Receptionist", access: "Manage Appointments", password: "" };

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", phone: "", jobTitle: "", access: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    staffApi
      .listByOwner()
      .then(({ staff }) => setStaff(staff))
      .catch(err => setError(err.message || "Could not load staff."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const handleCreate = async () => {
    setFormError("");
    if (!form.fullName || !form.email || !form.password) {
      setFormError("Full name, email, and password are required.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await staffApi.create({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        jobTitle: form.jobTitle,
        accessLevel: accessLevelToValue(form.access),
        password: form.password,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.message || "Could not create this staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    setActingId(id);
    try {
      await staffApi.remove(id);
      load();
    } catch (err) {
      setError(err.message || "Could not remove this staff member.");
    } finally {
      setActingId(null);
    }
  };

  const openEdit = (member) => {
    setEditingStaff(member);
    setEditForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone || "",
      jobTitle: member.jobTitle,
      access: accessLevelToLabel(member.accessLevel),
    });
    setEditError("");
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    setEditError("");
    try {
      await staffApi.update(editingStaff.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        jobTitle: editForm.jobTitle,
        accessLevel: accessLevelToValue(editForm.access),
      });
      setEditingStaff(null);
      load();
    } catch (err) {
      setEditError(err.message || "Could not update this staff member.");
    } finally {
      setSavingEdit(false);
    }
  };

  const reactivateStaff = async (id) => {
    setActingId(id);
    try {
      await staffApi.setStatus(id, "active");
      load();
    } catch (err) {
      setError(err.message || "Could not reactivate this staff member.");
    } finally {
      setActingId(null);
    }
  };

  const totalCount = staff.length;
  const activeCount = staff.filter(s => s.status === 'active').length;
  const pendingCount = staff.filter(s => s.status === 'invited').length;

  return (
    <InstitutionLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-semibold text-navy">Staff Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">Invite and manage your team</p>
          </div>
          <button className="btn-primary text-xs px-4 py-1.5" onClick={() => setShowForm(true)}>
            + Add Staff Member
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 mb-5 mt-4">
          {[
            { label: `${totalCount} Total Staff` },
            { label: `${activeCount} Active` },
            { label: `${pendingCount} Pending Invite` },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium text-gray-700">{c.label}</div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* Staff cards grid */}
        {loading ? (
          <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">No staff members yet — invite your first one below.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            {staff.map(s => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${colorFor(s.id)} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{initialsOf(s.fullName)}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.fullName}</div>
                    <div className="text-xs text-gray-500">{s.jobTitle}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-0.5">{s.email}</div>
                <div className="text-xs text-gray-500 mb-3">{s.phone}</div>
                <div className="flex items-center justify-between mb-3">
                  <span className={STATUS_BADGE[s.status]}>{STATUS_LABEL[s.status]}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 border-t border-gray-100 pt-3">
                  <button className="text-xs text-blue-600 hover:text-blue-800 py-1" onClick={() => openEdit(s)}>Edit details</button>
                  {s.status !== "inactive" ? (
                    <button
                      disabled={actingId === s.id}
                      className="text-xs text-red-500 hover:text-red-700 py-1.5 border border-red-100 rounded-lg hover:bg-red-50 disabled:opacity-40"
                      onClick={() => handleRemove(s.id)}
                    >Deactivate</button>
                  ) : (
                    <button disabled={actingId === s.id} onClick={() => reactivateStaff(s.id)} className="text-xs text-green-600 hover:text-green-800 py-1.5 border border-green-100 rounded-lg hover:bg-green-50 disabled:opacity-40">Reactivate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Staff Form */}
        {showForm && (
          <div className="card p-5 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Add New Staff Member</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">⊗</button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-3">{formError}</div>
            )}
            {editingStaff && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <form onSubmit={handleEdit} className="card w-full max-w-md p-5">
                  <h2 className="text-lg font-semibold text-navy mb-4">Edit staff details</h2>
                  {editError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-3">{editError}</div>}
                  <div className="space-y-3">
                    <label className="block text-xs text-gray-500">Full name<input className="input text-sm mt-1" required minLength={2} value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} /></label>
                    <label className="block text-xs text-gray-500">Email<input className="input text-sm mt-1" required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></label>
                    <label className="block text-xs text-gray-500">Phone<input className="input text-sm mt-1" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></label>
                    <label className="block text-xs text-gray-500">Job title<select className="input text-sm mt-1" value={editForm.jobTitle} onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))}>{["Receptionist","Doctor","Nurse","Lab Technician","Administrator"].map(title => <option key={title}>{title}</option>)}</select></label>
                    <label className="block text-xs text-gray-500">Access level<select className="input text-sm mt-1" value={editForm.access} onChange={e => setEditForm(f => ({ ...f, access: e.target.value }))}>{["View Only","Manage Appointments","Full Access"].map(level => <option key={level}>{level}</option>)}</select></label>
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button type="button" className="btn-secondary text-xs px-4 py-2" onClick={() => setEditingStaff(null)}>Cancel</button>
                    <button type="submit" className="btn-primary text-xs px-4 py-2" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input className="input text-sm" placeholder="e.g. Dr. Sarah Mutua" value={form.fullName} onChange={set("fullName")} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input className="input text-sm" placeholder="sarah@cgh.co.ke" value={form.email} onChange={set("email")} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input className="input text-sm" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={set("phone")} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <select className="input text-sm" value={form.jobTitle} onChange={set("jobTitle")}>
                  {["Receptionist","Doctor","Nurse","Lab Technician","Administrator"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Access Level</label>
                <select className="input text-sm" value={form.access} onChange={set("access")}>
                  {["View Only","Manage Appointments","Full Access"].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <div className="flex gap-2">
                  <input className="input text-sm flex-1" placeholder="At least 8 characters" value={form.password} onChange={set("password")} />
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 whitespace-nowrap"
                    onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Share this password with them directly — they'll use it to log in.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button disabled={submitting} className="btn-primary text-xs px-4 py-2 disabled:opacity-50" onClick={handleCreate}>
                {submitting ? 'Creating…' : 'Create Account'}
              </button>
              <button className="btn-secondary text-xs px-4 py-2" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">They can sign in immediately with this email and password.</p>
          </div>
        )}
      </div>
    </InstitutionLayout>
  );
}
