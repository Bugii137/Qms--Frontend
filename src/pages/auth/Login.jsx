import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import authApi from '../../utils/authApi'

const ROLE_HOME = {
  admin: '/admin/overview',
  institution_admin: '/institution/overview',
  staff: '/staff/dashboard',
  client: '/client/dashboard',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authApi.login({ email, password })
      // Backend returns `fullName`; the rest of the app reads `user.name`.
      login({ ...user, name: user.fullName }, token)
      navigate(ROLE_HOME[user.role] || '/login')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row font-poppins md:overflow-hidden">
      {/* Left panel — hidden on mobile, shown on md+ */}
      <div className="hidden md:flex w-[45%] bg-navy flex-col items-center justify-center px-10 flex-shrink-0">
        <img src="/logo.png" alt="JIPANGE" className="h-20 w-auto mb-5 cursor-pointer" onClick={() => navigate('/home')} />
        <div className="space-y-3 w-full max-w-xs mb-8">
          {['No more physical queues','Real-time appointment updates','Book any institution in seconds'].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-blue-100">
              <span className="w-4 h-4 rounded-full border border-green-brand text-green-brand text-[10px] flex items-center justify-center flex-shrink-0">✓</span>
              {f}
            </div>
          ))}
        </div>
        <div className="w-full max-w-xs h-28 bg-white/10 rounded-xl flex items-center justify-center text-blue-300 text-xs">
          Auth Illustration
        </div>
      </div>

      {/* Mobile-only compact header */}
      <div className="md:hidden bg-navy px-6 py-6 flex items-center justify-center">
        <img src="/logo.png" alt="JIPANGE" className="h-12 w-auto cursor-pointer" onClick={() => navigate('/home')} />
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white flex items-center justify-center px-6 sm:px-10 md:px-12 py-8 md:py-0">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-navy mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-7">Sign in to your Jipange account</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm" onClick={() => setShowPw(!showPw)}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              <div className="text-right mt-1">
                <button type="button" className="text-green-brand text-xs hover:underline" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-5">
            Don't have an account?{' '}
            <button className="text-green-brand font-medium hover:underline" onClick={() => navigate('/register')}>Register here</button>
          </p>
        </div>
      </div>
    </div>
  )
}
