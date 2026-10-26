import { useState, useEffect, useCallback } from "react";
import InstitutionLayout from "../../components/layout/InstitutionLayout";
import EmptyState from "../../components/common/EmptyState";
import appointmentApi from "../../utils/appointmentApi";
import { parseYMD } from '../../utils/date'

const TABS = [
  { label: "All", filter: "all" },
  { label: "Pending", filter: "pending" },
  { label: "Approved", filter: "approved" },
  { label: "Completed", filter: "completed" },
  { label: "Rejected", filter: "rejected" },
  { label: "Cancelled", filter: "cancelled" },
];

const BADGE = { approved:"badge-approved", pending:"badge-pending", rejected:"badge-rejected", cancelled:"badge-cancelled", completed:"badge-completed" };

function initialsOf(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return parseYMD(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatBookedOn(createdAt) {
  if (!createdAt) return ''
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export default function InstitutionAppointments() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editForm, setEditForm] = useState({ appointmentDate: "", appointmentTime: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const status = activeFilter === "all" ? undefined : activeFilter;
    appointmentApi
      .listForInstitution({ status })
      .then(({ appointments }) => setAppointments(appointments))
      .catch(err => setError(err.message || "Could not load appointments."))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  useEffect(() => { load() }, [load]);

  const handleSetStatus = async (id, status) => {
    setActingId(id);
    try {
      await appointmentApi.setStatus(id, status);
      load();
    } catch (err) {
      setError(err.message || "Could not update this appointment.");
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (appointment) => {
    if (!window.confirm(`Cancel the appointment for ${appointment.clientName}? The booking history will be preserved.`)) return;
    setActingId(appointment.id);
    try {
      await appointmentApi.remove(appointment.id);
      load();
    } catch (err) {
      setError(err.message || "Could not cancel this appointment.");
    } finally {
      setActingId(null);
    }
  };

  const openEdit = (appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      appointmentDate: String(appointment.appointmentDate).slice(0, 10),
      appointmentTime: String(appointment.appointmentTime).slice(0, 5),
      notes: appointment.notes || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    setError("");
    try {
      await appointmentApi.update(editingAppointment.id, editForm);
      setEditingAppointment(null);
      load();
    } catch (err) {
      setError(err.message || "Could not update this appointment.");
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = appointments.filter(a =>
    a.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    a.serviceName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <InstitutionLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy">Appointments</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">Manage incoming bookings</p>

        {/* Status tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map(t => (
            <button key={t.filter} onClick={() => setActiveFilter(t.filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeFilter === t.filter
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <input className="input flex-1 text-xs" placeholder="Search by client or service name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No appointments found"
              message={search ? `No results matching "${search}".` : "No appointments match the selected filter."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Client</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Service</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Date &amp; Time</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Booked On</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{initialsOf(a.clientName)}</div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{a.clientName}</div>
                          <div className="text-[11px] text-gray-400">{a.clientPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-700">{a.serviceName}</div>
                      <div className="text-[11px] text-green-brand">{a.durationMinutes} min</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-800">{formatDate(a.appointmentDate)}</div>
                      <div className="text-[11px] text-gray-400">{formatTime(a.appointmentTime)}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{formatBookedOn(a.createdAt)}</td>
                    <td className="px-3 py-3"><span className={BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {(a.status === "pending" || a.status === "approved") && (
                          <button disabled={actingId === a.id} className="text-xs text-blue-600 hover:text-blue-800 px-1.5 py-1" onClick={() => openEdit(a)}>Edit</button>
                        )}
                        {(a.status === "pending" || a.status === "approved") && (
                          <button disabled={actingId === a.id} className="text-xs text-red-600 hover:text-red-800 px-1.5 py-1" onClick={() => handleDelete(a)}>Cancel</button>
                        )}
                        {a.status === "pending" && <>
                          <button
                            disabled={actingId === a.id}
                            className="w-6 h-6 bg-green-50 text-green-600 border border-green-200 rounded flex items-center justify-center text-xs hover:bg-green-100 disabled:opacity-40"
                            onClick={() => handleSetStatus(a.id, 'approved')}
                          >✓</button>
                          <button
                            disabled={actingId === a.id}
                            className="w-6 h-6 bg-red-50 text-red-500 border border-red-200 rounded flex items-center justify-center text-xs hover:bg-red-100 disabled:opacity-40"
                            onClick={() => handleSetStatus(a.id, 'rejected')}
                          >✕</button>
                        </>}
                        {a.status === "approved" && (
                          <button
                            disabled={actingId === a.id}
                            className="w-6 h-6 bg-blue-50 text-blue-500 border border-blue-100 rounded flex items-center justify-center text-xs hover:bg-blue-100 disabled:opacity-40"
                            title="Mark completed"
                            onClick={() => handleSetStatus(a.id, 'completed')}
                          >✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="card w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-navy mb-4">Edit appointment</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input className="input" type="date" min={todayLocal()} required value={editForm.appointmentDate} onChange={e => setEditForm(f => ({ ...f, appointmentDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time</label>
                <input className="input" type="time" required value={editForm.appointmentTime} onChange={e => setEditForm(f => ({ ...f, appointmentTime: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea className="input" rows={3} maxLength={500} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn-secondary text-sm px-4 py-2" onClick={() => setEditingAppointment(null)}>Cancel</button>
              <button type="submit" className="btn-primary text-sm px-4 py-2" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </InstitutionLayout>
  );
}
