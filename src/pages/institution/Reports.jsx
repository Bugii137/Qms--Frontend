import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import InstitutionLayout from "../../components/layout/InstitutionLayout";
import appointmentApi from "../../utils/appointmentApi";
import { toLocalYMD, todayLocal } from "../../utils/date";
import { downloadExcelReport } from "../../utils/reportExport";

const PERIODS = { "This Week": 7, "This Month": 30, "Last 3 Months": 90 };
const STATUS_COLORS = { completed: "#00A86B", pending: "#FBBF24", approved: "#3B82F6", rejected: "#EF4444", cancelled: "#D1D5DB" };
const STATUSES = ["pending", "approved", "rejected", "cancelled", "completed"];
const VIEWS = { appointments: "Appointments", services: "Service performance", analytics: "Analytics" };
const MAX_VISIBLE_RECORDS = 50;

function getPeriodRange(days) {
  const to = todayLocal();
  const fromDate = new Date(`${to}T00:00:00`);
  fromDate.setDate(fromDate.getDate() - (days - 1));
  return { from: toLocalYMD(fromDate), to };
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFile(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export default function Reports() {
  const [period, setPeriod] = useState("This Month");
  const [customRange, setCustomRange] = useState(() => getPeriodRange(PERIODS["This Month"]));
  const [filters, setFilters] = useState({ status: "", serviceId: "" });
  const [view, setView] = useState("appointments");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const range = useMemo(
    () => period === "Custom" ? customRange : getPeriodRange(PERIODS[period]),
    [period, customRange]
  );
  const validRange = Boolean(range.from && range.to && range.from <= range.to);

  const load = useCallback(() => {
    const currentRequest = ++requestVersion.current;
    if (!validRange) {
      setReport(null);
      setError("Choose a valid date range to view the report.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    appointmentApi.getInstitutionReport({ ...range, ...filters })
      .then(({ report: generated }) => {
        if (currentRequest === requestVersion.current) setReport(generated);
      })
      .catch(err => {
        if (currentRequest === requestVersion.current) {
          setReport(null);
          setError(err.message || "Could not load report data.");
        }
      })
      .finally(() => {
        if (currentRequest === requestVersion.current) setLoading(false);
      });
  }, [range, filters, validRange]);

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  const appointments = report?.appointments || [];
  const total = report?.total || 0;
  const statusCounts = report?.byStatus || {};
  const completedCount = statusCounts.completed || 0;
  const cancelledCount = (statusCounts.cancelled || 0) + (statusCounts.rejected || 0);
  const completionRate = total ? Math.round((completedCount / total) * 100) : 0;
  const cancelledRate = total ? Math.round((cancelledCount / total) * 100) : 0;
  const dailyBuckets = useMemo(() => {
    const counts = new Map((report?.dailyVolume || []).map(day => [day.date, day.count]));
    const endDate = new Date(`${range.to || todayLocal()}T00:00:00`);
    return [...Array(7)].map((_, index) => {
      const date = new Date(endDate);
      date.setDate(date.getDate() - (6 - index));
      const key = toLocalYMD(date);
      return {
        date: key,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        count: counts.get(key) || 0,
      };
    });
  }, [report, range.to]);
  const maxBar = Math.max(1, ...dailyBuckets.map(day => day.count));
  const statusEntries = Object.entries(statusCounts).filter(([, count]) => count > 0);
  let cumulative = 0;
  const donutSegments = statusEntries.map(([status, count]) => {
    const fraction = total ? count / total : 0;
    const segment = { status, count, fraction, offset: cumulative };
    cumulative += fraction;
    return segment;
  });
  const maxServiceCount = Math.max(1, ...(report?.topServices || []).map(service => service.appointmentCount));

  const records = !report ? [] : view === "appointments"
    ? appointments
    : view === "services"
      ? report.topServices || []
      : [
          { metric: "Total appointments", value: total },
          { metric: "Completion rate", value: `${completionRate}%` },
          { metric: "Cancelled / rejected rate", value: `${cancelledRate}%` },
          ...Object.entries(statusCounts).map(([status, count]) => ({
            metric: `${status[0].toUpperCase()}${status.slice(1)} appointments`,
            value: count,
          })),
          ...(report.topServices || []).map(service => ({
            metric: `${service.name} appointments`,
            value: service.appointmentCount,
          })),
          ...(report.dailyVolume || []).map(day => ({
            metric: `Appointments on ${day.date}`,
            value: day.count,
          })),
        ];
  const columns = {
    appointments: [
      ["clientName", "Client"],
      ["serviceName", "Service"],
      ["appointmentDate", "Date"],
      ["appointmentTime", "Time"],
      ["status", "Status"],
      ["staffName", "Staff"],
    ],
    services: [
      ["name", "Service"],
      ["appointmentCount", "Appointments"],
      ["completedCount", "Completed"],
    ],
    analytics: [["metric", "Metric"], ["value", "Value"]],
  }[view];

  const exportReport = async format => {
    const filenameBase = `jipange-${view}-${range.from}-to-${range.to}`;
    const filterSummary = [
      filters.status && `Status: ${filters.status}`,
      filters.serviceId && `Service: ${report.services.find(service => String(service.id) === filters.serviceId)?.name || filters.serviceId}`,
    ].filter(Boolean).join(", ") || "None";

    if (format === "csv") {
      const csv = [
        columns.map(([, heading]) => csvCell(heading)).join(","),
        ...records.map(record => columns.map(([key]) => csvCell(record[key])).join(",")),
      ].join("\n");
      downloadFile(csv, "text/csv;charset=utf-8;", `${filenameBase}.csv`);
    } else if (format === "excel") {
      try {
        await downloadExcelReport(records, columns, `${filenameBase}.xlsx`);
      } catch {
        setError("Could not create the Excel report. Please try again.");
        setExportMenuOpen(false);
        return;
      }
    } else {
      const heading = columns.map(([, name]) => `<th>${escapeHtml(name)}</th>`).join("");
      const body = records.map(record => `<tr>${columns.map(([key]) => `<td>${escapeHtml(record[key])}</td>`).join("")}</tr>`).join("");
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setError("Allow pop-ups to print or save this report as PDF.");
        setExportMenuOpen(false);
        return;
      }
      printWindow.opener = null;
      printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(VIEWS[view])} report</title><style>
        body{font:12px Arial,sans-serif;color:#1f2937;padding:24px}h1{font-size:20px;color:#1e3a8a}
        p{color:#6b7280}table{border-collapse:collapse;width:100%;margin-top:20px}
        th,td{border:1px solid #d1d5db;padding:8px;text-align:left}th{background:#f3f4f6}
        @media print{body{padding:0}}
      </style></head><body><h1>${escapeHtml(report.institutionName)} — ${escapeHtml(VIEWS[view])}</h1>
      <p>Period: ${escapeHtml(range.from)} to ${escapeHtml(range.to)}</p>
      <p>Filters: ${escapeHtml(filterSummary)}</p>
      <p>Records: ${records.length}</p><table><thead><tr>${heading}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
      printWindow.document.close();
    }
    setExportMenuOpen(false);
  };

  return (
    <InstitutionLayout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy">Reports</h1>
            <p className="text-xs text-gray-400 mt-0.5">{report?.institutionName || "Institution"} / Reports</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {Object.keys(PERIODS).map(option => (
              <button
                key={option}
                onClick={() => setPeriod(option)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  period === option ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {option}
              </button>
            ))}
            <button
              onClick={() => {
                setCustomRange(range);
                setPeriod("Custom");
              }}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                period === "Custom" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        <section className="card p-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Report filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-xs text-gray-600">
              From
              <input
                type="date"
                value={range.from}
                onChange={event => {
                  setCustomRange({ ...range, from: event.target.value });
                  setPeriod("Custom");
                }}
                className="input mt-1"
              />
            </label>
            <label className="text-xs text-gray-600">
              To
              <input
                type="date"
                value={range.to}
                onChange={event => {
                  setCustomRange({ ...range, to: event.target.value });
                  setPeriod("Custom");
                }}
                className="input mt-1"
              />
            </label>
            <label className="text-xs text-gray-600">
              Service
              <select
                value={filters.serviceId}
                onChange={event => setFilters(current => ({ ...current, serviceId: event.target.value }))}
                className="input mt-1"
              >
                <option value="">All services</option>
                {(report?.services || []).map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}{service.active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Appointment status
              <select
                value={filters.status}
                onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}
                className="input mt-1"
              >
                <option value="">All statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters({ status: "", serviceId: "" })}
                className="btn-secondary text-xs py-2"
              >
                Clear filters
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          {[
            { label: "Total Appointments", value: total.toLocaleString(), border: "border-l-blue-400" },
            { label: "Completion Rate", value: `${completionRate}%`, border: "border-l-green-brand" },
            { label: "Cancelled / Rejected Rate", value: `${cancelledRate}%`, border: "border-l-red-400" },
            { label: "Pending in Period", value: (statusCounts.pending || 0).toLocaleString(), border: "border-l-yellow-400" },
          ].map(metric => (
            <div key={metric.label} className={`card p-4 border-l-4 ${metric.border}`}>
              <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "…" : metric.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <section className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-1">Daily Appointment Volume</h2>
            <p className="text-xs text-gray-400 mb-4">Last 7 days of the selected period</p>
            {loading ? (
              <p className="text-xs text-gray-400">Loading report data…</p>
            ) : (
              <div className="flex items-end gap-3 h-32">
                {dailyBuckets.map(day => (
                  <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[10px] text-gray-500">{day.count || ""}</span>
                    <div
                      className="w-full bg-green-brand rounded-t-sm transition-all"
                      style={{ height: day.count ? `${(day.count / maxBar) * 100}%` : "4px", opacity: day.count ? 1 : 0.15 }}
                    />
                    <span className="text-[10px] text-gray-400">{day.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Appointment Status Breakdown</h2>
            {loading ? (
              <p className="text-xs text-gray-400">Loading report data…</p>
            ) : total === 0 ? (
              <p className="text-xs text-gray-400">No appointments match this period and filters.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="Appointment status breakdown">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                    {donutSegments.map(segment => (
                      <circle
                        key={segment.status}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={STATUS_COLORS[segment.status] || "#9CA3AF"}
                        strokeWidth="14"
                        strokeDasharray={`${segment.fraction * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                        strokeDashoffset={`${-segment.offset * 2 * Math.PI * 38}`}
                        transform="rotate(-90 50 50)"
                      />
                    ))}
                    <text x="50" y="47" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1E3A8A">{total}</text>
                    <text x="50" y="59" textAnchor="middle" fontSize="8" fill="#9CA3AF">Total</text>
                  </svg>
                </div>
                <div className="space-y-2 flex-1">
                  {donutSegments.map(segment => (
                    <div key={segment.status} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[segment.status] || "#9CA3AF" }} />
                      <span className="text-gray-700 capitalize">{segment.status}</span>
                      <span className="font-semibold text-gray-900 ml-auto">{Math.round(segment.fraction * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="card p-4 mb-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Top Services by Volume</h2>
          {loading ? (
            <p className="text-xs text-gray-400">Loading report data…</p>
          ) : !report?.topServices.length ? (
            <p className="text-xs text-gray-400">No appointments match this period and filters.</p>
          ) : (
            <div className="space-y-3">
              {report.topServices.map(service => (
                <div key={service.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{service.name}</span>
                    <span className="font-semibold text-navy">
                      {service.appointmentCount} appointments / {service.completedCount} completed
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-navy h-2 rounded-full" style={{ width: `${(service.appointmentCount / maxServiceCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Review report records</h2>
              <p className="text-xs text-gray-400 mt-1">Choose the data set to review or export.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="institution-report-view">Report data</label>
              <select
                id="institution-report-view"
                value={view}
                onChange={event => {
                  setView(event.target.value);
                  setExportMenuOpen(false);
                }}
                className="input w-auto"
              >
                {Object.entries(VIEWS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <div className="relative">
                <button
                  type="button"
                  disabled={loading || records.length === 0 || !validRange}
                  aria-expanded={exportMenuOpen}
                  onClick={() => setExportMenuOpen(open => !open)}
                  className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
                >
                  Download report ▾
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                    <button type="button" onClick={() => exportReport("csv")} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded">CSV spreadsheet</button>
                    <button type="button" onClick={() => exportReport("excel")} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded">Excel workbook (.xlsx)</button>
                    <button type="button" onClick={() => exportReport("pdf")} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded">Print / Save as PDF</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {loading ? (
            <p className="text-xs text-gray-400 py-6 text-center">Loading report records…</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No {VIEWS[view].toLowerCase()} match the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    {columns.map(([, heading]) => (
                      <th key={heading} className="px-3 py-2 font-medium whitespace-nowrap">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, MAX_VISIBLE_RECORDS).map((record, index) => (
                    <tr key={record.id || `${view}-${index}`} className="border-b border-gray-50 last:border-0">
                      {columns.map(([key]) => (
                        <td key={key} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {record[key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > MAX_VISIBLE_RECORDS && (
                <p className="text-xs text-gray-400 mt-3">
                  Showing {MAX_VISIBLE_RECORDS} of {records.length} records. Downloads include all matching records.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </InstitutionLayout>
  );
}
