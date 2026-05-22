import { useState } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  Bot,
  User
} from 'lucide-react'

type View = 'dashboard' | 'add' | 'generator' | 'ai' | 'history' | 'profile'

interface MobileNavProps {
  onNavigate: (view: View) => void
}

export default function MobileNav({ onNavigate }: MobileNavProps) {
  const [activeView, setActiveView] = useState<View>('dashboard')

  const navItems = [
    { view: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'add' as View, label: 'Add', icon: PlusCircle },
    { view: 'generator' as View, label: 'Schedule', icon: CalendarDays },
    { view: 'ai' as View, label: 'AI Advisor', icon: Bot },
    { view: 'profile' as View, label: 'Profile', icon: User }
  ]

  const handleNavigate = (view: View) => {
    setActiveView(view)
    onNavigate(view)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-2 z-40 flex items-center justify-around shadow-2xl shadow-indigo-500/10">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.view
        return (
          <button
            key={item.view}
            onClick={() => handleNavigate(item.view)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
              isActive ? 'text-indigo-400' : 'text-slate-400 active:scale-95'
            }`}
          >
            <Icon
              size={20}
              className={`transition-transform duration-200 ${isActive ? 'scale-110 text-indigo-400' : 'text-slate-400'}`}
            />
            <span className="text-[10px] font-medium tracking-wide">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
