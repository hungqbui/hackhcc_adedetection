import { useState } from 'react'
import { HeartPulse, Key, User, Mail, Sparkles, AlertCircle } from 'lucide-react'
import { medeaseApi } from '../api'

interface LoginScreenProps {
  onLoginSuccess: (user: { username: string; email: string }) => void
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setErrorMsg('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      if (isRegistering) {
        if (!email.trim()) {
          setErrorMsg('Email address is required for registration.')
          setLoading(false)
          return
        }
        // Register first
        await medeaseApi.auth.register(username, email, password)
        // Login immediately after successful registration
        await medeaseApi.auth.login(username, password)
        localStorage.setItem('medease_username', username)
        localStorage.setItem('medease_email', email)
        onLoginSuccess({ username, email })
      } else {
        // Sign In
        await medeaseApi.auth.login(username, password)
        // Since we don't have a user info endpoint, we save the username
        localStorage.setItem('medease_username', username)
        localStorage.setItem('medease_email', email || `${username}@medease.com`)
        onLoginSuccess({ username, email: email || `${username}@medease.com` })
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your connection or credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Quick helper to bypass for local mock testing
  const handleBypass = () => {
    localStorage.setItem('medease_username', 'Alex Johnson')
    localStorage.setItem('medease_email', 'alex@medease.com')
    onLoginSuccess({ username: 'Alex Johnson', email: 'alex@medease.com' })
  }

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
          <HeartPulse size={24} />
        </div>
        <h2 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {isRegistering ? 'Create your account' : 'Welcome to MedEase'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Your Intelligent Medication Indication & Safety Shield
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-100 dark:border-slate-800/80 shadow-xl rounded-3xl sm:px-10 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl flex gap-2.5 items-start text-xs font-semibold">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alexjohnson"
                  className={inputClass}
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required={isRegistering}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="animate-spin" /> Working…
                </span>
              ) : isRegistering ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering)
                setErrorMsg(null)
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="relative flex items-center justify-center pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800" />
            </div>
            <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Demo Access
            </span>
          </div>

          <button
            onClick={handleBypass}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
          >
            🚀 Launch Local Offline Demo (Bypass Server)
          </button>
        </div>
      </div>
    </div>
  )
}
