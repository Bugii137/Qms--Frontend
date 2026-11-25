import { useState, useEffect } from 'react'
import ClientLayout from '../../components/layout/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import authApi from '../../utils/authApi'
import appointmentApi from '../../utils/appointmentApi'
import notificationApi from '../../utils/notificationApi'

const TABS = ['Personal Info', 'Security', 'Notification Preferences']

const NOTIF_TOGGLES = [
  { key: 'emailConfirmed',  label: 'Booking Request Received', channel: 'email' },
  { key: 'emailApproved',   label: 'Appointment Approved',     channel: 'email' },
  { key: 'emailRejected',   label: 'Appointment Declined',     channel: 'email' },
  { key: 'emailRescheduled',label: 'Appointment Rescheduled',  channel: 'email' },
  { key: 'emailCancelled',  label: 'Appointment Cancelled',    channel: 'email' },
  { key: 'emailCompleted',  label: 'Appointment Completed',    channel: 'email' },
  { key: 'appConfirmed',    label: 'Booking Request Received', channel: 'app' },
  { key: 'appApproved',     label: 'Appointment Approved',     channel: 'app' },
  { key: 'appRejected',     label: 'Appointment Declined',     channel: 'app' },
  { key: 'appRescheduled',  label: 'Appointment Rescheduled',  channel: 'app' },
  { key: 'appCancelled',    label: 'Appointment Cancelled',    channel: 'app' },
  { key: 'appCompleted',    label: 'Appointment Completed',    channel: 'app' },
]

