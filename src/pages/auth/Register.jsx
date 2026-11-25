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

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [role, setRole] = useState('client')
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    institutionName: '', category: 'Hospital',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)
  const [applicationEmailSent, setApplicationEmailSent] = useState(true)
  const [clientRegistered, setClientRegistered] = useState(false)
  const [welcomeEmailSent, setWelcomeEmailSent] = useState(false)
  const [resendingWelcomeEmail, setResendingWelcomeEmail] = useState(false)
  const [welcomeEmailError, setWelcomeEmailError] = useState('')
  const [registeredHome, setRegisteredHome] = useState(ROLE_HOME.client)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')

    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (role === 'institution' && !form.institutionName) {
      setError('Please provide your institution name.')
      return
    }

    setLoading(true)
    try {
      const backendRole = role === 'institution' ? 'institution_admin' : 'client'

      const result = await authApi.register({
        fullName: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: backendRole,
        ...(backendRole === 'institution_admin' && {
          institutionName: form.institutionName,
          category: form.category,
        }),
      })

      if (backendRole === 'institution_admin') {
        setApplicationEmailSent(result.emailSent)
        setApplicationSubmitted(true)
        return
      }

      login({ ...result.user, name: result.user.fullName }, result.token)
      setWelcomeEmailSent(Boolean(result.emailSent))
      setRegisteredHome(ROLE_HOME[result.user.role] || '/login')
      setClientRegistered(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resendWelcomeEmail = async () => {
    setResendingWelcomeEmail(true)
    setWelcomeEmailError('')
    try {
      const result = await authApi.resendWelcomeEmail()
      setWelcomeEmailSent(Boolean(result.emailSent))
      if (!result.emailSent) setWelcomeEmailError('Email delivery is still unavailable. Please try again later.')
    } catch (err) {
      setWelcomeEmailError(err.message || 'Could not resend the welcome email.')
    } finally {
      setResendingWelcomeEmail(false)
    }
  }

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row font-poppins md:overflow-hidden">
      {/* Left panel — hidden on mobile */}
      <div className="hidden md:flex w-[45%] bg-navy flex-col items-center justify-center px-10 flex-shrink-0">
        <img src="/logo.png" alt="JIPANGE" className="h-20 w-auto mb-5 cursor-pointer" onClick={() => navigate('/home')} />
        <div className="space-y-3 w-full max-w-xs">
          {['No more physical queues','Real-time appointment updates','Book any institution in seconds'].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-blue-100">
              <span className="w-4 h-4 rounded-full border border-green-brand text-green-brand text-[10px] flex items-center justify-center flex-shrink-0">✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile-only compact header */}
      <div className="md:hidden bg-navy px-6 py-6 flex items-center justify-center">
        <img src="/logo.png" alt="JIPANGE" className="h-12 w-auto cursor-pointer" onClick={() => navigate('/home')} />
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white flex items-center justify-center px-6 sm:px-10 md:px-12 py-8 md:py-0 overflow-y-auto">
        <div className="w-full max-w-sm py-4 md:py-8">
          {clientRegistered ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-navy mb-2">Account created</h1>
              <p className="text-gray-600 text-sm mb-6">
                Your account is ready. You can start using JIPANGE now.
              </p>
              {welcomeEmailSent ? (
                <p role="status" className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg px-3 py-2 mb-4">
                  A welcome email was accepted for delivery to {form.email}. Check your inbox and spam folder.
                </p>
              ) : (
                <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
                  Your account was created, but the welcome email could not be sent.
                  {welcomeEmailError && <p className="mt-1">{welcomeEmailError}</p>}
                  <button
                    className="font-semibold underline mt-2 disabled:opacity-50"
                    onClick={resendWelcomeEmail}
                    disabled={resendingWelcomeEmail}
                  >
                    {resendingWelcomeEmail ? 'Resending…' : 'Try sending it again'}
                  </button>
                </div>
              )}
              <button className="btn-primary w-full py-2.5 text-sm" onClick={() => navigate(registeredHome)}>
                Continue to JIPANGE
              </button>
            </div>
          ) : applicationSubmitted ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-navy mb-2">Application submitted</h1>
              <p className="text-gray-600 text-sm mb-6">
                Your institution request is awaiting super admin approval. You can sign in after your application is approved.
              </p>
              {!applicationEmailSent && (
                <p role="status" className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
                  Your application was saved, but we could not send the confirmation email. The administrator can still review your application.
                </p>
              )}
              <button className="btn-primary w-full py-2.5 text-sm" onClick={() => navigate('/login')}>
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
          <h1 className="text-2xl font-bold text-navy mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-5">Choose your account type to get started</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { key:'client',  icon:'', title:'I am a Client',      sub:'Book appointments at any institution' },
              { key:'institution', icon:'', title:'I am an Institution', sub:'Manage your organisation and appointments' },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${role === r.key ? 'border-green-brand bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-xl mb-2">{r.icon}</div>
                <div className="text-sm font-semibold text-gray-900 mb-0.5">{r.title}</div>
                <div className="text-xs text-gray-500">{r.sub}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {role === 'institution' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Institution Name</label>
                <input className="input" placeholder="City General Hospital" value={form.institutionName} onChange={set('institutionName')} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input" placeholder="Brian Otieno" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input className="input" type="email" placeholder="brian@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input className="input" placeholder="+254 700 000 000" value={form.phone} onChange={set('phone')} />
            </div>
            {role === 'institution' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select className="input" value={form.category} onChange={set('category')}>
                  {['Hospital','Bank','Government','University','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} />
            </div>
          </div>

          <button disabled={loading} className="btn-primary w-full py-2.5 text-sm mt-5" onClick={handleSubmit}>
            {loading ? (role === 'institution' ? 'Submitting application…' : 'Creating account…') : (role === 'institution' ? 'Submit Application' : 'Create Account')}
          </button>
          <p className="text-center text-xs text-gray-500 mt-3">
            Already have an account?{' '}
            <button className="text-green-brand font-medium hover:underline" onClick={() => navigate('/login')}>Sign In</button>
          </p>
          <p className="text-center text-[11px] text-gray-400 mt-2">By registering you agree to our Terms of Service and Privacy Policy</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
