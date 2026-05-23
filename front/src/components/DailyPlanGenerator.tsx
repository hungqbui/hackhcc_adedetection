import { useState, useEffect } from 'react'
import {
  Sun, Moon, Coffee, Utensils, Clock, CheckCircle2, AlertTriangle,
  Sparkles, ChevronDown, ChevronUp, Calendar
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
  notes?: string
  times?: string[]
}

interface ScheduledDose {
  id: string
  name: string
  dosage: string
  time: string
  label: string
  reason: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
  taken: boolean
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function addMinutes(timeStr: string, mins: number): string {
  const total = toMinutes(timeStr) + mins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

const DRUG_HINTS: Record<string, string> = {
  metformin: 'Take with meals to minimize nausea and GI upset.',
  ibuprofen: 'Take with food or milk — avoid on an empty stomach.',
  aspirin: 'Take in the morning for optimal cardioprotective effect.',
  lisinopril: 'Best taken in the morning; avoid potassium supplements.',
  warfarin: 'Consistent timing is critical — take at the same time daily.',
  omeprazole: 'Take 30–60 minutes before a meal for best effect.',
  default: 'Take with a full glass of water at the scheduled time.'
}

function getReason(medName: string, freq: string): string {
  const key = medName.toLowerCase()
  for (const drugKey of Object.keys(DRUG_HINTS)) {
    if (drugKey !== 'default' && key.includes(drugKey)) return DRUG_HINTS[drugKey]
  }
  if (freq.toLowerCase().includes('food') || freq.toLowerCase().includes('meal')) {
    return 'Best taken with food to reduce gastrointestinal side effects.'
  }
  return DRUG_HINTS['default']
}

function generateSchedule(
  medications: Medication[],
  wakeTime: string,
  sleepTime: string,
  breakfast: string,
  lunch: string,
  dinner: string
): ScheduledDose[] {
  const doses: ScheduledDose[] = []

  medications.forEach(med => {
    const freq = med.frequency.toLowerCase()
    const reason = getReason(med.name, med.notes || '')

    const push = (time: string) => {
      doses.push({
        id: `${med.id}-${time}`,
        name: med.name,
        dosage: med.dosage,
        time,
        label: formatTime(time),
        reason,
        riskLevel: med.riskLevel,
        taken: false
      })
    }

    if (freq.includes('every 8 hours')) {
      push(addMinutes(wakeTime, 30))
      push(lunch)
      push(addMinutes(sleepTime, -60))
    } else if (freq.includes('twice') || freq.includes('morning/evening')) {
      push(addMinutes(breakfast, 10))
      push(addMinutes(dinner, 10))
    } else if (freq.includes('three times')) {
      push(addMinutes(breakfast, 10))
      push(lunch)
      push(addMinutes(dinner, 10))
    } else if (freq.includes('morning')) {
      push(addMinutes(wakeTime, 30))
    } else if (freq.includes('noon') || freq.includes('lunch')) {
      push(lunch)
    } else if (freq.includes('evening')) {
      push(addMinutes(dinner, 30))
    } else if (freq.includes('bedtime')) {
      push(addMinutes(sleepTime, -30))
    } else {
      push(addMinutes(wakeTime, 30))
    }
  })

  return doses.sort((a, b) => a.time.localeCompare(b.time))
}

export default function DailyPlanGenerator() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [wakeTime, setWakeTime] = useState('07:00')
  const [sleepTime, setSleepTime] = useState('22:30')
  const [breakfast, setBreakfast] = useState('07:30')
  const [lunch, setLunch] = useState('12:30')
  const [dinner, setDinner] = useState('18:30')
  const [generatedDoses, setGeneratedDoses] = useState<ScheduledDose[]>([])
  const [generated, setGenerated] = useState(false)
  const [showInputs, setShowInputs] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const takenKey = `gen_taken_${today}`

  useEffect(() => {
    const stored = localStorage.getItem('medications')
    if (stored) {
      try { setMedications(JSON.parse(stored)) } catch {}
    }
  }, [])

  const handleGenerate = () => {
    const savedTaken: string[] = (() => {
      try { return JSON.parse(localStorage.getItem(takenKey) || '[]') } catch { return [] }
    })()

    const schedule = generateSchedule(medications, wakeTime, sleepTime, breakfast, lunch, dinner)
    const withState = schedule.map(d => ({ ...d, taken: savedTaken.includes(d.id) }))
    setGeneratedDoses(withState)
    setGenerated(true)
    setShowInputs(false)
  }

  const toggleTaken = (id: string) => {
    const updated = generatedDoses.map(d => d.id === id ? { ...d, taken: !d.taken } : d)
    setGeneratedDoses(updated)
    const takenIds = updated.filter(d => d.taken).map(d => d.id)
    localStorage.setItem(takenKey, JSON.stringify(takenIds))
  }

  const takenCount = generatedDoses.filter(d => d.taken).length
  const total = generatedDoses.length

  const inputClass = 'w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow'

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-7">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Personalized Schedule</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Daily Plan Generator
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Enter your daily routine — we'll intelligently schedule your medications around it.
        </p>
      </div>

      {/* Input Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowInputs(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Your Daily Routine</h2>
          </div>
          {showInputs ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {showInputs && (
          <div className="px-6 pb-6 space-y-5 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-4 pt-5">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <Sun size={13} className="text-amber-500" /> Wake-up Time
                </label>
                <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  <Moon size={13} className="text-indigo-500" /> Sleep Time
                </label>
                <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Meal Times</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Coffee size={12} className="text-amber-600" /> Breakfast
                  </label>
                  <input type="time" value={breakfast} onChange={e => setBreakfast(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Utensils size={12} className="text-blue-500" /> Lunch
                  </label>
                  <input type="time" value={lunch} onChange={e => setLunch(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Utensils size={12} className="text-purple-500" /> Dinner
                  </label>
                  <input type="time" value={dinner} onChange={e => setDinner(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={medications.length === 0}
              className="w-full py-3 font-bold text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={16} />
              {medications.length === 0 ? 'No medications registered yet' : 'Generate My Schedule'}
            </button>
          </div>
        )}
      </div>

      {/* Generated Schedule */}
      {generated && (
        <div className="space-y-5">
          {/* Progress bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Today's Progress</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {takenCount} <span className="text-slate-400 font-medium text-lg">/ {total}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{total - takenCount} doses remaining</p>
            </div>
            <div className="flex-1 max-w-48">
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (takenCount / total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <Calendar size={12} className="text-blue-500" />
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-slate-900 dark:text-white text-base mb-5">Generated Timeline</h2>

            <ol className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-0">
              {generatedDoses.map((dose, idx) => {
                const isLast = idx === generatedDoses.length - 1
                return (
                  <li key={dose.id} className={`ml-6 ${isLast ? 'pb-0' : 'pb-5'}`}>
                    <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 transition-colors ${
                      dose.taken ? 'bg-emerald-500' : dose.riskLevel === 'High' ? 'bg-red-500 animate-pulse' : 'bg-blue-400'
                    }`}></span>

                    <SpotlightCard
                      spotlightColor={dose.taken ? 'rgba(16, 185, 129, 0.05)' : dose.riskLevel === 'High' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)'}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        dose.taken
                          ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10 opacity-75'
                          : dose.riskLevel === 'High'
                          ? 'border-red-200 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/5'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs font-bold text-slate-500">{dose.label}</span>
                            {dose.riskLevel === 'High' && !dose.taken && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-500/20">
                                <AlertTriangle size={9} /> High Alert
                              </span>
                            )}
                          </div>
                          <p className={`font-bold text-slate-900 dark:text-white text-base leading-tight ${dose.taken ? 'line-through text-slate-400 dark:text-slate-600' : ''}`}>
                            {dose.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{dose.dosage}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 leading-relaxed bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg px-2.5 py-1.5">
                            💡 {dose.reason}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {dose.taken ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                              <CheckCircle2 size={11} /> Taken
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleTaken(dose.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
                            >
                              Mark taken
                            </button>
                          )}
                        </div>
                      </div>
                    </SpotlightCard>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
