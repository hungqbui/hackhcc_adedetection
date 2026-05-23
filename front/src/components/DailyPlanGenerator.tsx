import { useState, useEffect } from 'react'
import {
  Sun, Moon, Coffee, Utensils, Clock, CheckCircle2, AlertTriangle,
  Sparkles, ChevronDown, ChevronUp, Calendar, Pill, RefreshCw
} from 'lucide-react'
import { medeaseApi } from '../api'
import type { GeneratedMasterSchedule } from '../api'
import SpotlightCard from './react-bits/SpotlightCard'
import type { View } from '../App'

interface DailyPlanGeneratorProps {
  onNavigate?: (view: View) => void
}

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
  medId?: string
  name: string
  dosage: string
  time: string
  label: string
  reason: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
  taken: boolean
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function mapBackendScheduleToDoses(
  backendSchedule: GeneratedMasterSchedule,
  medications: Medication[]
): ScheduledDose[] {
  const doses: ScheduledDose[] = []

  backendSchedule.slots.forEach((slot, slotIdx) => {
    slot.medication_names.forEach((medName, medIdx) => {
      // Find matching medication in medications list to get its dosage and other details
      const foundMed = medications.find(m => m.name.toLowerCase() === medName.toLowerCase()) || 
                       medications.find(m => m.name.toLowerCase().includes(medName.toLowerCase())) || 
                       medications.find(m => medName.toLowerCase().includes(m.name.toLowerCase()))

      const dosage = foundMed ? foundMed.dosage : 'As directed'
      const riskLevel = slot.interaction_warnings ? 'High' : 'Safe'
      const reason = slot.instructions + (slot.interaction_warnings ? ` (Caution: ${slot.interaction_warnings})` : '')

      doses.push({
        id: `${medName}-${slot.time}-${slotIdx}-${medIdx}`, // Ensure unique id
        medId: foundMed?.id,
        name: medName,
        dosage,
        time: slot.time,
        label: formatTime(slot.time),
        reason,
        riskLevel,
        taken: false
      })
    })
  })

  // Sort chronologically
  return doses.sort((a, b) => a.time.localeCompare(b.time))
}

