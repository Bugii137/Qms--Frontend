import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import institutionApi from '../../utils/institutionApi'

const CAT_COLORS = {
  Hospital: 'bg-blue-100 text-blue-700',
  Bank: 'bg-purple-100 text-purple-700',
  Government: 'bg-yellow-100 text-yellow-700',
  University: 'bg-green-100 text-green-700',
  Other: 'bg-gray-100 text-gray-700',
}

function initialsOf(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

function PublicNav() {
  const navigate = useNavigate()
  return (
    <nav className="bg-white border-b border-gray-200 px-8 h-14 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
          <img src="/logo.png" alt="JIPANGE" className="h-8 w-auto" />
        </div>
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <a className="hover:text-navy cursor-pointer" onClick={() => navigate('/home')}>Home</a>
        <a className="text-navy font-medium cursor-pointer">Institutions</a>
        <a className="hover:text-navy cursor-pointer">About</a>
        <a className="hover:text-navy cursor-pointer">Contact</a>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary text-xs px-4 py-1.5" onClick={() => navigate('/login')}>Login</button>
        <button className="btn-primary text-xs px-4 py-1.5" onClick={() => navigate('/register')}>Register</button>
      </div>
    </nav>
  )
}

export default function ListingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [cat, setCat] = useState(searchParams.get('category') || 'All Categories')
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    institutionApi
      .listPublic({ search: search || undefined, category: cat === 'All Categories' ? undefined : cat })
      .then(({ institutions }) => {
        if (!cancelled) setInstitutions(institutions)
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load institutions.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [search, cat])

  return (
    <div className="min-h-screen bg-page font-poppins">
      <PublicNav />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-xs text-gray-500 mb-1">Home / Institutions</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Browse Institutions</h1>
        <p className="text-sm text-gray-500 mb-5">Find and book appointments at registered institutions across Kenya</p>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-1">
          <input className="input flex-1" placeholder="Search institutions..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-36" value={cat} onChange={e => setCat(e.target.value)}>
            {['All Categories','Hospital','Bank','Government','University','Other'].map(c => <option key={c}>{c}</option>)}
          </select>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {loading ? 'Loading…' : `Showing ${institutions.length} results`}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mt-3">{error}</div>
        )}

        {/* Cards grid */}
        <div className="space-y-3 mt-5">
          {!loading && institutions.length === 0 && !error && (
            <div className="text-sm text-gray-500 text-center py-10">No institutions found.</div>
          )}
          {institutions.map(inst => (
            <div key={inst.id} className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-navy rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initialsOf(inst.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm mb-1">{inst.name}</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${CAT_COLORS[inst.category] || CAT_COLORS.Other}`}>{inst.category || 'Other'}</span>
                  {inst.address && <span className="text-xs text-gray-500">📍 {inst.address}</span>}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{inst.description}</p>
                <p className="text-xs text-gray-400 mt-1">{inst.servicesCount ?? 0} services available</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button className="btn-primary text-xs px-4 py-1.5" onClick={() => navigate(`/institutions/${inst.id}`)}>Book Now</button>
                <button className="text-xs text-gray-500 hover:text-navy text-center" onClick={() => navigate(`/institutions/${inst.id}`)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
