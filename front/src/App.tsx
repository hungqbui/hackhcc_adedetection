import { useState } from 'react'
import Sidebar from './components/Sidebar.tsx'
import AIPanel from './components/AIPanel.tsx'
import DashboardMain from './components/DashboardMain.tsx'
import AddMedication from './components/AddMedication.tsx'
import DailyPlanGenerator from './components/DailyPlanGenerator.tsx'
import MobileNav from './components/MobileNav.tsx'

type View = 'dashboard' | 'add' | 'generator' | 'ai' | 'history' | 'profile'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-300">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed((s) => !s)}
        onNavigate={(v: View) => setView(v)}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
          {view === 'dashboard' && <DashboardMain />}
          {view === 'add' && <AddMedication />}
          {view === 'generator' && <DailyPlanGenerator />}
          {view === 'ai' && (
            <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
              <AIPanel logo="🤖" mobileMode={true} />
            </div>
          )}
          {view === 'history' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-3 margin-0">Medication Adherence History</h2>
              <div className="grid grid-cols-7 gap-2 max-w-lg">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center font-bold text-xs text-slate-400 py-1">{day}</div>
                ))}
                {Array.from({ length: 31 }).map((_, idx) => {
                  const dayNum = idx + 1
                  const isTaken = dayNum % 5 !== 0 && dayNum % 7 !== 0
                  return (
                    <div
                      key={idx}
                      className={`h-10 flex items-center justify-center rounded-lg text-sm font-semibold border ${
                        isTaken
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-450'
                      }`}
                    >
                      {dayNum}
                    </div>
                  )
                })}
              </div>
              <p className="text-slate-400 text-xs mt-4">Showing adherence calendar logs for May 2026.</p>
            </div>
          )}
          {view === 'profile' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-3 margin-0">Profile & Patient Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-sm text-slate-600 dark:text-slate-400">Patient Name</span>
                  <span className="font-bold text-sm">Alex Johnson</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-sm text-slate-600 dark:text-slate-400">Emergency Contact</span>
                  <span className="font-bold text-sm text-indigo-500 dark:text-indigo-400">+1 (555) 321-7654</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-sm text-slate-600 dark:text-slate-400">AI Warning Sensitivity</span>
                  <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500/20 text-indigo-400 rounded">Standard (High + Mod)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-sm text-slate-600 dark:text-slate-400">System Integration Status</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" /> Connected
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>

        <MobileNav onNavigate={(v: View) => setView(v)} />
      </div>

      <AIPanel logo="🤖" />
    </div>
  )
}

export default App
