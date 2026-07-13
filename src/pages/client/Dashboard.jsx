import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ClientLayout from '../../components/layout/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import appointmentApi from '../../utils/appointmentApi'

const STATUS_BADGE = { approved:'badge-approved', pending:'badge-pending', rejected:'badge-rejected', cancelled:'badge-cancelled', completed:'badge-completed' }

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T${timeStr || '00:00'}`)
  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const timeLabel = timeStr ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel
}

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [queuePosition, setQueuePosition] = useState(null)
  const [queueTarget, setQueueTarget] = useState(null)

  useEffect(() => {
    let cancelled = false

    appointmentApi
      .listMine()
      .then(async ({ appointments }) => {
        if (cancelled) return
        setAppointments(appointments)

        const today = new Date().toISOString().slice(0, 10)
        const nextInQueue = appointments
          .filter(a => a.status === 'approved' && a.appointmentDate >= today)
          .sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime))[0]

        if (nextInQueue) {
          setQueueTarget(nextInQueue)
          try {
            const { position } = await appointmentApi.getQueuePosition(nextInQueue.id)
            if (!cancelled) setQueuePosition(position)
          } catch {
            // Not currently in an active queue (e.g. date is in the future) — that's fine, just don't show a position.
          }
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = appointments
    .filter(a => (a.status === 'approved' || a.status === 'pending') && a.appointmentDate >= today)
    .sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime))
    .slice(0, 5)

  const kpis = [
    { label: 'Total Appointments', value: appointments.length, icon: '📅', border: 'border-l-blue-500' },
    { label: 'Upcoming', value: upcoming.length, icon: '⏰', border: 'border-l-green-brand' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, icon: '✅', border: 'border-l-blue-400' },
    { label: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, icon: '✕', border: 'border-l-red-400' },
  ]

  return (
    <ClientLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-5">Dashboard</h1>

        {/* Welcome banner */}
        <div className="bg-green-brand rounded-xl p-4 flex items-center justify-between mb-5">
          <div>
            <div className="text-white font-semibold text-base">{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</div>
            <div className="text-green-50 text-sm mt-0.5">
              {loading ? 'Loading your appointments…' : `You have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? '' : 's'}.`}
            </div>
          </div>
          <span className="text-4xl opacity-40">📅</span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          {kpis.map(k => (
            <div key={k.label} className={`card p-4 border-l-4 ${k.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{loading ? '—' : k.value}</div>
                </div>
                <span className="text-lg">{k.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Upcoming appointments */}
          <div className="col-span-2 card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Upcoming Appointments</h2>
            {loading ? (
              <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
            ) : upcoming.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">No upcoming appointments. Ready to book one?</div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{a.institutionName}</div>
                      <div className="text-xs text-gray-500">{a.serviceName}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{formatDateTime(a.appointmentDate, a.appointmentTime)}</span>
                      <span className={STATUS_BADGE[a.status]}>{a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="text-green-brand text-xs mt-3 hover:underline" onClick={() => navigate('/client/appointments')}>
              View all appointments →
            </button>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Queue position */}
            {queueTarget && queuePosition !== null && (
              <div className="card p-4 border-l-4 border-l-yellow-400">
                <h2 className="font-semibold text-gray-800 text-sm mb-3">Queue Position</h2>
                <div className="text-5xl font-bold text-navy text-center mb-1">{queuePosition}</div>
                <div className="text-xs text-gray-500 text-center mb-3">Your position</div>
                <div className="text-center mb-1">
                  <div className="text-sm font-medium text-gray-800">{queueTarget.institutionName}</div>
                  <div className="text-xs text-gray-500">{queueTarget.serviceName}</div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="card p-4">
              <h2 className="font-semibold text-gray-800 text-sm mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <button className="btn-primary w-full text-xs py-2" onClick={() => navigate('/institutions')}>Book New Appointment</button>
                <button className="btn-secondary w-full text-xs py-2" onClick={() => navigate('/institutions')}>Search Institutions</button>
                <button className="w-full text-xs py-2 text-gray-500 hover:text-navy" onClick={() => navigate('/client/appointments')}>View History</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}
