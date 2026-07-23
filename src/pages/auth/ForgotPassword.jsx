import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authApi from '../../utils/authApi'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email) return
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page font-poppins flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="JIPANGE" className="h-14 w-auto mb-3" />
        </div>

        {!success ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Reset your password</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Enter the email linked to your account and we will send you a reset link.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
            <input className="input mb-4" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button disabled={loading} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50" onClick={handleSubmit}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button className="w-full text-center text-xs text-navy hover:underline mt-3" onClick={() => navigate('/login')}>← Back to Sign In</button>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-brand text-2xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
            <p className="text-gray-500 text-sm mb-6">
              If an account exists for <strong>{email}</strong>, a reset link has been sent. It expires in 1 hour.
            </p>
            <button className="text-xs text-navy hover:underline" onClick={() => navigate('/login')}>← Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  )
}
