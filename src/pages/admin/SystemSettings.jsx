import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import settingsApi from "../../utils/settingsApi";

const TABS = ["General", "Maintenance"];

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState("General");
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ platformName: "", supportEmail: "", maintenanceMode: false, maintenanceMessage: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    settingsApi.get()
      .then(({ settings }) => {
        setSettings(settings);
        setForm(settings);
      })
      .catch(err => setError(err.message || "Could not load platform settings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (patch) => {
    setError("");
    setSaving(true);
    try {
      const { settings: updated } = await settingsApi.update(patch);
      setSettings(updated);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-1">Platform Settings</h1>
        <p className="text-xs text-gray-400 mb-5">Configuration that applies platform-wide</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {settings?.maintenanceMode && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <span>🚧</span> Maintenance Mode is currently <strong>ON</strong> — regular users cannot access the platform right now.
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm transition-colors ${activeTab === tab ? "text-green-brand border-b-2 border-green-brand font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-14">Loading…</div>
        ) : activeTab === "General" ? (
          <div className="card p-5 max-w-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Platform Name</label>
                <input className="input" value={form.platformName} onChange={set("platformName")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Support Email</label>
                <input className="input" value={form.supportEmail} onChange={set("supportEmail")} />
                <p className="text-[11px] text-gray-400 mt-1">Shown to users when they need help. Doesn't change where system emails are sent from — that's configured server-side.</p>
              </div>
            </div>
            <button
              onClick={() => handleSave({ platformName: form.platformName, supportEmail: form.supportEmail })}
              disabled={saving}
              className={`mt-4 text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${saved ? "bg-green-100 text-green-700 border border-green-300" : "btn-primary"}`}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        ) : (
          <div className="card p-5 max-w-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Maintenance Mode</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  When enabled, every request except login and the admin API returns a 503 with the message below.
                  Regular users, including newly registering ones, are blocked until you turn it back off.
                </p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, maintenanceMode: !f.maintenanceMode }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${form.maintenanceMode ? "bg-red-500" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.maintenanceMode ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <label className="block text-xs font-medium text-gray-600 mb-1">Message shown to users</label>
            <textarea className="input resize-none" rows={3} value={form.maintenanceMessage} onChange={set("maintenanceMessage")} />

            <button
              onClick={() => handleSave({ maintenanceMode: form.maintenanceMode, maintenanceMessage: form.maintenanceMessage })}
              disabled={saving}
              className={`mt-4 text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${saved ? "bg-green-100 text-green-700 border border-green-300" : "btn-primary"}`}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
