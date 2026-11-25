import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { label: "Overview",          path: "/admin/overview",      icon: "" },
  { label: "Users",             path: "/admin/users",         icon: "" },
  { label: "Institutions",      path: "/admin/institutions",  icon: "" },
  { label: "Analytics",         path: "/admin/analytics",     icon: "" },
  { label: "Reports",           path: "/admin/reports",       icon: "" },
  { label: "Platform Settings", path: "/admin/settings",      icon: "" },
];

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = (
    <>
      <div className="px-3 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-1.5 mb-0.5">
          <img src="/logo.png" alt="JIPANGE" className="h-5 w-auto" />
        </div>
        <div className="text-gray-400 text-[10px]">Admin Console</div>
      </div>

      <div className="px-3 py-3 border-b border-white/10">
        <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center text-white text-xs font-bold mb-1.5">
          SA
        </div>
        <div className="text-white text-xs font-semibold">System Admin</div>
        <div className="text-gray-400 text-[10px] mt-0.5">Super Administrator</div>
        <div className="mt-1.5">
          <span className="bg-gold-brand text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">Admin</span>
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
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-4 border-t border-white/10 pt-3 space-y-1">
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
        >
          <span>→</span> Sign Out
        </button>
        <div className="px-2 pt-2 text-[9px] text-gray-600">v1.0.0 · Production</div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden font-poppins">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-44 bg-gray-900 flex-col flex-shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-gray-900 flex flex-col flex-shrink-0 z-50">
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
              Menu
            </button>
            <img src="/logo.png" alt="JIPANGE" className="h-7 md:h-8 w-auto" />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              All systems operational
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                SA
              </div>
              <span className="hidden sm:inline text-sm text-gray-700 font-medium">System Admin</span>
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
