import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import AIPanel from './components/AIPanel'
import DashboardMain from './components/DashboardMain'
import AddMedication from './components/AddMedication'
import DailyPlanGenerator from './components/DailyPlanGenerator'
import MobileNav from './components/MobileNav'
import MedicationHistory from './components/MedicationHistory'
import ProfileView from './components/ProfileView'
import SettingsView from './components/SettingsView'
import LoginScreen from './components/LoginScreen'
import { Contrast } from 'lucide-react'
import { getAuthToken, removeAuthToken } from './api'

export type View = 'dashboard' | 'add' | 'generator' | 'ai' | 'history' | 'profile' | 'settings'

export interface AccessibilitySettings {
  highContrast: boolean;
}

interface UserSession {
  username: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: false,
  })

  // Check if user is already logged in (has active token + saved identity)
  useEffect(() => {
    const token = getAuthToken()
    const storedUsername = localStorage.getItem('medease_username')
    const storedEmail = localStorage.getItem('medease_email')

    if (token && storedUsername) {
      setUser({
        username: storedUsername,
        email: storedEmail || `${storedUsername}@medease.com`
      })
    }
  }, [])

  const handleLogout = () => {
    removeAuthToken()
    localStorage.removeItem('medease_username')
    localStorage.removeItem('medease_email')
    setUser(null)
    setView('dashboard')
  }

  const toggleAccessibility = (key: keyof AccessibilitySettings) => {
    setAccessibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Build root classNames from accessibility flags
  const rootClasses = [
    'min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-300',
    accessibility.highContrast ? 'high-contrast' : '',
  ].join(' ')

  // If user is not signed in, show the Login/Register landing page
  if (!user) {
    return <LoginScreen onLoginSuccess={setUser} />
  }

  return (
    <div className={rootClasses}>
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed((s) => !s)}
        onNavigate={(v: View) => setView(v)}
        activeView={view}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Right Floating/Header Control for Accessibility */}
        <header className="flex justify-end items-center gap-2 px-4 md:px-8 py-3 bg-transparent z-20">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-2 py-1.5 rounded-xl shadow-sm">
            <button
              onClick={() => toggleAccessibility('highContrast')}
              title="Toggle High Contrast"
              className={`p-1.5 rounded-lg transition-colors ${
                accessibility.highContrast
                  ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Contrast size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pt-2 pb-24 md:pb-8 overflow-y-auto">
          {view === 'dashboard' && <DashboardMain onNavigate={setView} />}
          {view === 'add' && <AddMedication />}
          {view === 'generator' && <DailyPlanGenerator />}
          {view === 'ai' && (
            <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
              <AIPanel mobileMode={true} currentView={view} />
            </div>
          )}
          {view === 'history' && <MedicationHistory />}
          {view === 'profile' && (
            <ProfileView
              user={user}
              onLogout={handleLogout}
              onNavigate={setView}
            />
          )}
          {view === 'settings' && (
            <SettingsView
              accessibility={accessibility}
              onToggleAccessibility={toggleAccessibility}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav onNavigate={(v: View) => setView(v)} activeView={view} />
      </div>

      {/* Desktop AI Panel — always visible on large screens */}
      <AIPanel currentView={view} />
    </div>
  )
}

export default App
