import { useState, useEffect, useCallback } from 'react'
import StaffLayout from "../../components/layout/StaffLayout";
import notificationApi from '../../utils/notificationApi'

const TYPE_ICON = {
  appointment: { icon: '🔔', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  general: { icon: '🔔', iconBg: 'bg-navy/10', iconColor: 'text-navy' },
}

function groupLabel(createdAt) {
  const date = new Date(createdAt)
  const now = new Date()
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000)

  if (diffDays <= 0) return 'TODAY'
  if (diffDays === 1) return 'YESTERDAY'
  if (diffDays <= 7) return 'EARLIER THIS WEEK'
  return 'EARLIER'
}

function relativeTime(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

const GROUP_ORDER = ['TODAY', 'YESTERDAY', 'EARLIER THIS WEEK', 'EARLIER']

export default function StaffNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    notificationApi
      .listMine()
      .then(({ notifications }) => setNotifications(notifications))
      .catch(err => setError(err.message || 'Could not load notifications.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const totalUnread = notifications.filter(n => !n.isRead).length

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      setError(err.message || 'Could not mark all as read.')
    }
  }

  const markRead = async (id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n))
    try {
      await notificationApi.markRead(id)
    } catch (err) {
      setError(err.message || 'Could not mark this notification as read.')
    }
  }

  const grouped = {}
  for (const n of notifications) {
    const g = groupLabel(n.createdAt)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(n)
  }

  return (
    <StaffLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-navy">Notifications</h1>
            {totalUnread > 0 && <p className="text-xs text-gray-400 mt-0.5">{totalUnread} unread</p>}
          </div>
          {totalUnread > 0 && (
            <button onClick={markAllRead} className="text-green-brand text-xs font-medium hover:underline">
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-14">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm font-medium">You are all caught up!</p>
            <p className="text-xs mt-1">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
              <div key={group}>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2 px-1">{group}</div>
                <div className="card overflow-hidden">
                  {grouped[group].map((n, i) => {
                    const style = TYPE_ICON[n.type] || TYPE_ICON.general
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markRead(n.id)}
                        className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors
                          ${i < grouped[group].length - 1 ? 'border-b border-gray-50' : ''}
                          ${!n.isRead ? 'bg-green-50 border-l-4 border-l-green-brand' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                      >
                        <div className={`w-9 h-9 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <span className={`text-base ${style.iconColor}`}>{style.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm mb-0.5 ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>{n.title}</div>
                          <div className="text-xs text-gray-500 leading-relaxed">{n.message}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-400">{relativeTime(n.createdAt)}</span>
                          {!n.isRead && <div className="w-2 h-2 bg-green-brand rounded-full" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  )
}
