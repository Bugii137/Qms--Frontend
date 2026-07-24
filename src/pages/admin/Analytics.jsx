import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import analyticsApi from '../../utils/analyticsApi'

const CAT_COLORS = ['bg-green-brand', 'bg-navy', 'bg-blue-500', 'bg-gold-brand', 'bg-gray-300', 'bg-purple-400']

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    analyticsApi.getAnalytics()
      .then(({ analytics }) => setData(analytics))
      .catch(err => setError(err.message || 'Could not load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-sm text-gray-400 py-14">Loading…</div>
      </AdminLayout>
    )
  }

  const signups = data?.signupsByMonth || []
  const appts = data?.appointmentsByMonth || []
  const byCategory = data?.institutionsByCategory || []
  const topInstitutions = data?.topInstitutions || []

  const maxSignups = Math.max(1, ...signups.map(d => d.count))
  const maxAppts = Math.max(1, ...appts.map(d => d.booked))
  const maxCategory = Math.max(1, ...byCategory.map(c => c.count))
  const maxTopAppts = Math.max(1, ...topInstitutions.map(t => t.appointmentCount))

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-navy mb-1">Platform Analytics</h1>
        <p className="text-xs text-gray-400 mb-5">Real usage data from the last 6 months</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* User growth */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-1">User Growth</h2>
            <p className="text-xs text-gray-400 mb-4">New signups per month</p>
            {signups.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">No signups in the last 6 months yet.</p>
            ) : (
              <div className="flex items-end gap-3 h-32">
                {signups.map(d => (
                  <div key={d.month} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[10px] text-gray-500">{d.count}</span>
                    <div className="w-full bg-navy rounded-t-sm" style={{ height: `${(d.count / maxSignups) * 100}%`, minHeight: 4 }} />
                    <span className="text-[10px] text-gray-400">{d.month.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointment volume */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-1">Appointment Volume</h2>
            <p className="text-xs text-gray-400 mb-4">Booked vs. completed per month</p>
            {appts.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">No appointments in the last 6 months yet.</p>
            ) : (
              <div className="flex items-end gap-3 h-32">
                {appts.map(d => (
                  <div key={d.month} className="flex flex-col items-center flex-1 gap-1">
                    <div className="w-full flex items-end gap-0.5" style={{ height: 96 }}>
                      <div className="flex-1 bg-blue-200 rounded-t-sm" style={{ height: `${(d.booked / maxAppts) * 100}%`, minHeight: d.booked ? 4 : 0 }} title={`Booked: ${d.booked}`} />
                      <div className="flex-1 bg-green-brand rounded-t-sm" style={{ height: `${(d.completed / maxAppts) * 100}%`, minHeight: d.completed ? 4 : 0 }} title={`Completed: ${d.completed}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{d.month.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-200 rounded-sm" /> Booked</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-brand rounded-sm" /> Completed</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By category */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Institutions by Category</h2>
            {byCategory.length === 0 ? (
              <p className="text-xs text-gray-400">No institutions registered yet.</p>
            ) : (
              <div className="space-y-2.5">
                {byCategory.map((c, i) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{c.category}</span>
                      <span className="font-semibold text-navy">{c.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`${CAT_COLORS[i % CAT_COLORS.length]} h-1.5 rounded-full`} style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top institutions */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">Top 5 Institutions by Appointment Volume</h2>
            {topInstitutions.length === 0 || topInstitutions.every(t => t.appointmentCount === 0) ? (
              <p className="text-xs text-gray-400">No appointments booked yet.</p>
            ) : (
              <div className="space-y-3">
                {topInstitutions.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 truncate">{t.name}</span>
                        <span className="font-semibold text-navy flex-shrink-0 ml-2">{t.appointmentCount}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-navy h-1.5 rounded-full" style={{ width: `${(t.appointmentCount / maxTopAppts) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
