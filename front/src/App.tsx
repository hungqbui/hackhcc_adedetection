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
import MedicationsList from './components/MedicationsList'
import { Contrast } from 'lucide-react'
import { getAuthToken, removeAuthToken, medeaseApi } from './api'

export type View = 'dashboard' | 'add' | 'generator' | 'ai' | 'history' | 'profile' | 'settings' | 'medications'

export interface AccessibilitySettings {
  highContrast: boolean;
}

interface UserSession {
  username: string;
  email: string;
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  purpose: string
  startDate: string
  endDate?: string
  notes?: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
  sideEffects?: string[]
  times?: string[]
  whenToAvoid?: string
  foodInteractions?: string
  simplifiedExplanation?: string
}

const DEFAULT_MEDICATIONS: Medication[] = [
  {
    id: '1', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily (Morning)',
    purpose: 'Hypertension', startDate: '2026-01-15', riskLevel: 'Safe',
    sideEffects: ['Dry cough', 'Dizziness']
  },
  {
    id: '2', name: 'Aspirin', dosage: '81mg', frequency: 'Once daily (Morning)',
    purpose: 'Cardioprotection', startDate: '2026-02-10', riskLevel: 'High',
    sideEffects: ['Stomach irritation', 'Easy bruising'],
    notes: 'Interact warning: Co-administration with Ibuprofen increases gastrointestinal bleeding risks.'
  },
  {
    id: '3', name: 'Ibuprofen', dosage: '400mg', frequency: 'Every 8 hours as needed',
    purpose: 'Joint Pain', startDate: '2026-05-01', riskLevel: 'High',
    sideEffects: ['Stomach ache', 'Nausea'],
    notes: 'Interact warning: May reduce cardioprotective effect of low-dose Aspirin.'
  },
  {
    id: '4', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily (Morning/Evening)',
    purpose: 'Type 2 Diabetes', startDate: '2026-03-01', riskLevel: 'Safe',
    sideEffects: ['Nausea', 'Metabolism changes']
  }
]

function App() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: false,
  })
  const [medications, setMedications] = useState<Medication[]>([])

  const fetchMedications = async () => {
    try {
      const dbMeds = await medeaseApi.medications.list()
      if (dbMeds) {
        const mappedMeds: Medication[] = dbMeds.map(res => ({
          id: res.id,
          name: res.name,
          dosage: res.dosage,
          frequency: res.frequency,
          purpose: res.purpose,
          startDate: new Date(res.created_at).toISOString().split('T')[0],
          notes: res.special_instructions || '',
          riskLevel: res.interactions_to_avoid && res.interactions_to_avoid.length > 0 ? 'High' : 'Safe',
          sideEffects: res.side_effects || [],
          whenToAvoid: res.when_to_avoid || '',
          foodInteractions: res.interactions_to_avoid?.join(', ') || '',
          simplifiedExplanation: res.simplified_explanation || '',
          times: res.optimal_time || res.reminder_times || []
        }))
        setMedications(mappedMeds)
        localStorage.setItem('medications', JSON.stringify(mappedMeds))
        return
      }
    } catch (err) {
      console.error("Failed to fetch medications from backend, falling back to local storage:", err)
    }

    // Fallback to local storage if API call fails
    const stored = localStorage.getItem('medications')
    let meds: Medication[]
    try {
      meds = stored ? JSON.parse(stored) : DEFAULT_MEDICATIONS
    } catch {
      meds = DEFAULT_MEDICATIONS
    }
    if (!stored) localStorage.setItem('medications', JSON.stringify(meds))
    setMedications(meds)
  }

  const handleDeleteMedication = async (id: string) => {
    try {
      await medeaseApi.medications.delete(id)
    } catch (err) {
      console.error("Failed to delete medication from backend:", err)
    }
    const updated = medications.filter(m => m.id !== id)
    setMedications(updated)
    localStorage.setItem('medications', JSON.stringify(updated))
  }

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

  useEffect(() => {
    if (user) {
      fetchMedications()
    } else {
      setMedications([])
    }
  }, [user])

  const handleLogout = () => {
    removeAuthToken()
    localStorage.removeItem('medease_username')
    localStorage.removeItem('medease_email')
    setUser(null)
    setView('dashboard')
  }

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout()
      alert('Your session has expired. Please log in again.')
    }
    window.addEventListener('medease-unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('medease-unauthorized', handleUnauthorized)
    }
  }, [])

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
        medications={medications}
        onDeleteMedication={handleDeleteMedication}
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
          {view === 'dashboard' && (
            <DashboardMain
              onNavigate={setView}
              medications={medications}
              onFetchMeds={fetchMedications}
            />
          )}
          {view === 'medications' && (
            <MedicationsList
              medications={medications}
              onDeleteMedication={handleDeleteMedication}
              onNavigate={setView}
            />
          )}
          {view === 'add' && <AddMedication onMedicationAdded={fetchMedications} />}
          {view === 'generator' && <DailyPlanGenerator onNavigate={setView} />}
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
