import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const DASHBOARD_ROUTE = {
  client: '/client/dashboard',
  institution_admin: '/institution/overview',
  staff: '/staff/dashboard',
  admin: '/admin/overview',
}

export default function PublicNav({ active }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const linkClass = (name) =>
    `cursor-pointer ${active === name ? 'text-navy font-medium' : 'hover:text-navy'}`

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/home')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-8 h-14 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
        <img src="/logo.png" alt="JIPANGE" className="h-8 w-auto" />
      </div>
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <a className={linkClass('home')} onClick={() => navigate('/home')}>Home</a>
        <a className={linkClass('institutions')} onClick={() => navigate('/institutions')}>Institutions</a>
        <a className={linkClass('about')} onClick={() => navigate('/about')}>About</a>
        <a className={linkClass('contact')} onClick={() => navigate('/contact')}>Contact</a>
      </div>
      <div className="flex items-center gap-2 relative">
        {user ? (
          <div className="relative">
            <button
              className="btn-secondary text-xs px-4 py-1.5 flex items-center gap-1.5"
              onClick={() => setMenuOpen(o => !o)}
            >
              {user.name || 'My Account'} ▾
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    onClick={() => { setMenuOpen(false); navigate(DASHBOARD_ROUTE[user.role] || '/home') }}
                  >
                    My Dashboard
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <button className="btn-secondary text-xs px-4 py-1.5" onClick={() => navigate('/login')}>Login</button>
            <button className="btn-primary text-xs px-4 py-1.5" onClick={() => navigate('/register')}>Register</button>
          </>
        )}
      </div>
    </nav>
  )
}