function initialsOf(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Toggle({ label, on, onChange, disabled }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
        on ? 'bg-green-brand' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function ClientProfile() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('Personal Info')

  // Personal info
  const [form, setForm] = useState({ fullName: user?.name || '', phone: user?.phone || '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [profileEmailNotice, setProfileEmailNotice] = useState('')
  const [totalBookings, setTotalBookings] = useState(null)

  useEffect(() => {
    appointmentApi.listMine().then(({ appointments }) => setTotalBookings(appointments.length)).catch(() => {})
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaveError('')
    setProfileEmailNotice('')
    setSaving(true)
    try {
      const { user: updated, emailSent } = await authApi.updateProfile({ fullName: form.fullName, phone: form.phone })
      updateUser({ ...updated, name: updated.fullName })
      setSaved(true)
      if (emailSent === false) setProfileEmailNotice('Changes were saved, but we could not send the profile update email.')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err.message || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwStrength, setPwStrength] = useState(0)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [passwordEmailNotice, setPasswordEmailNotice] = useState('')

  const setPwField = k => e => {
    setPw(p => ({ ...p, [k]: e.target.value }))
    if (k === 'next') {
      const v = e.target.value
      let score = 0
      if (v.length >= 8) score++
      if (/[A-Z]/.test(v)) score++
      if (/[0-9]/.test(v)) score++
      if (/[^A-Za-z0-9]/.test(v)) score++
      setPwStrength(score)
    }
  }

  const handlePwSave = async () => {
    setPwError('')
    setPasswordEmailNotice('')
    if (pw.next !== pw.confirm) {
      setPwError('Passwords do not match.')
      return
    }
    if (pw.next.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    setPwSaving(true)
    try {
      const { emailSent } = await authApi.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwStrength(0)
      setPwSaved(true)
      if (emailSent === false) setPasswordEmailNotice('Your password changed, but we could not send the security notification email.')
      setTimeout(() => setPwSaved(false), 2500)
    } catch (err) {
      setPwError(err.message || 'Could not update password.')
    } finally {
      setPwSaving(false)
    }
  }

  const [toggles, setToggles] = useState(null)
  const [preferencesLoading, setPreferencesLoading] = useState(true)
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  const [preferencesError, setPreferencesError] = useState('')
  const [preferencesSaved, setPreferencesSaved] = useState(false)

  useEffect(() => {
    let active = true
    notificationApi.getPreferences()
      .then(({ preferences }) => {
        if (active) setToggles(preferences)
      })
      .catch(err => {
        if (active) setPreferencesError(err.message || 'Could not load notification preferences.')
      })
      .finally(() => {
        if (active) setPreferencesLoading(false)
      })
    return () => { active = false }
  }, [])

  const savePreferences = async () => {
    if (!toggles) return
    setPreferencesSaving(true)
    setPreferencesError('')
    setPreferencesSaved(false)
    try {
      const { preferences } = await notificationApi.updatePreferences(toggles)
      setToggles(preferences)
      setPreferencesSaved(true)
    } catch (err) {
      setPreferencesError(err.message || 'Could not save notification preferences.')
    } finally {
      setPreferencesSaving(false)
    }
  }

  const strengthColor = ['bg-gray-200', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-brand'][pwStrength]
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength]

  return (
    <ClientLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">Profile &amp; Settings</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm transition-colors ${
                activeTab === tab
                  ? 'text-green-brand border-b-2 border-green-brand font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── PERSONAL INFO ── */}
        {activeTab === 'Personal Info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-brand rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {initialsOf(user?.name)}
                </div>
              </div>

              {/* Form grid */}
              <div className="card p-5">
                {saveError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-3">{saveError}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <input className="input" value={form.fullName} onChange={set('fullName')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                    <input className="input bg-gray-50 text-gray-500" value={user?.email || ''} disabled title="Email can't be changed here yet" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                    <input className="input" value={form.phone} onChange={set('phone')} />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      saved
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'btn-primary'
                    }`}
                  >
                    {saving ? 'Saving…' : saved ? '✓ Changes saved' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setForm({ fullName: user?.name || '', phone: user?.phone || '' })}
                    className="btn-secondary text-sm px-5 py-2"
                  >
                    Discard
                  </button>
                </div>
                {profileEmailNotice && (
                  <p role="status" className="text-xs text-amber-700 mt-3">{profileEmailNotice}</p>
                )}
              </div>

              {/* Account Info */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Account Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total bookings</div>
                    <div className="text-sm font-semibold text-gray-800">{totalBookings ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Status</div>
                    <span className="badge-approved">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {activeTab === 'Security' && (
          <div className="max-w-lg space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Change Password</h3>
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-3">{pwError}</div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                  <input className="input" type="password" placeholder="••••••••" value={pw.current} onChange={setPwField('current')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                  <input className="input" type="password" placeholder="••••••••" value={pw.next} onChange={setPwField('next')} />
                  {pw.next && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength ? strengthColor : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{strengthLabel}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                  <input className="input" type="password" placeholder="••••••••" value={pw.confirm} onChange={setPwField('confirm')} />
                  {pw.confirm && pw.next !== pw.confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
              <button
                onClick={handlePwSave}
                disabled={pwSaving}
                className={`mt-4 text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  pwSaved ? 'bg-green-100 text-green-700 border border-green-300' : 'btn-primary'
                }`}
              >
                {pwSaving ? 'Updating…' : pwSaved ? '✓ Password updated' : 'Update Password'}
              </button>
              {passwordEmailNotice && (
                <p role="status" className="text-xs text-amber-700">{passwordEmailNotice}</p>
              )}
            </div>

            {/* Danger zone */}
            <div className="card p-5 border border-red-100">
              <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
              <p className="text-xs text-gray-500 mb-3">
                Permanently delete your account and all your appointment data. This cannot be undone.
              </p>
              <button disabled title="Account deletion isn't available yet" className="text-xs px-4 py-2 border border-red-200 text-red-300 rounded-lg cursor-not-allowed font-medium">
                Delete Account (coming soon)
              </button>
            </div>
          </div>
        )}

        {/* ── NOTIFICATION PREFERENCES ── */}
        {activeTab === 'Notification Preferences' && (
          <div className="max-w-lg space-y-4">
            <p className="text-xs text-gray-500">
              Choose whether to receive booking updates by email or in-app. Security and account alerts may still be sent when needed to protect your account.
            </p>
            {preferencesLoading && <p role="status" className="text-xs text-gray-500">Loading preferences…</p>}
            {preferencesError && <p role="alert" className="text-xs text-red-600">{preferencesError}</p>}
            {/* Email notifications */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                 Email Notifications
              </h3>
              <div className="space-y-4">
                {NOTIF_TOGGLES.filter(t => t.channel === 'email').map(t => (
                  <div key={t.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{t.label}</span>
                    <Toggle
                      label={t.label}
                      on={Boolean(toggles?.[t.key])}
                      disabled={preferencesLoading || preferencesSaving || !toggles}
                      onChange={v => {
                        setToggles(s => ({ ...s, [t.key]: v }))
                        setPreferencesSaved(false)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* In-app notifications */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                 In-App Notifications
              </h3>
              <div className="space-y-4">
                {NOTIF_TOGGLES.filter(t => t.channel === 'app').map(t => (
                  <div key={t.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{t.label}</span>
                    <Toggle
                      label={t.label}
                      on={Boolean(toggles?.[t.key])}
                      disabled={preferencesLoading || preferencesSaving || !toggles}
                      onChange={v => {
                        setToggles(s => ({ ...s, [t.key]: v }))
                        setPreferencesSaved(false)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={savePreferences}
              disabled={preferencesLoading || preferencesSaving || !toggles}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {preferencesSaving ? 'Saving…' : preferencesSaved ? '✓ Preferences saved' : 'Save Preferences'}
            </button>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
