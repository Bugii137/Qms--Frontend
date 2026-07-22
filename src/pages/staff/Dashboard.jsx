import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import StaffLayout from "../../components/layout/StaffLayout";
import { useAuth } from "../../context/AuthContext";
import { canManage } from "../../utils/permissions";
import { accessLevelToLabel } from "../../utils/accessLevel";
import staffApi from "../../utils/staffApi";
import appointmentApi from "../../utils/appointmentApi";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      staffApi.getMine(),
      appointmentApi.listForStaff({ date: today }),
    ])
      .then(([{ assignment }, { appointments }]) => {
        setAssignment(assignment);
        setAppointments(appointments);
      })
      .catch(err => setError(err.message || "Could not load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const accessLevel = accessLevelToLabel(assignment?.accessLevel || "view_only");
  const allowed = canManage(accessLevel);

  const approved = appointments.filter(a => a.status === "approved");
  const completedToday = appointments.filter(a => a.status === "completed").length;
  const [nowServing, ...waiting] = approved;

  const handleAction = async (id, status) => {
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

  if (loading) {
    return (
      <StaffLayout>
        <div className="p-6 text-center text-sm text-gray-400 py-14">Loading…</div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-navy">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {assignment?.institutionName} {assignment?.jobTitle ? `/ ${assignment.jobTitle}` : ""}
            </p>
          </div>
          {!allowed && (
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg font-medium">
              👁 View Only — navigation and viewing only
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* Welcome banner */}
        <div className="bg-green-brand rounded-xl p-4 flex items-center justify-between mb-5">
          <div>
            <div className="text-white font-semibold text-base">{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</div>
            <div className="text-green-50 text-sm mt-0.5">
              {approved.length} client{approved.length === 1 ? '' : 's'} in queue today.
            </div>
          </div>
          <span className="text-4xl opacity-40">🎟</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5">
          {[
            { label: "Now Serving", value: nowServing ? nowServing.clientName : "—", icon: "▶", border: "border-l-green-brand" },
            { label: "Waiting", value: String(waiting.length), icon: "⏳", border: "border-l-yellow-400" },
            { label: "Completed Today", value: String(completedToday), icon: "✅", border: "border-l-blue-400" },
          ].map(k => (
            <div key={k.label} className={`card p-4 border-l-4 ${k.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                  <div className="text-lg font-bold text-gray-900">{k.value}</div>
                </div>
                <span className="text-lg opacity-60">{k.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Today's Queue</h2>
            {allowed && nowServing && (
              <button
                disabled={actingId === nowServing.id}
                className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                onClick={() => handleAction(nowServing.id, 'completed')}
              >
                {actingId === nowServing.id ? 'Calling…' : 'Call Next →'}
              </button>
            )}
          </div>
          {approved.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">No approved appointments today.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["#", "Client", "Time", "Status", allowed ? "Actions" : ""].map(h => (
                    <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approved.map((a, i) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2.5 text-sm font-medium text-gray-800">{a.clientName}</td>
                    <td className="py-2.5 text-xs text-gray-600">{formatTime(a.appointmentTime)}</td>
                    <td className="py-2.5">
                      {i === 0
                        ? <span className="badge-approved">Now Serving</span>
                        : <span className="badge-pending">Waiting</span>}
                    </td>
                    <td className="py-2.5">
                      {allowed && i > 0 && (
                        <button
                          disabled={actingId === a.id}
                          className="text-xs text-green-brand hover:underline font-medium disabled:opacity-40"
                          onClick={() => handleAction(a.id, 'completed')}
                        >
                          Mark Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <button
          className="text-green-brand text-xs mt-3 hover:underline"
          onClick={() => navigate("/staff/appointments")}
        >
          View all my appointments →
        </button>
      </div>
    </StaffLayout>
  );
}
