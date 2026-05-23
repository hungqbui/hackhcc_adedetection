import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pill,
  RefreshCw,
  ChevronRight,
  Bell,
  ShieldCheck,
  TrendingUp,
  Lightbulb
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'
import StarBorder from './react-bits/StarBorder'
import type { View } from '../App'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  purpose: string
  startDate: string
  notes?: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
  sideEffects?: string[]
}

interface TodayDose {
  id: string
  medId: string
  name: string
  dosage: string
  purpose: string
  time: string     // e.g. "08:00"
  label: string    // e.g. "8:00 AM"
  status: 'taken' | 'upcoming' | 'missed'
  taken: boolean
  riskLevel: 'Safe' | 'Moderate' | 'High'
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

function buildTodaySchedule(medications: Medication[], takenIds: string[]): TodayDose[] {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const timeMap: Record<string, { time: string; label: string }[]> = {
    'morning': [{ time: '08:00', label: '8:00 AM' }],
    'noon': [{ time: '12:00', label: '12:00 PM' }],
    'evening': [{ time: '18:00', label: '6:00 PM' }],
    'bedtime': [{ time: '21:00', label: '9:00 PM' }],
  }

  const doses: TodayDose[] = []

  medications.forEach(med => {
    const freq = med.frequency.toLowerCase()

    const addDose = (slot: { time: string; label: string }) => {
      const id = `${med.id}-${slot.time}`
      const [h, m] = slot.time.split(':').map(Number)
      const doseMinutes = h * 60 + m
      let status: 'taken' | 'upcoming' | 'missed' = 'upcoming'
      if (takenIds.includes(id)) {
        status = 'taken'
      } else if (currentMinutes > doseMinutes + 30) {
        status = 'missed'
      }

      doses.push({
        id,
        medId: med.id,
        name: med.name,
        dosage: med.dosage,
        purpose: med.purpose || 'Supplement',
        time: slot.time,
        label: slot.label,
        status,
        taken: takenIds.includes(id),
        riskLevel: med.riskLevel
      })
    }

    if (freq.includes('every 8 hours')) {
      addDose(timeMap.morning[0])
      addDose(timeMap.noon[0])
      addDose(timeMap.bedtime[0])
    } else if (freq.includes('twice daily') || freq.includes('morning/evening')) {
      addDose(timeMap.morning[0])
      addDose(timeMap.evening[0])
    } else if (freq.includes('three times')) {
      addDose(timeMap.morning[0])
      addDose(timeMap.noon[0])
      addDose(timeMap.evening[0])
    } else if (freq.includes('morning')) {
      addDose(timeMap.morning[0])
    } else if (freq.includes('noon')) {
      addDose(timeMap.noon[0])
    } else if (freq.includes('evening')) {
      addDose(timeMap.evening[0])
    } else if (freq.includes('bedtime')) {
      addDose(timeMap.bedtime[0])
    }
  })

  return doses.sort((a, b) => a.time.localeCompare(b.time))
}

interface DashboardMainProps {
  onNavigate: (view: View) => void
}

export default function DashboardMain({ onNavigate }: DashboardMainProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [doses, setDoses] = useState<TodayDose[]>([])

  const today = new Date()
  const todayKey = `taken_doses_${today.toISOString().split('T')[0]}`
  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    const stored = localStorage.getItem('medications')
    let meds: Medication[]
    try {
      meds = stored ? JSON.parse(stored) : DEFAULT_MEDICATIONS
    } catch {
      meds = DEFAULT_MEDICATIONS
    }
    if (!stored) localStorage.setItem('medications', JSON.stringify(meds))
    setMedications(meds)

    const takenStored = localStorage.getItem(todayKey)
    const takenIds: string[] = takenStored ? JSON.parse(takenStored) : []
    setDoses(buildTodaySchedule(meds, takenIds))
  }, [])

  const markTaken = (doseId: string) => {
    const updated = doses.map(d =>
      d.id === doseId ? { ...d, taken: true, status: 'taken' as const } : d
    )
    setDoses(updated)
    const takenIds = updated.filter(d => d.taken).map(d => d.id)
    localStorage.setItem(todayKey, JSON.stringify(takenIds))
  }

  const takenCount = doses.filter(d => d.taken).length
  const totalCount = doses.length
  const missedCount = doses.filter(d => d.status === 'missed').length
  const progress = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0
  const nextDose = doses.find(d => d.status === 'upcoming')
  const hasADEWarning = medications.some(m => m.name.toLowerCase().includes('aspirin')) &&
    medications.some(m => m.name.toLowerCase().includes('ibuprofen'))

  const resetToDefault = () => {
    localStorage.setItem('medications', JSON.stringify(DEFAULT_MEDICATIONS))
    setMedications(DEFAULT_MEDICATIONS)
    const takenIds: string[] = []
    setDoses(buildTodaySchedule(DEFAULT_MEDICATIONS, takenIds))
    localStorage.removeItem(todayKey)
  }

  return (
    <div className="space-y-7 pb-16 max-w-5xl mx-auto">

      {/* ── TODAY OVERVIEW HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Today's Overview</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {todayLabel}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your medications and track daily adherence.
          </p>
        </div>
        <button
          onClick={resetToDefault}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw size={13} /> Reset Data
        </button>
      </div>

      {/* ── PROGRESS + NEXT DOSE ROW ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Progress ring card */}
        <div className="sm:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-5">
          {/* SVG Ring */}
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-slate-800" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="currentColor" strokeWidth="7"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className={`text-blue-500 transition-all duration-700`}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-black text-lg text-slate-900 dark:text-white">
              {progress}%
            </span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Medications Taken</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {takenCount} <span className="text-slate-400 font-medium text-xl">/ {totalCount}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {missedCount > 0
                ? <span className="text-red-500 font-semibold">{missedCount} missed dose{missedCount > 1 ? 's' : ''}</span>
                : <span className="text-emerald-500 font-semibold">No missed doses</span>}
              {' '}· {totalCount - takenCount - missedCount} remaining
            </p>
          </div>
        </div>

        {/* Next upcoming */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md shadow-blue-500/20 flex flex-col justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2 flex items-center gap-1.5">
            <Clock size={12} /> Next Upcoming
          </p>
          {nextDose ? (
            <>
              <div>
                <p className="font-extrabold text-xl leading-tight">{nextDose.name}</p>
                <p className="text-blue-200 text-xs mt-0.5 font-semibold tracking-wide uppercase">{nextDose.purpose}</p>
                <p className="text-blue-200 text-sm mt-1">{nextDose.dosage} · {nextDose.label}</p>
              </div>
              <button
                onClick={() => markTaken(nextDose.id)}
                className="mt-3 w-full py-2 text-xs font-bold bg-white/15 hover:bg-white/25 rounded-xl transition-colors backdrop-blur"
              >
                Mark as taken
              </button>
            </>
          ) : (
            <p className="text-blue-200 text-sm font-medium mt-2">All doses complete! 🎉</p>
          )}
        </div>
      </div>

      {/* ── ADE WARNING ─────────────────────────────────────── */}
      {hasADEWarning && (
        <StarBorder as="div" color="#ef4444" speed="4s" className="w-full text-left">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-red-500/20 rounded-xl mt-0.5 flex-shrink-0">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Critical Drug Interaction Detected</p>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-3xl">
                <strong>Aspirin</strong> + <strong>Ibuprofen</strong> co-administration increases gastrointestinal bleeding risk and reduces cardioprotective effects. Consult your physician before continuing.
              </p>
            </div>
          </div>
        </StarBorder>
      )}

      {/* ── TODAY'S VERTICAL TIMELINE ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Today's Schedule</h2>
          <button
            onClick={() => onNavigate('generator')}
            className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Full Plan <ChevronRight size={13} />
          </button>
        </div>

        {doses.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Pill size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold">No medications scheduled</p>
            <button onClick={() => onNavigate('add')} className="mt-3 text-xs text-blue-500 hover:underline font-semibold">Add a medication →</button>
          </div>
        ) : (
          <ol className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-0">
            {doses.map((dose, idx) => {
              const isLast = idx === doses.length - 1
              const statusConfig = {
                taken: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', label: 'Taken' },
                upcoming: { dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20', label: 'Upcoming' },
                missed: { dot: 'bg-red-500', badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20', label: 'Missed' },
              }[dose.status]

              return (
                <li key={dose.id} className={`ml-6 ${isLast ? 'pb-0' : 'pb-5'}`}>
                  {/* Timeline dot */}
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${statusConfig.dot}`}></span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{dose.label}</p>
                        <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{dose.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dose.dosage} • <span className="font-semibold text-slate-600 dark:text-slate-400">{dose.purpose}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.badge}`}>
                        {dose.status === 'taken' && <CheckCircle2 size={11} />}
                        {dose.status === 'missed' && <AlertTriangle size={11} />}
                        {dose.status === 'upcoming' && <Clock size={11} />}
                        {statusConfig.label}
                      </span>
                      {dose.status !== 'taken' && (
                        <button
                          onClick={() => markTaken(dose.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                        >
                          Mark taken
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* ── SMART SUGGESTIONS ────────────────────────────────── */}
      <div>
        <h2 className="font-extrabold text-slate-900 dark:text-white text-lg mb-4">Smart Suggestions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.08)" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Bell size={16} /></div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Missed Doses</h3>
            </div>
            {missedCount > 0 ? (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  You have <strong className="text-red-500">{missedCount} missed dose{missedCount > 1 ? 's' : ''}</strong> today. Consult your provider before doubling up on medications.
                </p>
                <button onClick={() => onNavigate('ai')} className="mt-3 text-xs text-red-500 font-bold hover:underline">Ask AI assistant →</button>
              </>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">No missed doses today. 🎉 Keep it up!</p>
            )}
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.08)" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><ShieldCheck size={16} /></div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Refill Reminder</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Ibuprofen</strong> started on May 1st. At current frequency you may need a refill within the next 10 days.
            </p>
            <button onClick={() => onNavigate('add')} className="mt-3 text-xs text-amber-500 font-bold hover:underline">Manage medications →</button>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.08)" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Lightbulb size={16} /></div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Adherence Tip</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Taking <strong>Metformin</strong> with meals significantly reduces nausea. Pair with breakfast and dinner for best tolerance.
            </p>
            <button onClick={() => onNavigate('generator')} className="mt-3 text-xs text-blue-500 font-bold hover:underline">Generate smart plan →</button>
          </SpotlightCard>
        </div>
      </div>

      {/* ── ALL MEDICATIONS QUICK VIEW ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Active Medications</h2>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <TrendingUp size={13} className="text-blue-500" />
            {medications.length} registered
          </div>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {medications.map(med => (
            <div key={med.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
              <div className={`flex-shrink-0 p-2 rounded-xl ${
                med.riskLevel === 'High' ? 'bg-red-500/10 text-red-500'
                  : med.riskLevel === 'Moderate' ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                <Pill size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{med.name}</p>
                <p className="text-xs text-slate-500 truncate">{med.dosage} · {med.frequency} · <span className="font-semibold">{med.purpose}</span></p>
              </div>
              <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                med.riskLevel === 'High'
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                  : med.riskLevel === 'Moderate'
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
              }`}>
                {med.riskLevel}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
