import { useState, useEffect, useCallback } from "react";
import StaffLayout from "../../components/layout/StaffLayout";
import EmptyState from "../../components/common/EmptyState";
import { canManage } from "../../utils/permissions";
import { accessLevelToLabel } from "../../utils/accessLevel";
import staffApi from "../../utils/staffApi";
import appointmentApi from "../../utils/appointmentApi";
import { todayLocal } from "../../utils/date";

const BADGE = { approved: "badge-approved", pending: "badge-pending", rejected: "badge-rejected", cancelled: "badge-cancelled", completed: "badge-completed" };

function formatTime(timeStr) {
  if (!timeStr) return "";
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function StaffAppointments() {
  const [assignment, setAssignment] = useState(null);
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
    Promise.all([
      staffApi.getMine(),
      appointmentApi.listForStaff(),
    ])
      .then(([{ assignment }, { appointments }]) => {
        setAssignment(assignment);
        setAppointments(appointments);
      })
      .catch(err => setError(err.message || "Could not load your appointments."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const accessLevel = accessLevelToLabel(assignment?.accessLevel || "view_only");
  const allowed = canManage(accessLevel);

  const updateStatus = async (id, status) => {
    if (!allowed) return;
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

  const cancelAppointment = async (appointment) => {
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

  return (
    <StaffLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-semibold text-navy">My Appointments</h1>
            <p className="text-xs text-gray-400 mt-0.5">{assignment?.institutionName}</p>
          </div>
          {!allowed && (
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg font-medium">
               View Only
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mt-4">{error}</div>
        )}

        <div className="card overflow-hidden mt-5">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
          ) : appointments.length === 0 ? (
            <EmptyState icon="" title="No appointments found" message="Nothing has been booked for your institution yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  {allowed && <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.clientName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.serviceName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.clientPhone}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(a.appointmentTime)}</td>
                    <td className="px-4 py-3"><span className={BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></td>
                    {allowed && (
                      <td className="px-4 py-3">
                        {a.status === "pending" && (
                          <div className="flex gap-1">
                            <button disabled={actingId === a.id} onClick={() => updateStatus(a.id, "approved")} className="w-6 h-6 bg-green-50 text-green-600 border border-green-200 rounded flex items-center justify-center text-xs hover:bg-green-100 disabled:opacity-40">✓</button>
                            <button disabled={actingId === a.id} onClick={() => updateStatus(a.id, "rejected")} className="w-6 h-6 bg-red-50 text-red-500 border border-red-200 rounded flex items-center justify-center text-xs hover:bg-red-100 disabled:opacity-40">✕</button>
                          </div>
                        )}
                        {a.status === "approved" && (
                          <button disabled={actingId === a.id} onClick={() => updateStatus(a.id, "completed")} className="text-xs text-green-brand hover:underline font-medium disabled:opacity-40">Mark Complete</button>
                        )}
                        {(a.status === "pending" || a.status === "approved") && (
                          <>
                            <button disabled={actingId === a.id} onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline disabled:opacity-40">Edit</button>
                            <button disabled={actingId === a.id} onClick={() => cancelAppointment(a)} className="text-xs text-red-600 hover:underline disabled:opacity-40">Cancel</button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {!allowed && (
          <p className="text-xs text-gray-400 mt-3">
            You have View Only access. Contact your Institution Admin to request appointment management permissions.
          </p>
        )}
      </div>
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="card w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-navy mb-4">Edit appointment</h2>
            <div className="space-y-3">
              <label className="block text-xs text-gray-500">Date<input className="input mt-1" type="date" min={todayLocal()} required value={editForm.appointmentDate} onChange={e => setEditForm(f => ({ ...f, appointmentDate: e.target.value }))} /></label>
              <label className="block text-xs text-gray-500">Time<input className="input mt-1" type="time" required value={editForm.appointmentTime} onChange={e => setEditForm(f => ({ ...f, appointmentTime: e.target.value }))} /></label>
              <label className="block text-xs text-gray-500">Notes<textarea className="input mt-1" rows={3} maxLength={500} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn-secondary text-xs px-4 py-2" onClick={() => setEditingAppointment(null)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs px-4 py-2" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </StaffLayout>
  );
}
