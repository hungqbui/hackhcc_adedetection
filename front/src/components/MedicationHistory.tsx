import { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'

type DayStatus = 'fully-taken' | 'partially-taken' | 'missed' | 'future'

interface AdherenceDay {
  dayNum: number
  date: string
  status: DayStatus
  takenCount: number
  totalScheduled: number
}

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// May 1 2026 is a Friday → 5 empty leading cells
const LEAD_CELLS = 5

function buildMonthData(): AdherenceDay[] {
  const today = 22 // Simulated "today" = May 22, 2026
  return Array.from({ length: 31 }, (_, i) => {
    const d = i + 1
    if (d > today) return { dayNum: d, date: `2026-05-${d.toString().padStart(2,'0')}`, status: 'future', takenCount: 0, totalScheduled: 0 }
    const totalScheduled = 2 + (d % 2)
    if ([5, 12, 19].includes(d)) return { dayNum: d, date: `2026-05-${d.toString().padStart(2,'0')}`, status: 'missed', takenCount: 0, totalScheduled }
    if ([8, 15].includes(d)) return { dayNum: d, date: `2026-05-${d.toString().padStart(2,'0')}`, status: 'partially-taken', takenCount: 1, totalScheduled }
    return { dayNum: d, date: `2026-05-${d.toString().padStart(2,'0')}`, status: 'fully-taken', takenCount: totalScheduled, totalScheduled }
  })
}

const WEEKLY_DATA = [
  { label: 'Week 1', taken: 13, missed: 1 },
  { label: 'Week 2', taken: 10, missed: 4 },
  { label: 'Week 3', taken: 12, missed: 2 },
  { label: 'Week 4 (current)', taken: 9, missed: 1 },
]

export default function MedicationHistory() {
  const [days, setDays] = useState<AdherenceDay[]>([])

  useEffect(() => { setDays(buildMonthData()) }, [])

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
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
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
              <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><ChevronLeft size={15} /></button>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 px-2">May 2026</span>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEK_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array(LEAD_CELLS).fill(null).map((_, i) => (
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
            {WEEKLY_DATA.map(week => {
              const total = week.taken + week.missed
              const takenPct = Math.round((week.taken / total) * 100)
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
              Your adherence is strongest in the <strong>morning (96%)</strong> and weakest at <strong>bedtime (74%)</strong>. Consider setting a bedtime reminder to improve overall compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
