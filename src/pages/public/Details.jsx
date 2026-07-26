import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import institutionApi from '../../utils/institutionApi'
import serviceApi from '../../utils/serviceApi'
import appointmentApi from '../../utils/appointmentApi'
import PublicNav from '../../components/common/PublicNav'

function initialsOf(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

export default function DetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('Services')
  const [institution, setInstitution] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      institutionApi.getPublicById(id),
      serviceApi.listPublicByInstitution(id),
    ])
      .then(([instRes, svcRes]) => {
        if (cancelled) return
        setInstitution(instRes.institution)
        setServices(svcRes.services)
        if (svcRes.services[0]) setSelectedServiceId(String(svcRes.services[0].id))
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load this institution.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  const handleBook = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setBookingError('')

    if (!selectedServiceId || !selectedDate || !selectedTime) {
      setBookingError('Please choose a service, date, and time.')
      return
    }

    setBooking(true)
    try {
      await appointmentApi.book({
        institutionId: Number(id),
        serviceId: Number(selectedServiceId),
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
      })
      setBookingSuccess(true)
    } catch (err) {
      setBookingError(err.message || 'Could not book this appointment.')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-page font-poppins flex items-center justify-center text-sm text-gray-500">Loading…</div>
  }

  if (error || !institution) {
    return (
      <div className="min-h-screen bg-page font-poppins flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">{error || 'Institution not found.'}</p>
        <button className="btn-secondary text-xs px-4 py-1.5" onClick={() => navigate('/institutions')}>Back to Institutions</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page font-poppins">
      {/* Navbar */}
      <PublicNav active="institutions" />

      {/* Breadcrumb */}
      <div className="px-8 pt-4 text-xs text-gray-500">
        <span className="cursor-pointer hover:text-navy" onClick={() => navigate('/home')}>Home</span>
        <span className="mx-1">/</span>
        <span className="cursor-pointer hover:text-navy" onClick={() => navigate('/institutions')}>Institutions</span>
        <span className="mx-1">/</span>
        <span className="text-gray-700">{institution.name}</span>
      </div>

      {/* Profile Banner */}
      <div className="bg-navy px-8 py-6 mt-2">
        <div className="max-w-5xl mx-auto flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {initialsOf(institution.name)}
          </div>
          <div className="flex-1">
            <div className="text-white font-bold text-xl mb-1">{institution.name}</div>
            <div className="flex items-center gap-4 text-sm text-blue-200 mb-1">
              {institution.address && <span>📍 {institution.address}</span>}
              {institution.phone && <span>📞 {institution.phone}</span>}
              {institution.email && <span>✉ {institution.email}</span>}
            </div>
            {institution.category && (
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-semibold px-2 py-0.5 rounded mr-2">{institution.category}</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-6 grid grid-cols-3 gap-6">
        {/* Left: tabs + content */}
        <div className="col-span-2">
          <div className="flex border-b border-gray-200 mb-5">
            {['About','Services'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm transition-colors ${activeTab === tab ? 'text-green-brand border-b-2 border-green-brand font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >{tab}</button>
            ))}
          </div>

          {activeTab === 'Services' && (
            <div className="card overflow-hidden">
              {services.length === 0 && (
                <div className="px-5 py-6 text-sm text-gray-500 text-center">No services listed yet.</div>
              )}
              {services.map((svc, i) => (
                <div key={svc.id} className={`flex items-center justify-between px-5 py-4 ${i < services.length-1 ? 'border-b border-gray-100' : ''}`}>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{svc.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">⏱ {svc.durationMinutes} min</span>
                      {svc.price > 0 && <span className="text-xs text-gray-400">· KES {svc.price}</span>}
                    </div>
                  </div>
                  <button
                    className="btn-primary text-xs px-4 py-1.5"
                    onClick={() => { setSelectedServiceId(String(svc.id)); setActiveTab('Services') }}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'About' && (
            <div className="card p-5 text-sm text-gray-600 leading-relaxed">
              {institution.description || 'No description provided yet.'}
            </div>
          )}
        </div>

        {/* Right: booking sidebar */}
        <div>
          <div className="card p-5 sticky top-20">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Book an Appointment</h3>

            {bookingSuccess ? (
              <div className="text-sm text-green-brand">
                Your booking request was sent! You can track its status from your dashboard.
                <button className="btn-primary w-full text-xs py-2 mt-4" onClick={() => navigate('/client/appointments')}>
                  View My Appointments
                </button>
              </div>
            ) : (
              <>
                <label className="block text-xs text-gray-500 mb-1">Select Service</label>
                <select className="input mb-3 text-sm" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} disabled={services.length === 0}>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <label className="block text-xs text-gray-500 mb-1">Select Date</label>
                <input
                  type="date"
                  className="input mb-3 text-sm"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setSelectedDate(e.target.value)}
                />

                <label className="block text-xs text-gray-500 mb-2">Select Time</label>
                <input
                  type="time"
                  className="input mb-4 text-sm"
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                />

                {bookingError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-3">{bookingError}</div>
                )}

                <button
                  className="btn-primary w-full py-2.5 text-sm"
                  disabled={booking || services.length === 0}
                  onClick={handleBook}
                >
                  {booking ? 'Booking…' : user ? 'Book Appointment' : 'Login to Book'}
                </button>

                <button
                  className="w-full py-2 text-xs text-gray-500 hover:text-navy mt-2"
                  onClick={() => navigate('/institutions')}
                >
                  ← Back to Institutions
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
