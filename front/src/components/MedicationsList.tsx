import { Pill, Trash2, Plus, Sparkles, Activity, Clock, ShieldAlert, BookOpen } from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'
import type { Medication, View } from '../App'

interface MedicationsListProps {
  medications: Medication[]
  onDeleteMedication: (id: string) => void
  onNavigate: (view: View) => void
}

export default function MedicationsList({
  medications,
  onDeleteMedication,
  onNavigate
}: MedicationsListProps) {
  return (
    <div className="space-y-7 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Active Medications & Supplements
          </h1>
          <p className="text-slate-700 dark:text-slate-400 text-sm mt-1">
            View, inspect, and manage all your registered prescriptions, over-the-counter drugs, and supplements.
          </p>
        </div>
        <button
          onClick={() => onNavigate('add')}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20"
        >
          <Plus size={16} /> Add Medication
        </button>
      </div>

      {/* Empty State */}
      {medications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm mt-8 space-y-4">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Pill size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">No medications found</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              You haven't registered any medications or vitamins yet. Scan a bottle label or enter one manually to populate your list.
            </p>
          </div>
          <button
            onClick={() => onNavigate('add')}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 mx-auto"
          >
            <Plus size={14} /> Register Medication
          </button>
        </div>
      ) : (
        /* Medications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => {
            const isHighRisk = med.riskLevel === 'High';
            const isModerateRisk = med.riskLevel === 'Moderate';

            return (
              <SpotlightCard
                key={med.id}
                spotlightColor={
                  isHighRisk
                    ? 'rgba(239, 68, 68, 0.08)'
                    : isModerateRisk
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'rgba(16, 185, 129, 0.08)'
                }
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-1 shadow-sm hover:shadow-md flex flex-col justify-between min-h-[380px] transition-all group relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isHighRisk
                          ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                          : isModerateRisk
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      }`}
                    >
                      {med.riskLevel} Interaction Risk
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 capitalize">
                      {med.frequency.includes('once') || med.frequency.includes('daily') ? 'Prescription' : 'Supplement'}
                    </span>
                  </div>

                  {/* Header Title + Dosage */}
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-2">
                      {med.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                      {med.dosage}
                    </p>
                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mt-1">
                      {med.purpose || 'General Health'}
                    </p>
                  </div>

                  {/* Schedule Reminders */}
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock size={13} className="text-indigo-500" />
                      <span className="font-semibold">{med.frequency}</span>
                    </div>
                    {med.times && med.times.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {med.times.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Side Effects tags */}
                  {med.sideEffects && med.sideEffects.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-slate-50 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Common Side Effects</p>
                      <div className="flex flex-wrap gap-1.5">
                        {med.sideEffects.map((e, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 text-slate-600 dark:text-slate-450 rounded-full font-medium"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contraindications or Warning */}
                  {med.notes && (
                    <div className="p-2.5 bg-red-500/5 dark:bg-red-500/10 border border-red-200/40 dark:border-red-500/20 rounded-xl flex items-start gap-1.5 text-red-600 dark:text-red-400">
                      <ShieldAlert size={14} className="mt-0.5 flex-shrink-0 animate-pulse" />
                      <p className="text-[10px] leading-relaxed font-semibold">
                        {med.notes}
                      </p>
                    </div>
                  )}

                  {/* Simplified patient friendly explanation */}
                  {med.simplifiedExplanation && (
                    <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100/45 dark:border-indigo-500/15 rounded-xl flex items-start gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <BookOpen size={14} className="mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] leading-relaxed font-medium">
                        {med.simplifiedExplanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Delete Button */}
                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-550">
                    Added: {med.startDate}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete ${med.name}?`)) {
                        onDeleteMedication(med.id);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-500/10 dark:hover:bg-red-600 rounded-lg border border-red-200 dark:border-red-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </div>
  )
}
