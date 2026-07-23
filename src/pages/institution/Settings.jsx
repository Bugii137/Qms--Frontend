import { useState, useEffect, useCallback } from 'react'
import InstitutionLayout from '../../components/layout/InstitutionLayout'
import institutionApi from '../../utils/institutionApi'
import serviceApi from '../../utils/serviceApi'

const TABS = ['Institution Profile', 'Services']

// ── Toggle component ────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-green-brand' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Institution Profile tab ─────────────────────────────────────────────────
function ProfileTab({ institution, onSaved }) {
  const [form, setForm] = useState({
    name: institution.name || '',
    category: institution.category || 'Hospital',
    email: institution.email || '',
    phone: institution.phone || '',
    address: institution.address || '',
    description: institution.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const { institution: updated } = await institutionApi.updateMine(form)
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Form */}
      <div className="col-span-2 card p-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Institution Name</label>
            <input className="input" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {['Hospital', 'Bank', 'Government', 'University', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Physical Address</label>
            <input className="input" value={form.address} onChange={set('address')} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description <span className="text-gray-400">({form.description.length}/500)</span>
            </label>
            <textarea className="input resize-none" rows={3} maxLength={500} value={form.description} onChange={set('description')} />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${saved ? 'bg-green-100 text-green-700 border border-green-300' : 'btn-primary'}`}
          >
            {saving ? 'Saving…' : saved ? '✓ Profile saved' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Public listing preview */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">Public Listing Preview</p>
        <div className="card overflow-hidden">
          <div className="h-20 bg-gray-100 flex items-center justify-center text-xs text-gray-400">Logo placeholder</div>
          <div className="p-4">
            <div className="font-semibold text-sm text-gray-900 mb-1">{form.name}</div>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded mb-2 inline-block">{form.category}</span>
            <p className="text-xs text-gray-500 line-clamp-2 mb-1">{form.description}</p>
            <p className="text-xs text-gray-400">📍 {form.address}</p>
          </div>
        </div>
        {institution.status !== 'active' && (
          <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            Your institution is <strong>{institution.status}</strong> and won't appear in the public directory until a system admin approves it.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Services tab ────────────────────────────────────────────────────────────
function ServicesTab() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSvc, setNewSvc] = useState({ name: '', durationMinutes: '', description: '' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    serviceApi.listMine()
      .then(({ services }) => setServices(services))
      .catch(err => setError(err.message || 'Could not load services.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const toggleStatus = async (svc) => {
    try {
      await serviceApi.setStatus(svc.id, !svc.isActive)
      setServices(s => s.map(x => x.id === svc.id ? { ...x, isActive: !x.isActive } : x))
    } catch (err) {
      setError(err.message || 'Could not update service status.')
    }
  }

  const deleteSvc = async (id) => {
    try {
      await serviceApi.remove(id)
      setServices(s => s.filter(svc => svc.id !== id))
    } catch (err) {
      setError(err.message || 'Could not delete this service.')
    }
  }

  const addSvc = async () => {
    if (!newSvc.name || !newSvc.durationMinutes) return
    setAdding(true)
    setError('')
    try {
      await serviceApi.create({
        name: newSvc.name,
        durationMinutes: Number(newSvc.durationMinutes),
        description: newSvc.description,
      })
      setNewSvc({ name: '', durationMinutes: '', description: '' })
      load()
    } catch (err) {
      setError(err.message || 'Could not add this service.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{services.length} service{services.length === 1 ? '' : 's'} configured</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Services table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : services.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No services yet — add your first one below.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Service Name', 'Duration', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => (
                <tr key={svc.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === services.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{svc.name}</td>
                  <td className="px-4 py-3 text-gray-600">{svc.durationMinutes} min</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{svc.description}</td>
                  <td className="px-4 py-3"><Toggle on={svc.isActive} onChange={() => toggleStatus(svc)} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteSvc(svc.id)} className="text-red-400 hover:text-red-600 text-base" title="Delete">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add service form */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Service</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Service Name</label>
            <input className="input text-sm" placeholder="e.g. Dental Checkup" value={newSvc.name} onChange={e => setNewSvc(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">Duration (min)</label>
            <input className="input text-sm" type="number" placeholder="30" value={newSvc.durationMinutes} onChange={e => setNewSvc(s => ({ ...s, durationMinutes: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input className="input text-sm" placeholder="Short description" value={newSvc.description} onChange={e => setNewSvc(s => ({ ...s, description: e.target.value }))} />
          </div>
          <button disabled={adding} onClick={addSvc} className="btn-primary text-xs px-4 py-2 whitespace-nowrap disabled:opacity-50">
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function InstitutionSettings() {
  const [activeTab, setActiveTab] = useState('Institution Profile')
  const [institution, setInstitution] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    institutionApi.getMine()
      .then(({ institution }) => setInstitution(institution))
      .catch(err => setError(err.message || 'Could not load your institution.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <InstitutionLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">{institution?.name || '…'} / Settings</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-14">Loading…</div>
        ) : !institution ? null : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm transition-colors ${activeTab === tab ? 'text-green-brand border-b-2 border-green-brand font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Institution Profile' && <ProfileTab institution={institution} onSaved={setInstitution} />}
            {activeTab === 'Services' && <ServicesTab />}
          </>
        )}
      </div>
    </InstitutionLayout>
  )
}
