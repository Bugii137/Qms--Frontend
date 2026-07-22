import { useState, useEffect, useCallback } from "react";
import StaffLayout from "../../components/layout/StaffLayout";
import EmptyState from "../../components/common/EmptyState";
import { canManage } from "../../utils/permissions";
import { accessLevelToLabel } from "../../utils/accessLevel";
import staffApi from "../../utils/staffApi";
import appointmentApi from "../../utils/appointmentApi";

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
              👁 View Only
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
            <EmptyState icon="📋" title="No appointments found" message="Nothing has been booked for your institution yet." />
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
    </StaffLayout>
  );
}
