import { Contrast, Bell, Trash2 } from 'lucide-react'
import type { AccessibilitySettings } from '../App'

interface SettingsViewProps {
  accessibility: AccessibilitySettings
  onToggleAccessibility: (key: keyof AccessibilitySettings) => void
}

export default function SettingsView({ accessibility, onToggleAccessibility }: SettingsViewProps) {
  const resetAllData = () => {
    localStorage.removeItem('medications')
    Object.keys(localStorage).filter(k => k.startsWith('taken_') || k.startsWith('gen_')).forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  const row = (label: string, value: React.ReactNode, icon?: React.ReactNode) => (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        {label}
      </div>
      <div>{value}</div>
    </div>
  )

  const toggle = (
    label: string,
    key: keyof AccessibilitySettings,
    icon: React.ReactNode,
    activeColor: string
  ) => {
    const on = accessibility[key]
    return (
      <div className="flex items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div className="flex items-center gap-2.5">
          <span className={on ? activeColor : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <button
          onClick={() => onToggleAccessibility(key)}
          aria-pressed={on}
          className={`relative inline-flex h-6 w-11 rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
            on ? 'bg-blue-600 border-blue-500' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-300 mt-0.5 ${
              on ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Preferences</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Adjust visual accessibility toggles, active notifications, and system storage.
        </p>
      </div>

      {/* Accessibility Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Visual Accessibility</h2>
          <p className="text-xs text-slate-400 mt-0.5">Adjust layout contrast variables.</p>
        </div>
        <div className="px-6">
          {toggle('High Contrast Mode', 'highContrast', <Contrast size={15} />, 'text-yellow-500')}
        </div>
      </div>

      {/* Notifications (static) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Alert & Dosing Notifications</h2>
        </div>
        <div className="px-6">
          {row('Dose Reminders', (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              Enabled
            </span>
          ), <Bell size={15} />)}
          {row('Missed Dose Alerts', (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              Enabled
            </span>
          ), <Bell size={15} />)}
          {row('Weekly Reports', (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Disabled
            </span>
          ), <Bell size={15} />)}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/40 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-red-700 dark:text-red-400 text-base flex items-center gap-2">
          <Trash2 size={16} /> Danger Zone
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Permanently erase all medication records and adherence history stored in this browser. This action cannot be undone.
        </p>
        <button
          onClick={resetAllData}
          className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-white dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-800/50 rounded-xl transition-colors"
        >
          Reset All App Data
        </button>
      </div>
    </div>
  )
}
