import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import institutionApi from "../../utils/institutionApi";
import notificationApi from "../../utils/notificationApi";

const NAV_ITEMS = [
  { label: "Dashboard",        path: "/institution/overview",      icon: "⊞" },
  { label: "Appointments",     path: "/institution/appointments",  icon: "📅" },
  { label: "Queue Management", path: "/institution/queue",         icon: "🎟" },
  { label: "Staff Management", path: "/institution/staff",         icon: "👥" },
  { label: "Reports",          path: "/institution/reports",       icon: "📈" },
  { label: "Settings",         path: "/institution/settings",      icon: "⚙️" },
];

const STATUS_BADGE = {
  active: "bg-green-brand text-white",
  pending: "bg-yellow-400 text-yellow-900",
  suspended: "bg-red-400 text-white",
};
const STATUS_LABEL = { active: "Active", pending: "Pending Approval", suspended: "Suspended" };

function initialsOf(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

export default function InstitutionLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    institutionApi.getMine().then(({ institution }) => setInstitution(institution)).catch(() => {});
    notificationApi.listMine(true).then(({ notifications }) => setUnreadCount(notifications.length)).catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const SidebarContent = (
    <>
      <div className="px-3 pt-4 pb-3 border-b border-white/10">
        <div className="w-9 h-9 bg-green-brand rounded-lg flex items-center justify-center text-white text-xs font-bold mb-2">
          {initialsOf(institution?.name)}
        </div>
        <div className="text-white text-xs font-semibold leading-tight">
          {institution?.name || "…"}
        </div>
        <div className="text-blue-300 text-[10px] mt-0.5">Institution Admin</div>
        <div className="mt-2">
          {institution && (
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[institution.status] || STATUS_BADGE.pending}`}>
              {STATUS_LABEL[institution.status] || institution.status}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-xs transition-colors text-left
                ${active
                  ? "bg-white/10 text-white font-semibold border-l-4 border-green-brand pl-1"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-4 border-t border-white/10 pt-3 space-y-1">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          ❓ Help &amp; Support
        </button>
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-300 hover:text-red-200 hover:bg-white/10 rounded-lg transition-colors"
        >
          <span>→</span> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden font-poppins">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-44 bg-navy flex-col flex-shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-navy flex flex-col flex-shrink-0 z-50">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-12 flex items-center justify-between px-3 md:px-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <img src="/logo.png" alt="JIPANGE" className="h-7 md:h-8 w-auto" />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              className="relative p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => { setNotifOpen(!notifOpen); navigate("/institution/appointments"); }}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gold-brand text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm text-gray-700 font-medium">{user?.name || "…"}</span>
              <span className="hidden sm:inline text-gray-400 text-xs">▾</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-page">
          {children}
        </main>
      </div>
    </div>
  );
}
