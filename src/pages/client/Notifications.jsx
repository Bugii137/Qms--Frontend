import { useState } from 'react'
import ClientLayout from '../../components/layout/ClientLayout'

const NOTIFICATIONS = {
  TODAY: [
    {
      id: 1,
      icon: '🔔',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'Appointment Approved',
      message: 'Your appointment at City General Hospital on Jun 28 has been approved.',
      time: '2h ago',
      unread: true,
    },
    {
      id: 2,
      icon: '⏰',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      title: 'Reminder',
      message: 'Your Equity Bank appointment is tomorrow at 2 PM. Be on time!',
      time: '4h ago',
      unread: true,
    },
  ],
  YESTERDAY: [
    {
      id: 3,
      icon: '❌',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      title: 'Appointment Rejected',
      message: 'Your KRA appointment on Jun 22 was rejected. Please reschedule.',
      time: '1d ago',
      unread: false,
    },
    {
      id: 4,
      icon: '🔔',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
      title: 'Booking Confirmed',
      message: 'Your Huduma Centre appointment for Jul 1 is confirmed.',
      time: '1d ago',
      unread: false,
    },
  ],
  'EARLIER THIS WEEK': [
    {
      id: 5,
      icon: '🔔',
      iconBg: 'bg-navy/10',
      iconColor: 'text-navy',
      title: 'Account Verified',
      message: 'Your Jipange account has been verified. You can now book appointments.',
      time: '3d ago',
      unread: false,
    },
  ],
}

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const totalUnread = Object.values(notifications)
    .flat()
    .filter(n => n.unread).length

  const markAllRead = () => {
    const updated = {}
    Object.entries(notifications).forEach(([group, items]) => {
      updated[group] = items.map(n => ({ ...n, unread: false }))
    })
    setNotifications(updated)
  }

  const markRead = (id) => {
    const updated = {}
    Object.entries(notifications).forEach(([group, items]) => {
      updated[group] = items.map(n => n.id === id ? { ...n, unread: false } : n)
    })
    setNotifications(updated)
  }

  return (
    <ClientLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-navy">Notifications</h1>
            {totalUnread > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{totalUnread} unread</p>
            )}
          </div>
          {totalUnread > 0 && (
            <button
              onClick={markAllRead}
              className="text-green-brand text-xs font-medium hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification groups */}
        <div className="space-y-6">
          {Object.entries(notifications).map(([group, items]) => (
            <div key={group}>
              {/* Group label */}
              <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2 px-1">
                {group}
              </div>

              {/* Notification items */}
              <div className="card overflow-hidden">
                {items.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors
                      ${i < items.length - 1 ? 'border-b border-gray-50' : ''}
                      ${n.unread
                        ? 'bg-green-50 border-l-4 border-l-green-brand'
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full ${n.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className={`text-base ${n.iconColor}`}>{n.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm mb-0.5 ${n.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {n.title}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {n.message}
                      </div>
                    </div>

                    {/* Time + unread dot */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-400">{n.time}</span>
                      {n.unread && (
                        <div className="w-2 h-2 bg-green-brand rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state — shown when all read and list is small */}
        {totalUnread === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm font-medium">You are all caught up!</p>
            <p className="text-xs mt-1">No unread notifications</p>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
