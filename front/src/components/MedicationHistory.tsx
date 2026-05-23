import { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'
import { medeaseApi } from '../api'

type DayStatus = 'fully-taken' | 'partially-taken' | 'missed' | 'future'

interface AdherenceDay {
  dayNum: number
  date: string
  status: DayStatus
  takenCount: number
  totalScheduled: number
}

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MedicationHistory() {
  const [days, setDays] = useState<AdherenceDay[]>([])
  const [leadCells, setLeadCells] = useState(0)
  const [monthLabel, setMonthLabel] = useState('')
  const [weeklyData, setWeeklyData] = useState<{ label: string; taken: number; missed: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistoryData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() // 0-indexed
        
        const firstDay = new Date(year, month, 1)
        const cells = firstDay.getDay() // day of week for 1st
        setLeadCells(cells)
        
        const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        setMonthLabel(label)

        // 1. Fetch active meds
        const meds = await medeaseApi.medications.list()
        
        // 2. Fetch persisted schedule
        let totalScheduledDoses = 0
        try {
          const schedule = await medeaseApi.medications.getPersistedSchedule()
          if (schedule && schedule.slots && schedule.slots.length > 0) {
            totalScheduledDoses = schedule.slots.reduce((acc, slot) => acc + slot.medication_names.length, 0)
          }
        } catch {
          // fallback to active meds count
          meds.forEach(med => {
            if (med.optimal_time && med.optimal_time.length > 0) {
              totalScheduledDoses += med.optimal_time.length
            } else if (med.reminder_times && med.reminder_times.length > 0) {
              totalScheduledDoses += med.reminder_times.length
            } else {
              totalScheduledDoses += 1
            }
          })
        }

        // 3. Fetch logged history entries
        const historyEntries = await medeaseApi.medications.getHistory()

        // 4. Build calendar days
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const todayDayNum = now.getDate()

        const calculatedDays: AdherenceDay[] = Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
          
          if (d > todayDayNum) {
            return {
              dayNum: d,
              date: dateStr,
              status: 'future',
              takenCount: 0,
              totalScheduled: 0
            }
          }

          // Count taken on this day
          const takenOnDay = historyEntries.filter(entry => {
            try {
              const entryDate = new Date(entry.scheduled_time).toISOString().split('T')[0]
              return entryDate === dateStr && entry.status === 'taken'
            } catch {
              return false
            }
          })

          const takenCount = takenOnDay.length
          const totalScheduled = totalScheduledDoses

          let status: DayStatus = 'missed'
          if (totalScheduled === 0) {
            status = 'future'
          } else if (takenCount === totalScheduled) {
            status = 'fully-taken'
          } else if (takenCount > 0) {
            status = 'partially-taken'
          }

          return {
            dayNum: d,
            date: dateStr,
            status,
            takenCount,
            totalScheduled
          }
        })

        setDays(calculatedDays)

        // 5. Compute weekly data
        const weeks = [
          { label: 'Week 1', start: 1, end: 7 },
          { label: 'Week 2', start: 8, end: 14 },
          { label: 'Week 3', start: 15, end: 21 },
          { label: 'Week 4', start: 22, end: 28 }
        ]
        if (daysInMonth > 28) {
          weeks.push({ label: 'Week 5', start: 29, end: daysInMonth })
        }

        const computedWeeks = weeks.map(w => {
          const weekDays = calculatedDays.filter(d => d.dayNum >= w.start && d.dayNum <= w.end && d.status !== 'future')
          const taken = weekDays.reduce((acc, d) => acc + d.takenCount, 0)
          const total = weekDays.reduce((acc, d) => acc + d.totalScheduled, 0)
          const missed = Math.max(0, total - taken)
          const isCurrent = todayDayNum >= w.start && todayDayNum <= w.end
          return {
            label: `${w.label}${isCurrent ? ' (current)' : ''}`,
            taken,
            missed
          }
        })

        setWeeklyData(computedWeeks)
      } catch (err) {
        console.error("Failed to load history data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadHistoryData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <p className="font-semibold text-sm">Loading historical logs...</p>
      </div>
    )
  }

  const past = days.filter(d => d.status !== 'future')
  const totalTaken = past.reduce((s, d) => s + d.takenCount, 0)
  const totalSched = past.reduce((s, d) => s + d.totalScheduled, 0)
  const rate = totalSched > 0 ? Math.round((totalTaken / totalSched) * 100) : 0
  const perfect = past.filter(d => d.status === 'fully-taken').length
  const partial = past.filter(d => d.status === 'partially-taken').length
  const missed = past.filter(d => d.status === 'missed').length

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Historical Logs</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Medication History
        </h1>
        <p className="text-slate-700 dark:text-slate-400 text-sm mt-1">
          Track your adherence calendar, weekly trends, and identify patterns.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Adherence Rate', value: `${rate}%`, sub: `${totalTaken} / ${totalSched} doses`, color: 'emerald', Icon: TrendingUp },
          { label: 'Perfect Days', value: perfect, sub: '100% intake logged', color: 'blue', Icon: Award },
          { label: 'Partial Days', value: partial, sub: 'missed at least one', color: 'amber', Icon: AlertCircle },
          { label: 'Missed Days', value: missed, sub: '0% intake recorded', color: 'red', Icon: XCircle },
        ].map(({ label, value, sub, color, Icon }) => (
          <SpotlightCard key={label} className="p-5 flex flex-col justify-between" spotlightColor={`rgba(${color === 'emerald' ? '16, 185, 129' : color === 'blue' ? '59, 130, 246' : color === 'amber' ? '245, 158, 11' : '239, 68, 68'}, 0.08)`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider text-${color}-500 dark:text-${color}-400`}>{label}</span>
              <div className={`p-1.5 bg-${color}-500/10 rounded-lg text-${color}-500 dark:text-${color}-400`}>
                <Icon size={14} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </SpotlightCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Calendar */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Adherence Calendar</h2>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 px-2">{monthLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEK_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array(leadCells).fill(null).map((_, i) => (
              <div key={`e${i}`} className="aspect-square rounded-xl bg-transparent border border-transparent" />
            ))}
            {days.map(day => {
              const cfg: Record<DayStatus, { bg: string; icon: React.ReactNode }> = {
                'fully-taken': {
                  bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:scale-[1.04]',
                  icon: <CheckCircle2 size={10} className="absolute bottom-1 right-1 text-emerald-500" />
                },
                'partially-taken': {
                  bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:scale-[1.04]',
                  icon: <AlertCircle size={10} className="absolute bottom-1 right-1 text-amber-500" />
                },
                'missed': {
                  bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:scale-[1.04]',
                  icon: <XCircle size={10} className="absolute bottom-1 right-1 text-red-500" />
                },
                'future': {
                  bg: 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600',
                  icon: null
                }
              }
              const { bg, icon } = cfg[day.status]
              return (
                <div
                  key={day.dayNum}
                  title={day.status !== 'future' ? `${day.date}: ${day.takenCount}/${day.totalScheduled} taken` : day.date}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative cursor-default transition-all duration-200 text-sm font-bold ${bg}`}
                >
                  {day.dayNum}
                  {icon}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            {[
              { color: 'emerald', label: 'Fully Taken', Icon: CheckCircle2 },
              { color: 'amber', label: 'Partial', Icon: AlertCircle },
              { color: 'red', label: 'Missed', Icon: XCircle },
            ].map(({ color, label, Icon }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <Icon size={12} className={`text-${color}-500`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly stats */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            Weekly Breakdown
          </h2>

          <div className="space-y-5">
            {weeklyData.map(week => {
              const total = week.taken + week.missed
              const takenPct = total > 0 ? Math.round((week.taken / total) * 100) : 0
              const missedPct = 100 - takenPct
              return (
                <div key={week.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>{week.label}</span>
                    <span>
                      <span className="text-emerald-500">{week.taken} taken</span>
                      <span className="text-slate-300 dark:text-slate-600 px-1">|</span>
                      <span className="text-red-500">{week.missed} missed</span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${takenPct}%` }}
                    />
                    {missedPct > 0 && (
                      <div
                        className="bg-gradient-to-r from-red-400 to-rose-500 h-full rounded-r-full transition-all duration-500"
                        style={{ width: `${missedPct}%` }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Clinical insight */}
          <div className="p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-2">
              <CalendarIcon size={13} />
              <span className="text-xs font-bold uppercase tracking-wider">Clinical Insight</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Your adherence stats are dynamically generated from your active medication plans and logged intake behavior. Track daily logs to generate automated warnings and spacing advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
