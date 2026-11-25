import { useState, useEffect, useCallback } from 'react'
import ClientLayout from '../../components/layout/ClientLayout'
import EmptyState from '../../components/common/EmptyState'
import appointmentApi from '../../utils/appointmentApi'
import { todayLocal } from '../../utils/date'

const STATUS_FILTERS = ['All Status', 'Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed']
const BADGE = { approved:'badge-approved', pending:'badge-pending', rejected:'badge-rejected', cancelled:'badge-cancelled', completed:'badge-completed' }

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T${timeStr || '00:00'}`)
  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const timeLabel = timeStr ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel
}

function formatBookedOn(createdAt) {
  if (!createdAt) return ''
  return new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ClientAppointments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [editForm, setEditForm] = useState({ appointmentDate: '', appointmentTime: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const status = statusFilter === 'All Status' ? undefined : statusFilter.toLowerCase()
    appointmentApi
      .listMine(status)
      .then(({ appointments }) => setAppointments(appointments))
      .catch(err => setError(err.message || 'Could not load your appointments.'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id) => {
    setCancellingId(id)
    try {
      await appointmentApi.remove(id)
      load()
    } catch (err) {
      setError(err.message || 'Could not cancel this appointment.')
    } finally {
      setCancellingId(null)
    }
  }

  const openEdit = (appointment) => {
    setEditingAppointment(appointment)
    setEditForm({
      appointmentDate: String(appointment.appointmentDate).slice(0, 10),
      appointmentTime: String(appointment.appointmentTime).slice(0, 5),
      notes: appointment.notes || '',
    })
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    setSavingEdit(true)
    setError('')
    try {
      await appointmentApi.update(editingAppointment.id, editForm)
      setEditingAppointment(null)
      load()
    } catch (err) {
      setError(err.message || 'Could not update this appointment.')
    } finally {
      setSavingEdit(false)
    }
  }

  const filtered = appointments.filter(a =>
    a.institutionName?.toLowerCase().includes(search.toLowerCase()) ||
    a.serviceName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ClientLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">My Appointments</h1>

        {/* Search bar */}
        <div className="flex items-center gap-3 mb-4">
          <input className="input flex-1" placeholder="Search appointments..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon=""
              title="No appointments found"
              message={search ? `No results matching "${search}". Try a different search term.` : "You haven't booked any appointments yet."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Institution','Service','Date & Time','Ticket Number','Booked On','Status','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{a.institutionName}</td>
                      <td className="px-4 py-3 text-gray-600">{a.serviceName}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(a.appointmentDate, a.appointmentTime)}</td>
                      <td className="px-4 py-3 text-gray-600">{a.ticketNumber || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatBookedOn(a.createdAt)}</td>
                      <td className="px-4 py-3"><span className={BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {a.status === 'pending' && (
                            <button className="text-blue-600 hover:text-blue-800 text-xs disabled:opacity-40" title="Edit appointment" onClick={() => openEdit(a)}>Edit</button>
                          )}
                          {(a.status === 'approved' || a.status === 'pending') && (
                            <button
                              className="text-red-500 hover:text-red-700 text-xs disabled:opacity-40"
                              title="Cancel appointment"
                              disabled={cancellingId === a.id}
                              onClick={() => handleCancel(a.id)}
                            >
                              {cancellingId === a.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="card w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-navy mb-4">Edit appointment</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input className="input" type="date" min={todayLocal()} required value={editForm.appointmentDate} onChange={e => setEditForm(f => ({ ...f, appointmentDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time</label>
                <input className="input" type="time" required value={editForm.appointmentTime} onChange={e => setEditForm(f => ({ ...f, appointmentTime: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea className="input" rows={3} maxLength={500} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn-secondary text-sm px-4 py-2" onClick={() => setEditingAppointment(null)}>Cancel</button>
              <button type="submit" className="btn-primary text-sm px-4 py-2" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}
    </ClientLayout>
  )
}
