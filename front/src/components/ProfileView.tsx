import React, { useState, useEffect } from 'react'
import { User, Phone, ShieldCheck, Activity, LogOut, Settings, History, Save, Link2 } from 'lucide-react'
import type { View } from '../App'
import { medeaseApi } from '../api'

interface ProfileViewProps {
  user: { username: string; email: string; webhook_url?: string }
  onLogout: () => void
  onNavigate: (view: View) => void
}

export default function ProfileView({ user, onLogout, onNavigate }: ProfileViewProps) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await medeaseApi.auth.getProfile()
        if (profile && profile.webhook_url) {
          setWebhookUrl(profile.webhook_url)
        }
      } catch (err) {
        console.error("Failed to load profile details:", err)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveWebhook = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await medeaseApi.auth.updateProfile(webhookUrl)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to update webhook URL.")
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Account</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Patient Profile
          </h1>
          <p className="text-slate-700 dark:text-slate-400 text-md mt-1">
            Review your medical identity credentials and active emergency parameters.
          </p>
        </div>
      </div>

      {/* Patient Profile Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Patient Profile Card</h2>
        </div>
        <div className="px-6">
          {row('Username / Nickname', <span className="text-sm font-semibold text-slate-800 dark:text-white">{user.username}</span>, <User size={15} />)}
          {row('Registered Email', <span className="text-sm font-semibold text-slate-800 dark:text-white">{user.email}</span>, <User size={15} />)}
          {row('AI Interaction Sensitivities', (
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/20">
              Standard Checkers (Active)
            </span>
          ), <ShieldCheck size={15} />)}
          {row('System Sync Connection', (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Secure Link Active
            </span>
          ), <Activity size={15} />)}
        </div>
      </div>

      {/* Discord Webhook Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-1">
          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
            <Link2 size={16} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Discord Webhook Notifications</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Receive your schedule reminders directly as messages in your Discord server.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Discord Webhook URL (Optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
            />
            <button
              onClick={handleSaveWebhook}
              disabled={loading}
              className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <Save size={13} />
              )}
              {success ? 'Saved!' : 'Save Webhook'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-emerald-500 font-semibold">Webhook URL successfully registered! You will receive scheduled dose notifications.</p>}
        </div>
      </div>

      {/* Quick Navigation Links for Mobile & General Usability */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left shadow-sm"
        >
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">App Settings</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Accessibility and alert controls</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left shadow-sm"
        >
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
            <History size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Medication History</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Past adherence and calendar logs</p>
          </div>
        </button>
      </div>

      {/* Log Out Block */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sign Out of MedEase</h3>
          <p className="text-xs text-slate-400 mt-1">Clears security tokens and returns to the lock screen.</p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl border border-red-200 dark:border-red-500/15 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>
    </div>
  )
}
