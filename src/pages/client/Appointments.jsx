import { useState, useEffect, useCallback } from 'react'
import ClientLayout from '../../components/layout/ClientLayout'
import EmptyState from '../../components/common/EmptyState'
import appointmentApi from '../../utils/appointmentApi'

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
      await appointmentApi.cancelMine(id)
      load()
    } catch (err) {
      setError(err.message || 'Could not cancel this appointment.')
    } finally {
      setCancellingId(null)
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
              icon="📅"
              title="No appointments found"
              message={search ? `No results matching "${search}". Try a different search term.` : "You haven't booked any appointments yet."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Institution','Service','Date & Time','Queue Token','Booked On','Status','Actions'].map(h => (
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
                      <td className="px-4 py-3 text-gray-600">{a.queueNumber ? `#${a.queueNumber}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatBookedOn(a.createdAt)}</td>
                      <td className="px-4 py-3"><span className={BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(a.status === 'approved' || a.status === 'pending') &&
                            <button
                              className="text-red-300 hover:text-red-500 text-base disabled:opacity-40"
                              title="Cancel"
                              disabled={cancellingId === a.id}
                              onClick={() => handleCancel(a.id)}
                            >
                              ✕
                            </button>}
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
    </ClientLayout>
  )
}
