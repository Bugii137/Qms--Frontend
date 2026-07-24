import { useState, useEffect, useCallback, useMemo } from "react";
import InstitutionLayout from "../../components/layout/InstitutionLayout";
import institutionApi from "../../utils/institutionApi";
import appointmentApi from "../../utils/appointmentApi";

const PERIODS = { "This Week": 7, "This Month": 30, "Last 3 Months": 90 };
const STATUS_COLORS = { completed: "#00A86B", pending: "#FBBF24", approved: "#3B82F6", rejected: "#EF4444", cancelled: "#D1D5DB" };

function withinPeriod(dateStr, days) {
  const date = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function dayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function downloadCsv(rows, filename) {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [period, setPeriod] = useState("This Month");
  const [institution, setInstitution] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([institutionApi.getMine(), appointmentApi.listForInstitution()])
      .then(([{ institution }, { appointments }]) => {
        setInstitution(institution);
        setAppointments(appointments);
      })
      .catch(err => setError(err.message || "Could not load report data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const inRange = useMemo(
    () => appointments.filter(a => withinPeriod(a.createdAt, PERIODS[period])),
    [appointments, period]
  );

  const total = inRange.length;
  const completedCount = inRange.filter(a => a.status === "completed").length;
  const cancelledCount = inRange.filter(a => a.status === "cancelled" || a.status === "rejected").length;
  const completionRate = total ? Math.round((completedCount / total) * 100) : 0;
  const cancelledRate = total ? Math.round((cancelledCount / total) * 100) : 0;

  // Daily volume for the last 7 days (always last 7, regardless of period, for a readable chart).
  const dailyBuckets = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const count = appointments.filter(a => a.appointmentDate === key).length;
    return { label: dayLabel(d), count };
  });
  const maxBar = Math.max(1, ...dailyBuckets.map(d => d.count));

  // Status breakdown donut.
  const statusCounts = {};
  for (const a of inRange) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  const statusEntries = Object.entries(statusCounts);
  let cumulative = 0;
  const donutSegments = statusEntries.map(([status, count]) => {
    const fraction = total ? count / total : 0;
    const seg = { status, count, fraction, offset: cumulative };
    cumulative += fraction;
    return seg;
  });

  // Top services by volume.
  const byService = {};
  for (const a of inRange) byService[a.serviceName] = (byService[a.serviceName] || 0) + 1;
  const topServices = Object.entries(byService)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxServiceCount = Math.max(1, ...topServices.map(s => s.count));

  const handleExportCsv = () => {
    const rows = [["Client", "Service", "Date", "Time", "Status"]];
    for (const a of inRange) rows.push([a.clientName, a.serviceName, a.appointmentDate, a.appointmentTime, a.status]);
    downloadCsv(rows, `jipange-appointments-${period.replace(/\s+/g, "-").toLowerCase()}.csv`);
  };

  return (
    <InstitutionLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy">Reports</h1>
            <p className="text-xs text-gray-400 mt-0.5">{institution?.name || "…"} / Reports</p>
          </div>
          <div className="flex gap-1">
            {Object.keys(PERIODS).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  period === p ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}>{p}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          {[
            { label: "Total Appointments", value: String(total),           icon: "📅", border: "border-l-blue-400" },
            { label: "Completion Rate",    value: `${completionRate}%`,    icon: "✅", border: "border-l-green-brand" },
            { label: "Cancelled / Rejected Rate", value: `${cancelledRate}%`, icon: "⊗", border: "border-l-red-400" },
            { label: "Pending Now",        value: String(inRange.filter(a => a.status === "pending").length), icon: "⏰", border: "border-l-yellow-400" },
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

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Bar chart */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-1">Daily Appointment Volume</h2>
            <p className="text-xs text-gray-400 mb-4">Last 7 days</p>
            <div className="flex items-end gap-3 h-32">
              {dailyBuckets.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-[10px] text-gray-500">{d.count || ""}</span>
                  <div
                    className="w-full bg-green-brand rounded-t-sm transition-all"
                    style={{ height: d.count ? `${(d.count / maxBar) * 100}%` : "4px", opacity: d.count ? 1 : 0.15 }}
                  />
                  <span className="text-[10px] text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut chart */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Appointment Status Breakdown</h2>
            {total === 0 ? (
              <p className="text-xs text-gray-400">No appointments in this period yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                    {donutSegments.map(seg => (
                      <circle key={seg.status} cx="50" cy="50" r="38" fill="none" stroke={STATUS_COLORS[seg.status] || "#9CA3AF"} strokeWidth="14"
                        strokeDasharray={`${seg.fraction * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                        strokeDashoffset={`${-seg.offset * 2 * Math.PI * 38}`}
                        transform="rotate(-90 50 50)" />
                    ))}
                    <text x="50" y="47" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1E3A8A">{total}</text>
                    <text x="50" y="59" textAnchor="middle" fontSize="8" fill="#9CA3AF">Total</text>
                  </svg>
                </div>
                <div className="space-y-2">
                  {donutSegments.map(seg => (
                    <div key={seg.status} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[seg.status] || "#9CA3AF" }} />
                      <span className="text-gray-700 capitalize">{seg.status}</span>
                      <span className="font-semibold text-gray-900 ml-auto">{Math.round(seg.fraction * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top services */}
        <div className="card p-4 mb-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Top Services by Volume</h2>
          {topServices.length === 0 ? (
            <p className="text-xs text-gray-400">No appointments in this period yet.</p>
          ) : (
            <div className="space-y-3">
              {topServices.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{s.name}</span>
                    <span className="font-semibold text-navy">{s.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-navy h-2 rounded-full" style={{ width: `${(s.count / maxServiceCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="flex gap-3">
          <button disabled={total === 0} className="btn-primary text-xs px-5 py-2 disabled:opacity-40" onClick={handleExportCsv}>
            Export as CSV
          </button>
        </div>
      </div>
    </InstitutionLayout>
  );
}
