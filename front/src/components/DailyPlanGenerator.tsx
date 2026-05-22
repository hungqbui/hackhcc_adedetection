import { useState, useEffect } from 'react'
import {
  Sun,
  CloudSun,
  Moon,
  Compass,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Award
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  purpose: string
  startDate: string
  notes?: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
}

interface DoseItem {
  id: string
  medId: string
  name: string
  dosage: string
  frequency: string
  timeOfDay: 'Morning' | 'Noon' | 'Evening' | 'Bedtime'
  taken: boolean
}

export default function DailyPlanGenerator() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [doses, setDoses] = useState<DoseItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('medications')
    let meds: Medication[] = []
    if (stored) {
      try {
        meds = JSON.parse(stored)
      } catch (e) {
        console.error(e)
      }
    }
    setMedications(meds)

    // Generate daily doses based on frequency
    const dailyDoses: DoseItem[] = []
    meds.forEach((med) => {
      const freq = med.frequency.toLowerCase()
      if (freq.includes('morning')) {
        dailyDoses.push(createDose(med, 'Morning'))
      }
      if (freq.includes('noon')) {
        dailyDoses.push(createDose(med, 'Noon'))
      }
      if (freq.includes('evening')) {
        dailyDoses.push(createDose(med, 'Evening'))
      }
      if (freq.includes('bedtime')) {
        dailyDoses.push(createDose(med, 'Bedtime'))
      }
      if (freq.includes('twice daily')) {
        dailyDoses.push(createDose(med, 'Morning'))
        dailyDoses.push(createDose(med, 'Evening'))
      }
      if (freq.includes('three times daily')) {
        dailyDoses.push(createDose(med, 'Morning'))
        dailyDoses.push(createDose(med, 'Noon'))
        dailyDoses.push(createDose(med, 'Evening'))
      }
      if (freq.includes('every 8 hours')) {
        dailyDoses.push(createDose(med, 'Morning'))
        dailyDoses.push(createDose(med, 'Noon'))
        dailyDoses.push(createDose(med, 'Bedtime'))
      }
    })

    // Restore taken status if saved today in localstorage
    const today = new Date().toISOString().split('T')[0]
    const savedTakenKey = `taken_doses_${today}`
    const savedTaken = localStorage.getItem(savedTakenKey)
    if (savedTaken) {
      try {
        const takenIds = JSON.parse(savedTaken) as string[]
        dailyDoses.forEach((dose) => {
          if (takenIds.includes(dose.id)) {
            dose.taken = true
          }
        })
      } catch (e) {
        console.error(e)
      }
    }

    setDoses(dailyDoses)
  }, [])

  const createDose = (med: Medication, timeOfDay: 'Morning' | 'Noon' | 'Evening' | 'Bedtime'): DoseItem => {
    return {
      id: `${med.id}-${timeOfDay}`,
      medId: med.id,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      timeOfDay,
      taken: false
    }
  }

  const toggleDose = (id: string) => {
    const updated = doses.map((d) => (d.id === id ? { ...d, taken: !d.taken } : d))
    setDoses(updated)

    // Save taken states for today
    const today = new Date().toISOString().split('T')[0]
    const savedTakenKey = `taken_doses_${today}`
    const takenIds = updated.filter((d) => d.taken).map((d) => d.id)
    localStorage.setItem(savedTakenKey, JSON.stringify(takenIds))
  }

  const totalDosesCount = doses.length
  const takenDosesCount = doses.filter((d) => d.taken).length
  const adherencePercent = totalDosesCount > 0 ? Math.round((takenDosesCount / totalDosesCount) * 100) : 0

  const timeSlots = [
    { time: 'Morning', label: 'Morning (07:00 AM - 10:00 AM)', icon: Sun, color: 'text-amber-500 bg-amber-500/10' },
    { time: 'Noon', label: 'Noon (12:00 PM - 02:00 PM)', icon: CloudSun, color: 'text-indigo-400 bg-indigo-450/10' },
    { time: 'Evening', label: 'Evening (05:00 PM - 07:00 PM)', icon: Compass, color: 'text-indigo-600 bg-indigo-600/10' },
    { time: 'Bedtime', label: 'Bedtime (09:00 PM - 11:00 PM)', icon: Moon, color: 'text-purple-400 bg-purple-500/10' }
  ]

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight margin-0 flex items-center gap-3">
            Daily Intake Schedule
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Stay on track, log your doses, and review specific warnings for each time block.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 rounded-lg">
          <Calendar size={14} className="text-indigo-500" />
          <span>Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Adherence Card */}
      <div className="bg-slate-900 border border-slate-850 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md shadow-indigo-600/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={24} />
            <h3 className="font-extrabold text-lg">Daily Medication Adherence</h3>
          </div>
          <p className="text-slate-400 text-sm max-w-lg">
            Ensure you check off your medications as you take them. Complete adherence ensures maximum effectiveness and reduces drug-drug instability.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-slate-500 text-xs uppercase tracking-wider block">Completed</span>
            <span className="text-3xl font-black text-white">{takenDosesCount} / {totalDosesCount}</span>
          </div>
          {/* Adherence dial */}
          <div className="relative h-20 w-20 flex items-center justify-center bg-slate-850 rounded-full border-4 border-indigo-600/20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 transition-all duration-300" style={{ clipPath: `polygon(50% 50%, -50% -50%, ${adherencePercent}% -50%)` }}></div>
            <span className="font-black text-lg text-white z-10">{adherencePercent}%</span>
          </div>
        </div>
      </div>

      {/* Timeline slots */}
      {totalDosesCount === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Calendar className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={48} />
          <h3 className="text-slate-700 dark:text-slate-300 font-bold">No medications scheduled</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Your medication schedule is empty. Add medication profiles in the dashboard or Medication tab to generate your daily plan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {timeSlots.map((slot) => {
            const SlotIcon = slot.icon
            const slotDoses = doses.filter((d) => d.timeOfDay === slot.time)

            if (slotDoses.length === 0) return null

            return (
              <div key={slot.time} className="relative grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Time Indicator */}
                <div className="md:col-span-3 flex items-center md:flex-col md:items-start gap-3 md:sticky md:top-24 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md py-2 md:py-0">
                  <div className={`p-2 rounded-xl ${slot.color}`}>
                    <SlotIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-none">
                      {slot.time}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                      {slot.label.split(' ')[1]} {slot.label.split(' ')[2]}
                    </span>
                  </div>
                </div>

                {/* Dose list */}
                <div className="md:col-span-9 space-y-3">
                  {slotDoses.map((dose) => {
                    const originalMed = medications.find(m => m.id === dose.medId)
                    const isHighRisk = originalMed?.riskLevel === 'High'
                    const hasNotes = originalMed?.notes && originalMed.notes.includes('Interact warning')

                    return (
                      <SpotlightCard
                        key={dose.id}
                        spotlightColor={dose.taken ? 'rgba(16, 185, 129, 0.05)' : isHighRisk ? 'rgba(239, 68, 68, 0.05)' : 'rgba(99, 102, 241, 0.08)'}
                        className={`transition-all duration-300 border p-5 ${
                          dose.taken
                            ? 'border-emerald-500/20 bg-emerald-500/5 opacity-70'
                            : isHighRisk
                            ? 'border-red-500/20 bg-red-500/5'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={dose.taken}
                              onChange={() => toggleDose(dose.id)}
                              className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer accent-indigo-600"
                            />
                            <div className="space-y-1">
                              <h4 className={`text-base font-bold text-slate-900 dark:text-white leading-none ${dose.taken ? 'line-through text-slate-500 dark:text-slate-500' : ''}`}>
                                {dose.name}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Dosage: <strong>{dose.dosage}</strong> &bull; Frequency: <strong>{dose.frequency}</strong>
                              </p>
                              {hasNotes && !dose.taken && (
                                <div className="flex items-center gap-1.5 mt-2 text-red-500 dark:text-red-400 text-xs font-semibold">
                                  <AlertTriangle size={14} />
                                  <span>Adverse Event Alert: Check for drug combinations.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            {dose.taken ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 font-semibold text-xs rounded-full">
                                <CheckCircle2 size={12} /> Taken
                              </span>
                            ) : isHighRisk ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-500 font-semibold text-xs rounded-full animate-pulse">
                                <AlertTriangle size={12} /> High Alert
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-xs rounded-full">
                                Scheduled
                              </span>
                            )}
                          </div>
                        </div>
                      </SpotlightCard>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
