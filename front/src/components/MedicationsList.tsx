import { useState } from 'react'
import { Pill, Trash2, Plus, Sparkles, Activity, Clock, ShieldAlert, BookOpen, Info, X } from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'
import TiltedCard from './TiltedCard'
import BorderGlow from './BorderGlow'
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
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
          {medications.map((med) => {
            const isHighRisk = med.riskLevel === 'High';
            const isModerateRisk = med.riskLevel === 'Moderate';

            return (
              <TiltedCard
                key={med.id}
                containerHeight="220px"
                containerWidth="100%"
                imageHeight="100%"
                imageWidth="100%"
                scaleOnHover={1.03}
                rotateAmplitude={8}
                showMobileWarning={false}
                showTooltip={false}
              >
                <BorderGlow
                  className="h-full w-full rounded-2xl shadow-sm overflow-hidden"
                  glowColor={isHighRisk ? '0 100 60' : isModerateRisk ? '38 100 50' : '150 100 40'} 
                  colors={isHighRisk ? ['#ef4444', '#f87171', '#fca5a5'] : isModerateRisk ? ['#f59e0b', '#fbbf24', '#fcd34d'] : ['#10b981', '#34d399', '#6ee7b7']}
                  backgroundColor="transparent"
                  borderRadius={16}
                >
                  <div className={`h-full w-full p-5 border flex flex-col justify-between ${
                    isHighRisk 
                      ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-900/50' 
                      : isModerateRisk 
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50' 
                        : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50'
                  }`}>
                    <div className="space-y-3 pointer-events-none">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isHighRisk ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30' :
                        isModerateRisk ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30' :
                        'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                      }`}>
                        {med.riskLevel} Risk
                      </span>
                    </div>
                    
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {med.name}
                      </h2>
                      
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMed(med);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer relative z-10"
                    >
                      <Info size={14} /> View More
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete ${med.name}?`)) {
                          onDeleteMedication(med.id);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-500/10 dark:hover:bg-red-600 rounded-lg transition-colors cursor-pointer relative z-10"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
                </BorderGlow>
              </TiltedCard>
            );
          })}
        </div>
      )}

      {/* Modal Popup for Details */}
      {selectedMed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMed(null)}>
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <SpotlightCard
              spotlightColor={
                selectedMed.riskLevel === 'High'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : selectedMed.riskLevel === 'Moderate'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(16, 185, 129, 0.08)'
              }
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedMed(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors z-20"
              >
                <X size={16} />
              </button>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-2 pr-8">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      selectedMed.riskLevel === 'High'
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                        : selectedMed.riskLevel === 'Moderate'
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                    }`}
                  >
                    {selectedMed.riskLevel} Interaction Risk
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 capitalize">
                    {selectedMed.frequency.includes('once') || selectedMed.frequency.includes('daily') ? 'Prescription' : 'Supplement'}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedMed.name}
                  </h2>
                  <p className="text-sm text-blue-500 font-bold uppercase tracking-wider mt-1">
                    {selectedMed.purpose || 'General Health'}
                  </p>
                </div>

                <div className="space-y-1.5 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider mt-1 truncate">
                    {selectedMed.dosage}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-400">
                    <Clock size={13} className="text-indigo-500" />
                    <span className="font-semibold">{selectedMed.frequency}</span>
                  </div>
                  {selectedMed.times && selectedMed.times.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMed.times.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {selectedMed.sideEffects && selectedMed.sideEffects.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Common Side Effects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMed.sideEffects.map((e, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 text-slate-600 dark:text-slate-450 rounded-full font-medium"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMed.notes && (
                  <div className="p-3 bg-red-500/5 dark:bg-red-500/10 border border-red-200/40 dark:border-red-500/20 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 mt-2">
                    <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 animate-pulse" />
                    <p className="text-xs leading-relaxed font-semibold">
                      {selectedMed.notes}
                    </p>
                  </div>
                )}

                {selectedMed.simplifiedExplanation && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100/45 dark:border-indigo-500/15 rounded-xl flex items-start gap-2 text-indigo-600 dark:text-indigo-400 mt-2">
                    <BookOpen size={16} className="mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed font-medium">
                      {selectedMed.simplifiedExplanation}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800 mt-5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-550">
                  Added: {selectedMed.startDate}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete ${selectedMed.name}?`)) {
                      onDeleteMedication(selectedMed.id);
                      setSelectedMed(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-500/10 dark:hover:bg-red-600 rounded-xl border border-red-200 dark:border-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 size={14} /> Delete Medication
                </button>
              </div>
            </SpotlightCard>
          </div>
        </div>
      )}
    </div>
  )
}
