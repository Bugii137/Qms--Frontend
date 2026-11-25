import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard",       path: "/staff/dashboard",     icon: "⊞" },
  { label: "My Appointments", path: "/staff/appointments",  icon: "" },
  { label: "Notifications",   path: "/staff/notifications", icon: "" },
  { label: "Profile & Settings", path: "/staff/profile",    icon: "" },
];

const ACCESS_BADGE = {
  "View Only":            "bg-gray-100 text-gray-600",
  "Manage Appointments":  "bg-green-100 text-green-700",
  "Full Access":          "bg-navy/10 text-navy",
};

export default function StaffLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "ST";

  const accessLevel = user?.accessLevel || "View Only";
  const badgeClass = ACCESS_BADGE[accessLevel] || ACCESS_BADGE["View Only"];

  const SidebarContent = (
    <>
      <div className="px-3 pt-4 pb-3 border-b border-white/10">
        <div className="w-9 h-9 bg-green-brand rounded-full flex items-center justify-center text-white text-xs font-bold mb-2">
          {initials}
        </div>
        <div className="text-white text-xs font-semibold leading-tight">
          {user?.name || "Staff Member"}
        </div>
        <div className="text-blue-300 text-[10px] mt-0.5">
          {user?.institution || "Institution"}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <span className="bg-white/10 text-blue-100 text-[9px] font-medium px-2 py-0.5 rounded-full w-fit">
            {user?.assignedService || "Unassigned"}
          </span>
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full w-fit ${badgeClass}`}>
            {accessLevel}
          </span>
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

      <div className="px-2 pb-4 border-t border-white/10 pt-3">
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
        <header className="bg-white border-b border-gray-200 h-12 flex items-center justify-between px-3 md:px-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" onClick={() => setMobileOpen(true)}>
              Menu
            </button>
            <img src="/logo.png" alt="JIPANGE" className="h-7 md:h-8 w-auto" />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              aria-label="Notifications"
              className="relative p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <span className="absolute -top-0.5 -right-0.5 bg-gold-brand text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                2
              </span>
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 bg-green-brand rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm text-gray-700 font-medium">{user?.name || "Staff"}</span>
              <span className="hidden sm:inline text-gray-400 text-xs">▾</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-page">{children}</main>
      </div>
    </div>
  );
}
