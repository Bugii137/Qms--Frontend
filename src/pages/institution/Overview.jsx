import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionLayout from "../../components/layout/InstitutionLayout";
import institutionApi from "../../utils/institutionApi";
import appointmentApi from "../../utils/appointmentApi";

const BADGE = { approved: "badge-approved", pending: "badge-pending", rejected: "badge-rejected", cancelled: "badge-cancelled", completed: "badge-completed" };

function formatTime(timeStr) {
  if (!timeStr) return "";
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function relativeTime(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function InstitutionOverview() {
  const navigate = useNavigate();
  const [institution, setInstitution] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      institutionApi.getMine(),
      appointmentApi.listForInstitution({ date: today }),
      appointmentApi.listForInstitution(),
    ])
      .then(([{ institution }, todayRes, allRes]) => {
        setInstitution(institution);
        setTodayAppointments(todayRes.appointments);
        setRecentAppointments(
          [...allRes.appointments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
        );
      })
      .catch(err => setError(err.message || "Could not load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

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

  const completed = todayAppointments.filter(a => a.status === "completed").length;
  const pending = todayAppointments.filter(a => a.status === "pending").length;
  const cancelled = todayAppointments.filter(a => a.status === "cancelled" || a.status === "rejected").length;

  // Appointment summary by service, today only.
  const byService = {};
  for (const a of todayAppointments) {
    byService[a.serviceName] = (byService[a.serviceName] || 0) + 1;
  }
  const serviceSummary = Object.entries(byService)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxServiceCount = Math.max(1, ...serviceSummary.map(s => s.count));

  return (
    <InstitutionLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">{institution?.name || "…"} / Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{todayLabel()}</span>
            <button className="btn-primary text-xs px-4 py-1.5" onClick={() => navigate("/institution/queue")}>
              View Full Queue
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          {[
            { label: "Today's Appointments", value: String(todayAppointments.length), icon: "📅", border: "border-l-blue-400" },
            { label: "Completed",            value: String(completed),               icon: "✅", border: "border-l-green-brand" },
            { label: "Pending Approval",     value: String(pending),                 icon: "⏰", border: "border-l-yellow-400" },
            { label: "Cancelled / Rejected", value: String(cancelled),               icon: "⊗", border: "border-l-red-400" },
          ].map(k => (
            <div key={k.label} className={`card p-4 border-l-4 ${k.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{loading ? "…" : k.value}</div>
                </div>
                <span className="text-lg opacity-60">{k.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Today's appointments table */}
          <div className="col-span-2 card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-sm">Today's Appointments</h2>
              <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg">Refresh</button>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">No appointments booked for today yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Client", "Service", "Time", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.slice(0, 8).map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 text-sm font-medium text-gray-800">{a.clientName}</td>
                      <td className="py-2.5 text-xs text-gray-500">{a.serviceName}</td>
                      <td className="py-2.5 text-xs text-gray-600">{formatTime(a.appointmentTime)}</td>
                      <td className="py-2.5"><span className={BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></td>
                      <td className="py-2.5">
                        {a.status === "pending" && (
                          <div className="flex gap-1">
                            <button disabled={actingId === a.id} onClick={() => handleAction(a.id, "approved")} className="w-6 h-6 bg-green-50 text-green-600 border border-green-200 rounded flex items-center justify-center text-xs hover:bg-green-100 disabled:opacity-40">✓</button>
                            <button disabled={actingId === a.id} onClick={() => handleAction(a.id, "rejected")} className="w-6 h-6 bg-red-50 text-red-500 border border-red-200 rounded flex items-center justify-center text-xs hover:bg-red-100 disabled:opacity-40">✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
            {todayAppointments.length > 0 && (
              <button className="text-green-brand text-xs mt-3 hover:underline" onClick={() => navigate("/institution/appointments")}>
                View all {todayAppointments.length} appointment{todayAppointments.length === 1 ? "" : "s"} →
              </button>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Appointment Summary */}
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Today by Service</h2>
              {serviceSummary.length === 0 ? (
                <p className="text-xs text-gray-400">No bookings today yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {serviceSummary.map(s => (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{s.name}</span>
                        <span className="font-semibold text-navy">{s.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-brand h-1.5 rounded-full" style={{ width: `${(s.count / maxServiceCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary text-xs py-2" onClick={() => navigate("/institution/staff")}>Add Staff</button>
                <button className="btn-secondary text-xs py-2" onClick={() => navigate("/institution/settings")}>Add Service</button>
                <button className="btn-secondary text-xs py-2" onClick={() => navigate("/institution/reports")}>View Reports</button>
                <button className="btn-secondary text-xs py-2" onClick={() => navigate("/institution/settings")}>Edit Profile</button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Recent Bookings</h2>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-gray-400">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span>
                    <span className="text-sm text-gray-700">{a.clientName} — {a.serviceName}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-4">{relativeTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </InstitutionLayout>
  );
}