export default function DailyPlanGenerator({ onNavigate }: DailyPlanGeneratorProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([])
  const [wakeTime, setWakeTime] = useState('07:00')
  const [sleepTime, setSleepTime] = useState('22:30')
  const [breakfast, setBreakfast] = useState('07:30')
  const [lunch, setLunch] = useState('12:30')
  const [dinner, setDinner] = useState('18:30')
  const [routineNotes, setRoutineNotes] = useState('')
  const [generatedDoses, setGeneratedDoses] = useState<ScheduledDose[]>([])
  const [generalAdvice, setGeneralAdvice] = useState('')
  const [generated, setGenerated] = useState(false)
  const [showInputs, setShowInputs] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const takenKey = `gen_taken_${today}`

  const [persisting, setPersisting] = useState(false)
  const [persistSuccess, setPersistSuccess] = useState(false)

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('medease-schedule-updated', handleUpdate);
    return () => {
      window.removeEventListener('medease-schedule-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchLatestMeds = async () => {
      try {
        const dbMeds = await medeaseApi.medications.list()
        let parsedMeds: Medication[] = []
        if (dbMeds) {
          parsedMeds = dbMeds.map(res => ({
            id: res.id,
            name: res.name,
            dosage: res.dosage,
            frequency: res.frequency,
            riskLevel: res.interactions_to_avoid && res.interactions_to_avoid.length > 0 ? 'High' : 'Safe',
            notes: res.special_instructions || '',
            times: res.optimal_time || res.reminder_times || []
          }))
          setMedications(parsedMeds)
          setSelectedMedIds(parsedMeds.map(m => m.id))
          localStorage.setItem('medications', JSON.stringify(parsedMeds))
        } else {
          const stored = localStorage.getItem('medications')
          if (stored) {
            try {
              parsedMeds = JSON.parse(stored)
              setMedications(parsedMeds)
              setSelectedMedIds(parsedMeds.map((m: any) => m.id))
            } catch {}
          }
        }

        // Try to load the persisted schedule if we have medications
        if (parsedMeds.length > 0) {
          try {
            const savedSchedule = await medeaseApi.medications.getPersistedSchedule()
            if (savedSchedule && savedSchedule.slots && savedSchedule.slots.length > 0) {
              const doses = mapBackendScheduleToDoses(savedSchedule, parsedMeds)
              setGeneratedDoses(doses)
              setGeneralAdvice(savedSchedule.general_advice)
              setGenerated(true)
              setShowInputs(false)
            }
          } catch (e) {
            console.log("No persisted schedule found on mount.")
          }
        }
      } catch (err) {
        console.error("Failed to fetch fresh medications:", err)
      }
    }
    fetchLatestMeds()
  }, [refreshTrigger]);

  const toggleMedSelection = (id: string) => {
    setSelectedMedIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const savedTaken: string[] = (() => {
        try { return JSON.parse(localStorage.getItem(takenKey) || '[]') } catch { return [] }
      })()

      const backendSchedule = await medeaseApi.medications.generateSchedule(
        selectedMedIds,
        wakeTime,
        sleepTime,
        breakfast,
        lunch,
        dinner,
        routineNotes || undefined
      )

      const schedule = mapBackendScheduleToDoses(backendSchedule, medications)
      const withState = schedule.map(d => ({ ...d, taken: savedTaken.includes(d.id) }))
      setGeneratedDoses(withState)
      setGeneralAdvice(backendSchedule.general_advice)
      setGenerated(true)
      setShowInputs(false)
    } catch (err: any) {
      console.error("Failed to generate schedule from backend:", err)
      setError(err?.message || "An unexpected error occurred while generating your schedule.")
    } finally {
      setLoading(false)
    }
  }

  const toggleTaken = (id: string) => {
    const updated = generatedDoses.map(d => d.id === id ? { ...d, taken: !d.taken } : d)
    setGeneratedDoses(updated)
    const takenIds = updated.filter(d => d.taken).map(d => d.id)
    localStorage.setItem(takenKey, JSON.stringify(takenIds))
  }

  const handleTimeChange = (id: string, newTime: string) => {
    setGeneratedDoses(prev =>
      prev.map(d => (d.id === id ? { ...d, time: newTime, label: formatTime(newTime) } : d))
    )
  }

  const handlePersistSchedule = async () => {
    setPersisting(true)
    setPersistSuccess(false)
    setError(null)
    try {
      const slotsMap: Record<string, { medicationNames: string[]; instructions: string[]; warnings: string[] }> = {}
      generatedDoses.forEach(dose => {
        const t = dose.time
        if (!slotsMap[t]) {
          slotsMap[t] = { medicationNames: [], instructions: [], warnings: [] }
        }
        if (!slotsMap[t].medicationNames.includes(dose.name)) {
          slotsMap[t].medicationNames.push(dose.name)
        }
        let inst = dose.reason
        let warn = ''
        if (inst.includes(' (Caution: ')) {
          const parts = inst.split(' (Caution: ')
          inst = parts[0]
          warn = parts[1].replace(')', '')
        }
        if (inst && !slotsMap[t].instructions.includes(inst)) {
          slotsMap[t].instructions.push(inst)
        }
        if (warn && !slotsMap[t].warnings.includes(warn)) {
          slotsMap[t].warnings.push(warn)
        }
      })

      const slots = Object.entries(slotsMap).map(([time, data]) => ({
        time,
        medication_names: data.medicationNames,
        instructions: data.instructions.join(', ') || 'Take medication',
        interaction_warnings: data.warnings.join(', ') || undefined
      }))

      slots.sort((a, b) => a.time.localeCompare(b.time))

      await medeaseApi.medications.persistSchedule(slots, generalAdvice)

      const medTimesMap: Record<string, string[]> = {}
      generatedDoses.forEach(dose => {
        if (dose.medId) {
          if (!medTimesMap[dose.medId]) {
            medTimesMap[dose.medId] = []
          }
          if (!medTimesMap[dose.medId].includes(dose.time)) {
            medTimesMap[dose.medId].push(dose.time)
          }
        }
      })

      const updatePromises = selectedMedIds.map(async medId => {
        const times = medTimesMap[medId] || []
        times.sort()
        return medeaseApi.medications.updateTimes(medId, times)
      })

      const updatedMedsResponse = await Promise.all(updatePromises)

      const updatedMeds = medications.map(med => {
        const foundUpdated = updatedMedsResponse.find(r => r.id === med.id)
        if (foundUpdated) {
          return {
            ...med,
            times: foundUpdated.optimal_time || foundUpdated.reminder_times || []
          }
        }
        return med
      })

      setMedications(updatedMeds)
      localStorage.setItem('medications', JSON.stringify(updatedMeds))
      setPersistSuccess(true)
      setTimeout(() => {
        setPersistSuccess(false)
        if (onNavigate) {
          onNavigate('dashboard')
        }
      }, 1500)
    } catch (err: any) {
      console.error("Failed to persist schedule:", err)
      setError(err?.message || "Failed to persist schedule.")
    } finally {
      setPersisting(false)
    }
  }

  const handleRecreate = () => {
    setGenerated(false)
    setGeneratedDoses([])
    setGeneralAdvice('')
    setShowInputs(true)
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
        <p className="text-slate-600 dark:text-slate-300 text-md mt-1">
          Enter your daily routine — we'll intelligently schedule your medications around it.
        </p>
      </div>

      {/* Active Medications List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Pill size={18} className="text-blue-500" />
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Your Active Medications</h2>
        </div>
        {medications.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">No medications registered yet. Go to Add Medication to register some.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {medications.map(med => {
              const isSelected = selectedMedIds.includes(med.id)
              return (
                <div
                  key={med.id}
                  onClick={() => toggleMedSelection(med.id)}
                  className={`p-3.5 border rounded-xl flex items-start gap-3 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50/45 dark:bg-blue-950/15 border-blue-500/40 shadow-sm shadow-blue-500/5'
                      : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-85'
                  }`}
                >
                  <div className="flex items-center h-5 mt-0.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMedSelection(med.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-950 dark:border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{med.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{med.dosage} — {med.frequency}</p>
                    {med.notes && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic line-clamp-1">{med.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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

            {/* Daily Routine Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-500 mb-1.5">
                Daily Routine Notes
              </label>
              <textarea
                value={routineNotes}
                onChange={e => setRoutineNotes(e.target.value)}
                placeholder="E.g., I sleep later on weekends, take medications with warm milk..."
                rows={2}
                className={`resize-none ${inputClass}`}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={selectedMedIds.length === 0 || loading}
              className="w-full py-3 font-bold text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <Sparkles size={16} />
              )}
              {loading
                ? 'Analyzing & Generating...'
                : medications.length === 0
                ? 'No medications registered yet'
                : selectedMedIds.length === 0
                ? 'Select at least one medication'
                : 'Generate My Schedule'}
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-800/30 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h3 className="font-bold text-sm text-red-800 dark:text-red-400">Scheduling Failed</h3>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center animate-spin">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="h-4 w-48 bg-slate-100 dark:bg-slate-850 rounded-lg animate-pulse"></div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse mt-1">
                ⚡ Gemini AI is analyzing interactions and generating your custom schedule...
              </p>
            </div>
          </div>
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-start pl-3 border-l-2 border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800 -ml-[7px] mt-2"></div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3.5 w-2/3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Schedule */}
      {generated && !loading && (
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

          {/* General Advice Panel */}
          {generalAdvice && (
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-800/30 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
                <Sparkles size={16} className="text-blue-500 animate-pulse" />
                <span>AI Pharmacist Advice</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {generalAdvice}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Generated Timeline</h2>
                <p className="text-xs text-slate-500 mt-0.5">Edit slot times below to customize your schedule, then click persist.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={handleRecreate}
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-sm"
                >
                  <RefreshCw size={14} />
                  Recreate Schedule
                </button>
                <button
                  onClick={handlePersistSchedule}
                  disabled={persisting || generatedDoses.length === 0}
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {persisting ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  {persistSuccess ? 'Schedule Persisted!' : 'Persist Schedule to Dashboard'}
                </button>
              </div>
            </div>

            {routineNotes && (
              <div className="mb-5 p-3.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/20 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">Routine Notes:</span> {routineNotes}
              </div>
            )}

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
                            <input
                              type="time"
                              value={dose.time}
                              disabled={dose.taken}
                              onChange={e => handleTimeChange(dose.id, e.target.value)}
                              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40 w-20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
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
