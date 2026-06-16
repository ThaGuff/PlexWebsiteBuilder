import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  Globe,
  History,
  Settings,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../ui/Logo'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'New Build', to: '/build', icon: PlusCircle },
      { label: 'My Sites', to: '/sites', icon: Globe },
      { label: 'Build History', to: '/history', icon: History },
    ],
  },
  {
    group: 'Account',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#121212] border-r border-white/8 transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-white/8">
        {!collapsed && <Logo size={32} showText={true} />}
        {collapsed && <Logo size={32} showText={false} className="mx-auto" />}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] z-10 w-6 h-6 bg-[#1E1E1E] border border-white/10 rounded-full
                   flex items-center justify-center text-white/40 hover:text-lime hover:border-lime/30
                   transition-all duration-200"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-5">
            {!collapsed && (
              <span className="px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 block mb-1.5">
                {group.group}
              </span>
            )}
            {group.items.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-[10px] text-sm font-medium
                   transition-all duration-150 mb-0.5
                   ${isActive
                    ? 'bg-lime/10 text-lime border border-lime/15'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Plan badge */}
      {!collapsed && (
        <div className="mx-3 mb-3">
          <div className="bg-lime/8 border border-lime/15 rounded-[10px] p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={13} className="text-lime" />
              <span className="text-xs font-semibold text-lime uppercase tracking-wide">
                {user?.plan ?? 'Free'} Plan
              </span>
            </div>
            <p className="text-[11px] text-white/40 leading-snug">
              Upgrade for unlimited builds & white-label export
            </p>
          </div>
        </div>
      )}

      {/* User + logout */}
      <div className="border-t border-white/8 px-3 py-3 flex items-center justify-between gap-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-lime/15 border border-lime/25 flex items-center justify-center flex-shrink-0">
              <span className="text-lime font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="p-2 rounded-[8px] text-white/40 hover:text-red-400 hover:bg-red-400/8 transition-all"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
