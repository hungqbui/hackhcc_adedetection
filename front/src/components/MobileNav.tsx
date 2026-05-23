import { LayoutDashboard, PlusCircle, CalendarDays, Bot, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { View } from '../App'

interface MobileNavProps {
  onNavigate: (view: View) => void
  activeView: View
}

const navItems: { view: View; label: string; icon: LucideIcon }[] = [
  { view: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { view: 'add', label: 'Add', icon: PlusCircle },
  { view: 'generator', label: 'Plan', icon: CalendarDays },
  { view: 'profile', label: 'Profile', icon: User },
]

export default function MobileNav({ onNavigate, activeView }: MobileNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-2 z-40 flex items-center justify-around shadow-2xl shadow-blue-500/5"
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.view
        return (
          <button
            key={item.view}
            id={`mobile-nav-${item.view}`}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 ${isActive
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-400 dark:text-slate-500 active:scale-95'
              }`}
            aria-label={item.label}
          >
            <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}>
              <Icon
                size={19}
                className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}
              />
            </div>
            <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
