import { useState } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  Bot,
  History,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'

type View = 'dashboard' | 'add' | 'generator' | 'ai' | 'history' | 'profile'

interface SidebarProps {
  collapsed: boolean
  onCollapseToggle: () => void
  onNavigate: (view: View) => void
}

export default function Sidebar({ collapsed, onCollapseToggle, onNavigate }: SidebarProps) {
  const [activeView, setActiveView] = useState<View>('dashboard')

  const navItems = [
    { view: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'add' as View, label: 'Add Medication', icon: PlusCircle },
    { view: 'generator' as View, label: 'Daily Schedule', icon: CalendarDays },
    { view: 'ai' as View, label: 'AI Advisor', icon: Bot },
    { view: 'history' as View, label: 'History', icon: History },
    { view: 'profile' as View, label: 'Profile', icon: User }
  ]

  const handleNavigate = (view: View) => {
    setActiveView(view)
    onNavigate(view)
  }

  return (
    <aside
      className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 text-slate-200 h-screen sticky top-0 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 p-2 bg-indigo-600 rounded-lg text-white">
            <ShieldAlert size={20} className="animate-pulse" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              MedEase
            </span>
          )}
        </div>
        <button
          onClick={onCollapseToggle}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.view
          return (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-left ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && (
                <span className="font-medium text-sm tracking-wide whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500 text-center">
          MedEase v1.0
        </div>
      )}
    </aside>
  )
}
