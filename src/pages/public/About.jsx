import { useNavigate } from 'react-router-dom'
import PublicNav from '../../components/common/PublicNav'

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-page font-poppins">
      <PublicNav active="about" />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-xs text-gray-500 mb-1 cursor-pointer hover:text-navy" onClick={() => navigate('/home')}>← Back to Home</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">About JIPANGE</h1>
        <p className="text-sm text-gray-500 mb-8">Plan it. Show up. Get served.</p>

        <div className="card p-6 mb-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-2">What we do</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            JIPANGE is a digital appointment booking and queue management platform built for institutions
            such as hospitals, banks, government offices and universities. Instead of clients queueing in
            person or calling ahead, institutions list their services on JIPANGE, and clients book a slot
            online in seconds. When an institution approves a booking, the client is given a queue token —
            the same idea as a ticket number at a service counter — so they know they have a reserved place
            in line without needing to arrive early and wait.
          </p>
        </div>

        <div className="card p-6 mb-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-2">Who it's for</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            JIPANGE is built as a business-to-business platform: institutions register, get approved, and
            manage their own services, staff and appointment queue from a dedicated dashboard. Clients use
            the same platform to search for institutions, browse services, and book and track their own
            appointments.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-2">This build</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            This version of JIPANGE was built as an academic capstone project. It is a working prototype
            intended to demonstrate the core booking and queue management workflow end-to-end, rather than
            a finished commercial product.
          </p>
        </div>
      </div>
    </div>
  )
}
