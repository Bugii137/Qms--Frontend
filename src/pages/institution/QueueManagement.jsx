import { useState, useEffect, useCallback } from "react";
import InstitutionLayout from "../../components/layout/InstitutionLayout";
import appointmentApi from "../../utils/appointmentApi";

function formatTime(timeStr) {
  if (!timeStr) return ''
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function QueueManagement() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callingId, setCallingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    appointmentApi
      .getQueue()
      .then(({ queue }) => setQueues(queue))
      .catch(err => setError(err.message || "Could not load the queue."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load() }, [load]);

  const callNext = async (appointmentId) => {
    setCallingId(appointmentId);
    try {
      await appointmentApi.callNext(appointmentId);
      load();
    } catch (err) {
      setError(err.message || "Could not call the next appointment.");
    } finally {
      setCallingId(null);
    }
  };

  return (
    <InstitutionLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-navy">Queue Management</h1>
          <div className="flex items-center gap-1.5 text-green-brand text-sm font-medium">
            <span className="w-2 h-2 bg-green-brand rounded-full animate-pulse" />
            {loading ? 'Loading…' : "Today's approved bookings"}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {!loading && queues.length === 0 && !error && (
          <div className="text-sm text-gray-400 text-center py-14">No approved appointments for today yet.</div>
        )}

        {/* Kanban columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {queues.map((q) => {
            const [nowServing, ...rest] = q.waiting;
            return (
              <div key={q.serviceId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Column header */}
                <div className="bg-navy px-4 py-3">
                  <div className="text-white font-semibold text-sm">{q.serviceName}</div>
                </div>

                {/* Now serving */}
                <div className="p-4 border-b border-gray-100 bg-green-50">
                  <div className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mb-1">
                    Now Serving
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {nowServing?.queueNumber && (
                      <span className="text-xs font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">#{nowServing.queueNumber}</span>
                    )}
                    <div className="text-base font-bold text-gray-900">
                      {nowServing ? nowServing.clientName : '—'}
                    </div>
                  </div>
                  {nowServing && (
                    <button
                      onClick={() => callNext(nowServing.id)}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                      disabled={callingId === nowServing.id}
                    >
                      {callingId === nowServing.id ? 'Calling…' : 'Call Next →'}
                    </button>
                  )}
                </div>

                {/* Waiting list */}
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Waiting ({rest.length})
                  </div>
                  {rest.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">No one waiting</div>
                  ) : (
                    <div className="space-y-2">
                      {rest.map((w) => (
                        <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {w.queueNumber ? `#${w.queueNumber}` : '—'}
                            </span>
                            <span className="text-sm text-gray-800">{w.clientName}</span>
                          </div>
                          <span className="text-xs text-gray-400">{formatTime(w.appointmentTime)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </InstitutionLayout>
  );
}
