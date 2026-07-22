import { useState, useEffect, useCallback } from "react";
import StaffLayout from "../../components/layout/StaffLayout";
import { useAuth } from "../../context/AuthContext";
import { canEditProfile } from "../../utils/permissions";
import { accessLevelToLabel } from "../../utils/accessLevel";
import authApi from "../../utils/authApi";
import staffApi from "../../utils/staffApi";

export default function StaffProfile() {
  const { user, updateUser } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ fullName: user?.name || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    staffApi.getMine()
      .then(({ assignment }) => setAssignment(assignment))
      .catch(err => setError(err.message || "Could not load your assignment."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const accessLevel = accessLevelToLabel(assignment?.accessLevel || "view_only");
  const editable = canEditProfile(accessLevel);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const { user: updated } = await authApi.updateProfile({ fullName: form.fullName, phone: form.phone });
      updateUser({ ...updated, name: updated.fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">Profile &amp; Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="col-span-2 card p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-green-brand rounded-full flex items-center justify-center text-white text-lg font-bold">
                {(form.fullName || "?").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{form.fullName}</div>
                <div className="text-xs text-gray-400">{loading ? "…" : assignment?.institutionName}</div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input className="input" disabled={!editable} value={form.fullName} onChange={set("fullName")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                <input className="input bg-gray-50 text-gray-500" disabled value={user?.email || ""} title="Email can't be changed here yet" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input className="input" disabled={!editable} value={form.phone} onChange={set("phone")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                <input className="input bg-gray-50" disabled value={assignment?.jobTitle || "Unassigned"} />
              </div>
            </div>

            {editable ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className={`mt-4 text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${saved ? "bg-green-100 text-green-700 border border-green-300" : "btn-primary"}`}
              >
                {saving ? "Saving…" : saved ? "✓ Changes saved" : "Save Changes"}
              </button>
            ) : (
              <p className="text-xs text-gray-400 mt-4">
                Your profile is managed by your Institution Admin. Contact them to request changes.
              </p>
            )}
          </div>

          {/* Access info card */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Access Level</h3>
            <div className="text-xs text-gray-500 mb-3">
              Set by your Institution Admin. This determines what actions you can perform.
            </div>
            <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${
              accessLevel === "View Only" ? "bg-gray-100 text-gray-600" :
              accessLevel === "Full Access" ? "bg-navy/10 text-navy" :
              "bg-green-100 text-green-700"
            }`}>
              {accessLevel}
            </span>
            <ul className="text-xs text-gray-500 mt-4 space-y-1.5 list-disc list-inside">
              <li>View queue and appointments</li>
              {(accessLevel === "Manage Appointments" || accessLevel === "Full Access") && (
                <li>Approve / Reject / Call Next</li>
              )}
              {accessLevel === "Full Access" && (
                <li>Edit own profile details</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
