import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  Bot,
  History,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  HeartPulse
} from 'lucide-react'
import type { View } from '../App'

interface SidebarProps {
  collapsed: boolean
  onCollapseToggle: () => void
  onNavigate: (view: View) => void
  activeView: View
}

const navItems: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'add', label: 'Add Medication', icon: PlusCircle },
  { view: 'generator', label: 'Daily Plan', icon: CalendarDays },
  { view: 'ai', label: 'AI Assistant', icon: Bot },
  { view: 'history', label: 'History', icon: History },
  { view: 'profile', label: 'Profile', icon: User },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({
  collapsed,
  onCollapseToggle,
  onNavigate,
  activeView,
}: SidebarProps) {
  return (
    <aside
      className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 h-screen sticky top-0 transition-all duration-300 z-30 select-none shadow-sm ${
        collapsed ? 'w-[68px]' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div className={`flex items-center h-16 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'justify-center px-3' : 'justify-between px-4'}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex-shrink-0 p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-600/20">
            <HeartPulse size={18} />
          </div>
          {!collapsed && (
            <span className="font-bold text-base text-slate-800 dark:text-white tracking-tight whitespace-nowrap">
              MedEase
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onCollapseToggle}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand Button when collapsed */}
      {collapsed && (
        <button
          onClick={onCollapseToggle}
          className="mx-auto mt-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Navigation Items */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 pb-1">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.view
          return (
            <button
              key={item.view}
              id={`nav-${item.view}`}
              onClick={() => onNavigate(item.view)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group text-left ${
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : ''
                }`}
              />
              {!collapsed && (
                <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center font-medium">
            MedEase v1.0 · Health Platform
          </p>
        </div>
      )}
    </aside>
  )
}
