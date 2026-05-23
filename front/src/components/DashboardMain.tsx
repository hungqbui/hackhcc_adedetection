import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pill,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bell,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  Sparkles,
  X,
  Ban,
  Utensils,
  BookOpen
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'
import StarBorder from './StarBorder'
import type { View } from '../App'
import { medeaseApi } from '../api'
import type { GeneratedMasterSchedule } from '../api'

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
  whenToAvoid?: string
  foodInteractions?: string
  simplifiedExplanation?: string
  times?: string[]
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
  instructions?: string
}

const formatTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function mapBackendScheduleToDoses(
  backendSchedule: GeneratedMasterSchedule,
  medications: Medication[],
  takenIds: string[]
): TodayDose[] {
  const doses: TodayDose[] = []
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  backendSchedule.slots.forEach((slot, slotIdx) => {
    slot.medication_names.forEach((medName, medIdx) => {
      // Find matching medication in medications list to get its dosage and other details
      const foundMed = medications.find(m => m.name.toLowerCase() === medName.toLowerCase()) || 
                       medications.find(m => m.name.toLowerCase().includes(medName.toLowerCase())) || 
                       medications.find(m => medName.toLowerCase().includes(m.name.toLowerCase()))

      const dosage = foundMed ? foundMed.dosage : 'As directed'
      const purpose = foundMed ? foundMed.purpose : 'Supplement'
      const medId = foundMed ? foundMed.id : ''
      const riskLevel = slot.interaction_warnings ? 'High' : (foundMed ? foundMed.riskLevel : 'Safe')
      const instructions = slot.instructions + (slot.interaction_warnings ? ` (Caution: ${slot.interaction_warnings})` : '')

      const id = `${medName}-${slot.time}-${slotIdx}-${medIdx}`
      const [h, m] = slot.time.split(':').map(Number)
      const doseMinutes = h * 60 + m
      let status: 'taken' | 'upcoming' | 'missed' = 'upcoming'
      
      const taken = takenIds.includes(id)
      if (taken) {
        status = 'taken'
      } else if (currentMinutes > doseMinutes + 30) {
        status = 'missed'
      }

      doses.push({
        id,
        medId,
        name: medName,
        dosage,
        purpose,
        time: slot.time,
        label: formatTime(slot.time),
        status,
        taken,
        riskLevel,
        instructions
      })
    })
  })

  // Sort chronologically
  return doses.sort((a, b) => a.time.localeCompare(b.time))
}

interface MedicationInsight {
  whatItIsFor: string
  sideEffects: string
  whenToAvoid: string
  foodInteractions: string
  simplifiedExplanation: string
}



function getInsight(med: Medication): MedicationInsight {
  if (med.simplifiedExplanation) {
    return {
      whatItIsFor: med.purpose || 'Indicated for general wellness support.',
      sideEffects: med.sideEffects?.join(', ') || 'Generally well tolerated. Possible mild stomach upset.',
      whenToAvoid: med.whenToAvoid || 'Consult your doctor if you have chronic medical conditions or take other prescription drugs.',
      foodInteractions: med.foodInteractions || 'Take with a full glass of water. Food interaction profiles depend on other active medications.',
      simplifiedExplanation: med.simplifiedExplanation
    }
  }

  return {
    whatItIsFor: `Indicated for general wellness support.`,
    sideEffects: med.sideEffects?.join(', ') || "Generally well tolerated. Possible mild stomach upset.",
    whenToAvoid: "Consult your doctor if you have chronic medical conditions or take other prescription drugs.",
    foodInteractions: "Take with a full glass of water. Food interaction profiles depend on other active medications.",
    simplifiedExplanation: `${med.name} supports your overall health and body recovery when taken consistently.`
  }
}

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

    if (med.times && med.times.length > 0) {
      med.times.forEach(t => {
        const [h, m] = t.split(':').map(Number)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const hour = h % 12 || 12
        const label = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
        
        addDose({ time: t, label })
      })
      return
    }

    const freq = med.frequency.toLowerCase()

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
  medications: Medication[]
  onFetchMeds: () => void
}

