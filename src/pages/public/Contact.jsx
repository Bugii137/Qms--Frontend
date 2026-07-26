import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicNav from '../../components/common/PublicNav'

const SUPPORT_EMAIL = 'support@jipange.app'

export default function ContactPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const canSend = name.trim() && email.trim() && message.trim()

  const handleSend = () => {
    const subject = encodeURIComponent(`JIPANGE contact from ${name}`)
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`)
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="min-h-screen bg-page font-poppins">
      <PublicNav active="contact" />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-xs text-gray-500 mb-1 cursor-pointer hover:text-navy" onClick={() => navigate('/home')}>← Back to Home</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-sm text-gray-500 mb-8">
          Questions about a booking, or interested in registering your institution? Send us a message
          and we'll get back to you.
        </p>

        <div className="card p-6">
          <label className="block text-xs text-gray-500 mb-1">Your Name</label>
          <input className="input mb-3" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />

          <label className="block text-xs text-gray-500 mb-1">Your Email</label>
          <input className="input mb-3" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />

          <label className="block text-xs text-gray-500 mb-1">Message</label>
          <textarea className="input mb-4" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" />

          <button className="btn-primary w-full py-2.5 text-sm disabled:opacity-40" disabled={!canSend} onClick={handleSend}>
            Send Message
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            This opens your email app addressed to {SUPPORT_EMAIL} with your message pre-filled.
          </p>
        </div>
      </div>
    </div>
  )
}
