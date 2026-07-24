import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import analyticsApi from "../../utils/analyticsApi";
import institutionApi from "../../utils/institutionApi";

const ROLE_LABEL = { client: "Clients", institution_admin: "Institution Admins", staff: "Staff", admin: "System Admins" };

function relativeTime(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay <= 0) return "today";
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    analyticsApi.getSummary()
      .then(({ summary }) => setSummary(summary))
      .catch(err => setError(err.message || "Could not load platform overview."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const handleDecision = async (id, status) => {
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

  const roleCounts = summary?.users.byRole || {};
  const institutionCounts = summary?.institutions || { total: 0, pending: 0, active: 0, suspended: 0 };
  const maxRoleCount = Math.max(1, ...Object.values(roleCounts));

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">Platform Overview</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: "Total Institutions", value: institutionCounts.total, sub: `${institutionCounts.pending} pending approval`, icon: "🏢", border: "border-l-blue-500" },
            { label: "Total Users",        value: summary?.users.total ?? 0, sub: "Across all roles", icon: "👥", border: "border-l-green-brand" },
            { label: "Appointments Today", value: summary?.appointmentsToday ?? 0, sub: "Across all institutions", icon: "📅", border: "border-l-yellow-400" },
            { label: "Active Institutions", value: institutionCounts.active, sub: `${institutionCounts.suspended} suspended`, icon: "✅", border: "border-l-purple-400" },
          ].map(k => (
            <div key={k.label} className={`card p-4 border-l-4 ${k.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{loading ? "…" : k.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
                </div>
                <span className="text-xl">{k.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent registrations */}
          <div className="lg:col-span-2 card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-sm">Recent Institution Registrations</h2>
              <button className="text-xs text-green-brand hover:underline" onClick={() => navigate("/admin/institutions")}>View all →</button>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            ) : !summary?.recentInstitutions?.length ? (
              <div className="py-10 text-center text-sm text-gray-400">No institutions registered yet.</div>
            ) : (
              <div className="space-y-3">
                {summary.recentInstitutions.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.category || "Uncategorized"} · Owner: {r.ownerName} · Registered {relativeTime(r.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "pending" ? (
                        <>
                          <span className="badge-pending">Pending</span>
                          <button disabled={actingId === r.id} onClick={() => handleDecision(r.id, "active")} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-100 disabled:opacity-40">Approve</button>
                          <button disabled={actingId === r.id} onClick={() => handleDecision(r.id, "suspended")} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-40">Reject</button>
                        </>
                      ) : r.status === "active" ? (
                        <span className="badge-approved">Approved</span>
                      ) : (
                        <span className="badge-cancelled">Suspended</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: users by role */}
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Users by Role</h2>
              {loading ? (
                <p className="text-xs text-gray-400">Loading…</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(roleCounts).map(([role, count]) => (
                    <div key={role}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{ROLE_LABEL[role] || role}</span>
                        <span className="font-semibold text-navy">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-navy h-1.5 rounded-full" style={{ width: `${(count / maxRoleCount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Institution Status</h2>
              <div className="space-y-2">
                {[
                  { label: "Active",    value: institutionCounts.active,    color: "text-green-600" },
                  { label: "Pending",   value: institutionCounts.pending,   color: "text-yellow-600" },
                  { label: "Suspended", value: institutionCounts.suspended, color: "text-red-600" },
                ].map(h => (
                  <div key={h.label} className="flex justify-between text-xs">
                    <span className="text-gray-500">{h.label}</span>
                    <span className={`font-semibold ${h.color}`}>{loading ? "…" : h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