export default function DashboardMain({ onNavigate, medications, onFetchMeds }: DashboardMainProps) {
  const [doses, setDoses] = useState<TodayDose[]>([])
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)
  
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentTimeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const [medPage, setMedPage] = useState(1)
  const medsPerPage = 5
  const totalMedPages = Math.max(1, Math.ceil(medications.length / medsPerPage))

  // Ensure current page is valid when medications count changes
  useEffect(() => {
    if (medPage > totalMedPages) {
      setMedPage(totalMedPages)
    }
  }, [medications.length, totalMedPages, medPage])

  const startIndex = (medPage - 1) * medsPerPage
  const paginatedMedications = medications.slice(startIndex, startIndex + medsPerPage)

  const today = new Date()
  const todayKey = `taken_doses_${today.toISOString().split('T')[0]}`
  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    let active = true

    async function loadSchedule() {
      const takenStored = localStorage.getItem(todayKey);
      const takenIds: string[] = takenStored ? JSON.parse(takenStored) : [];

      if (medications.length === 0) {
        if (active) setDoses([]);
        return;
      }

      try {
        const savedSchedule = await medeaseApi.medications.getPersistedSchedule();
        if (active) {
          if (savedSchedule && savedSchedule.slots && savedSchedule.slots.length > 0) {
            const mapped = mapBackendScheduleToDoses(savedSchedule, medications, takenIds);
            setDoses(mapped);
          } else {
            setDoses(buildTodaySchedule(medications, takenIds));
          }
        }
      } catch (err) {
        console.log("No persisted schedule found or failed to fetch, falling back to local calculation.", err);
        if (active) {
          setDoses(buildTodaySchedule(medications, takenIds));
        }
      }
    }

    loadSchedule();

    return () => {
      active = false;
    };
  }, [medications, todayKey]);

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
    localStorage.removeItem('medications')
    localStorage.removeItem(todayKey)
    onFetchMeds()
  }

  const selectedMedInsight = selectedMed ? getInsight(selectedMed) : null

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
            Manage your medications and track daily adherence. Click any item for AI Medication Insights.
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
              <div
                onClick={() => {
                  const med = medications.find(m => m.id === nextDose.medId)
                  if (med) setSelectedMed(med)
                }}
                className="cursor-pointer group"
              >
                <p className="font-extrabold text-xl leading-tight group-hover:underline flex items-center gap-1">
                  {nextDose.name}
                  <Sparkles size={13} className="text-blue-200" />
                </p>
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

              const doseMinutes = parseInt(dose.time.split(':')[0]) * 60 + parseInt(dose.time.split(':')[1])
              const prevDose = idx > 0 ? doses[idx - 1] : null
              const prevDoseMinutes = prevDose ? parseInt(prevDose.time.split(':')[0]) * 60 + parseInt(prevDose.time.split(':')[1]) : -1
              
              const showCurrentTimeBefore = currentMinutes >= prevDoseMinutes && currentMinutes < doseMinutes

              return (
                <React.Fragment key={dose.id}>
                  {showCurrentTimeBefore && (
                    <li className="relative ml-6 pb-5">
                      <span className="absolute -left-[10px] w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      </span>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="h-px bg-slate-500 dark:bg-slate-700 flex-1 border-dashed"></div>
                        <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">{currentTimeStr} - NOW</span>
                        <div className="h-px bg-slate-500 dark:bg-slate-700 flex-[3] border-dashed"></div>
                      </div>
                    </li>
                  )}
                  <li className={`ml-6 ${isLast ? 'pb-0' : 'pb-5'}`}>
                    {/* Timeline dot */}
                    <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${statusConfig.dot}`}></span>
                    <div
                      onClick={() => {
                        const med = medications.find(m => m.id === dose.medId)
                        if (med) setSelectedMed(med)
                      }}
                      className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{dose.label}</p>
                          <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="break-words">{dose.name}</span>
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 flex items-center gap-0.5 flex-shrink-0">
                              <Sparkles size={8} /> AI Insight
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 break-words whitespace-normal">
                            {dose.dosage} • <span className="font-semibold text-slate-600 dark:text-slate-400">{dose.purpose}</span>
                          </p>
                          {dose.instructions && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                              💡 <span className="italic">{dose.instructions}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
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
                </React.Fragment>
              )
            })}
            
            {/* Show Current Time at the very end if it's past the last dose */}
            {doses.length > 0 && currentMinutes >= (parseInt(doses[doses.length-1].time.split(':')[0]) * 60 + parseInt(doses[doses.length-1].time.split(':')[1])) && (
              <li className="relative ml-6 pt-5">
                <span className="absolute -left-[10px] w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center mt-[-10px]">
                   <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1 border-dashed"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{currentTimeStr} - NOW</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-[3] border-dashed"></div>
                </div>
              </li>
            )}
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

      
      {/* ── AI MEDICATION INSIGHTS MODAL ───────────────────────── */}
      {selectedMed && selectedMedInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-500/10 to-indigo-500/15">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">AI Medication Insights</h3>
              </div>
              <button
                onClick={() => setSelectedMed(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Active Agent</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {selectedMed.name}
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">({selectedMed.dosage})</span>
                </p>
              </div>

              {/* Simplified Explanation Box */}
              <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-1.5 uppercase tracking-wider">
                  <BookOpen size={13} /> Simplified Explanation
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
                  “{selectedMedInsight.simplifiedExplanation}”
                </p>
              </div>

              {/* Insights List */}
              <div className="space-y-4 pt-1">
                {[
                  { label: "What it's for", value: selectedMedInsight.whatItIsFor, icon: Pill, color: 'text-blue-500 bg-blue-500/10' },
                  { label: "Common Side Effects", value: selectedMedInsight.sideEffects, icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
                  { label: "When to Avoid It", value: selectedMedInsight.whenToAvoid, icon: Ban, color: 'text-red-500 bg-red-500/10' },
                  { label: "Food Interactions", value: selectedMedInsight.foodInteractions, icon: Utensils, color: 'text-emerald-500 bg-emerald-500/10' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex gap-3">
                    <div className={`p-2 rounded-xl h-9 w-9 flex-shrink-0 flex items-center justify-center ${color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</h4>
                      <p className="text-slate-700 dark:text-slate-200 text-xs mt-0.5 leading-relaxed">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 flex justify-between gap-3">
              <button
                onClick={() => {
                  setSelectedMed(null)
                  onNavigate('ai')
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 py-2 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                Ask AI Assistant →
              </button>
              <button
                onClick={() => setSelectedMed(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                Close Insights
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
