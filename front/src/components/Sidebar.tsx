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
  HeartPulse,
  Pill,
  Trash2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { View, Medication } from '../App'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import ElectricBorder from './react-bits/ElectricBorder'

interface SidebarProps {
  collapsed: boolean
  onCollapseToggle: () => void
  onNavigate: (view: View) => void
  activeView: View
  medications: Medication[]
  onDeleteMedication: (id: string) => void
}

const navItems: { view: View; label: string; icon: LucideIcon }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'generator', label: 'Daily Plan', icon: CalendarDays },
  { view: 'medications', label: 'Medications', icon: Pill },
  { view: 'add', label: 'Add Medication', icon: PlusCircle },
  { view: 'ai', label: 'Health AI', icon: Bot },
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
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // GSAP staggered animation for text labels when expanding
    if (!collapsed && sidebarRef.current) {
      const labels = sidebarRef.current.querySelectorAll('.sidebar-label')
      gsap.fromTo(
        labels,
        { yPercent: 50, opacity: 0, rotate: 5 },
        { yPercent: 0, opacity: 1, rotate: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out' }
      )
    }
  }, [collapsed])

  return (
    <aside
      ref={sidebarRef}
      className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 h-screen sticky top-0 transition-all duration-300 z-30 select-none shadow-sm ${collapsed ? 'w-[68px]' : 'w-56'}`}
    >
      {/* Brand Header */}
      <div className={`flex items-center h-16 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'justify-center px-3' : 'justify-between px-4'}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex-shrink-0 p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-600/20">
            <HeartPulse size={18} />
          </div>
          {!collapsed && (
            <span className="sidebar-label font-bold text-base text-slate-800 dark:text-white tracking-tight whitespace-nowrap origin-left">
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
      <nav className={`flex-1 py-4 space-y-1.5 overflow-x-hidden overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="sidebar-label text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 pb-1 origin-left">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.view

          const buttonContent = (
            <button
              onClick={() => onNavigate(item.view)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group text-left ${
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-600/10'
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
                <span className="sidebar-label font-medium text-sm whitespace-nowrap block origin-left">
                  {item.label}
                </span>
              )}
            </button>
          )

          if (isActive) {
            return (
              <ElectricBorder
                key={item.view}
                borderRadius={12}
                color="#3b82f6"
                speed={2}
                chaos={0.1}
                className="w-full rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-200"
              >
                {buttonContent}
              </ElectricBorder>
            )
          }

          return (
            <div key={item.view} className="w-full">
              {buttonContent}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <p className="sidebar-label text-[10px] text-slate-400 dark:text-slate-600 text-center font-medium origin-left">
            MedEase v1.0
          </p>
        </div>
      )}
    </aside>
  )
}
