export default function EmptyState({ icon = '', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="text-4xl mb-3 opacity-60">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      {message && <p className="text-xs text-gray-400 max-w-xs">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
