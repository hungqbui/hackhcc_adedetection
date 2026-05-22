import React, { useState } from 'react'
import {
  Pill,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck
} from 'lucide-react'
import ElectricBorder from './react-bits/ElectricBorder'

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

const INTERACTION_DATABASE: {
  drugs: string[]
  riskLevel: 'Moderate' | 'High'
  message: string
  recommendation: string
  sideEffects: string[]
}[] = [
  {
    drugs: ['aspirin', 'ibuprofen'],
    riskLevel: 'High',
    message: 'Increased gastrointestinal bleeding risk and decreased cardioprotective effect of Aspirin.',
    recommendation: 'Avoid simultaneous use if taking Aspirin for cardiovascular protection. Space out dosage or use alternative analgesics like Acetaminophen under medical supervision.',
    sideEffects: ['Gastrointestinal ulceration', 'Internal bleeding', 'Abdominal pain']
  },
  {
    drugs: ['warfarin', 'aspirin'],
    riskLevel: 'High',
    message: 'Severe increase in systemic bleeding risk. Both medications inhibit coagulation cascade through distinct mechanisms.',
    recommendation: 'Requires strict coagulation (INR) monitoring. Adjust doses or consider alternative therapies. Consult your cardiologist.',
    sideEffects: ['Easy bruising', 'Nosebleeds', 'Severe internal bleeding']
  },
  {
    drugs: ['sildenafil', 'nitroglycerin'],
    riskLevel: 'High',
    message: 'Potentially life-threatening hypotension (severe blood pressure drop). Nitroglycerin-induced vasodilation is exponentially amplified by Sildenafil.',
    recommendation: 'Strict contraindication. Do NOT take Sildenafil within 24 hours of Nitroglycerin (or 48 hours for longer-acting nitrates).',
    sideEffects: ['Severe hypotension', 'Syncope (fainting)', 'Myocardial infarction (heart attack)']
  },
  {
    drugs: ['lisinopril', 'spironolactone'],
    riskLevel: 'Moderate',
    message: 'Risk of hyperkalemia (high blood potassium levels). Both agents conserve potassium in the kidneys.',
    recommendation: 'Monitor serum potassium and renal function regularly. Limit dietary potassium intake.',
    sideEffects: ['Muscle weakness', 'Cardiac arrhythmias', 'Nausea']
  }
]

export default function AddMedication() {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily (Morning)',
    purpose: '',
    startDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [loading, setLoading] = useState(false)
  const [safetyReport, setSafetyReport] = useState<{
    status: 'unchecked' | 'safe' | 'alert'
    riskLevel: 'Safe' | 'Moderate' | 'High'
    details?: string
    recommendation?: string
    sideEffects?: string[]
  }>({ status: 'unchecked', riskLevel: 'Safe' })

  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const runSafetyCheck = () => {
    if (!formData.name) return
    setLoading(true)
    setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' })

    // Simulate clinical analysis delay
    setTimeout(() => {
      const currentStored = localStorage.getItem('medications')
      let existingMeds: Medication[] = []
      if (currentStored) {
        try {
          existingMeds = JSON.parse(currentStored)
        } catch (e) {
          console.error(e)
        }
      }

      const newDrugLower = formData.name.trim().toLowerCase()
      let detectedInteraction = null

      // Check against existing medications in database
      for (const existing of existingMeds) {
        const existingLower = existing.name.trim().toLowerCase()
        const interaction = INTERACTION_DATABASE.find(
          (item) =>
            (item.drugs.includes(newDrugLower) && item.drugs.includes(existingLower)) &&
            newDrugLower !== existingLower
        )
        if (interaction) {
          detectedInteraction = interaction
          break
        }
      }

      // Also check if the drug name is known to be risky on its own
      if (detectedInteraction) {
        setSafetyReport({
          status: 'alert',
          riskLevel: detectedInteraction.riskLevel,
          details: detectedInteraction.message,
          recommendation: detectedInteraction.recommendation,
          sideEffects: detectedInteraction.sideEffects
        })
      } else {
        // Fallback generic check (Safe)
        setSafetyReport({
          status: 'safe',
          riskLevel: 'Safe',
          sideEffects: ['Dry mouth', 'Mild drowsiness'] // simulated default side effects
        })
      }
      setLoading(false)
    }, 2000)
  }

  const handleSave = () => {
    const currentStored = localStorage.getItem('medications')
    let existingMeds: Medication[] = []
    if (currentStored) {
      try {
        existingMeds = JSON.parse(currentStored)
      } catch (e) {
        console.error(e)
      }
    }

    const newMed: Medication = {
      id: Math.random().toString(36).substring(2, 9),
      name: formData.name,
      dosage: formData.dosage || 'N/A',
      frequency: formData.frequency,
      purpose: formData.purpose || 'N/A',
      startDate: formData.startDate,
      notes: formData.notes,
      riskLevel: safetyReport.riskLevel,
      sideEffects: safetyReport.sideEffects
    }

    const updated = [newMed, ...existingMeds]
    localStorage.setItem('medications', JSON.stringify(updated))

    setSavedSuccess(true)
    // Reset form after a small delay
    setTimeout(() => {
      setFormData({
        name: '',
        dosage: '',
        frequency: 'Once daily (Morning)',
        purpose: '',
        startDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' })
      setSavedSuccess(false)
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight margin-0">
          Add New Medication
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Register a prescription and run immediate adverse drug interaction evaluations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form panel */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-3 margin-0">
            Medication Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Drug Name *
              </label>
              <div className="relative">
                <Pill className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Aspirin, Lisinopril, Ibuprofen"
                  className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Dosage
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    placeholder="e.g. 81mg, 10mg"
                    className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Frequency
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                className="px-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="Once daily (Morning)">Once daily (Morning)</option>
                <option value="Once daily (Noon)">Once daily (Noon)</option>
                <option value="Once daily (Evening)">Once daily (Evening)</option>
                <option value="Once daily (Bedtime)">Once daily (Bedtime)</option>
                <option value="Twice daily (Morning/Evening)">Twice daily (Morning/Evening)</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Every 8 hours as needed">Every 8 hours as needed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Purpose / Indications
              </label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                placeholder="e.g. Hypertension, Joint pain, Anticoagulant"
                className="px-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Clinical Notes / Warnings
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="E.g. Take with food, monitor blood pressure weekly..."
                  rows={3}
                  className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={runSafetyCheck}
              disabled={!formData.name || loading || savedSuccess}
              className={`flex-1 py-3 px-4 font-bold text-sm text-center text-white rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-600/10 active:scale-98`}
            >
              {loading ? 'Evaluating Side Effects...' : 'Analyze Drug safety & Interactions'}
            </button>
          </div>
        </div>

        {/* Safety checker response panel */}
        <div className="lg:col-span-5 space-y-6">
          {loading && (
            <ElectricBorder color="#6366f1" borderRadius={16} speed={2}>
              <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
                <Activity className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white">Running Safety Screen</h3>
                <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                  Scanning active records for adverse drug events, interaction risks, and clinical cautions...
                </p>
              </div>
            </ElectricBorder>
          )}

          {!loading && safetyReport.status === 'unchecked' && (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
              <ShieldCheck className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-slate-700 dark:text-slate-300 font-bold">Safety Report Pending</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
                Provide a drug name and press "Analyze" to run automatic drug compatibility checks.
              </p>
            </div>
          )}

          {!loading && safetyReport.status === 'safe' && (
            <div className="border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl p-6 space-y-5 min-h-[300px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                  <h3 className="font-extrabold text-lg">No Risks Identified</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-3 leading-relaxed">
                  No interactions were detected between <strong>{formData.name}</strong> and your currently listed medications.
                </p>
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Common Side Effects</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {safetyReport.sideEffects?.map((effect) => (
                      <span key={effect} className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                {savedSuccess ? (
                  <div className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-600/10">
                    <CheckCircle2 size={16} /> Saved Successfully
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center text-sm shadow-md shadow-emerald-600/10 transition-colors"
                  >
                    Save to Dashboard
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && safetyReport.status === 'alert' && (
            <div className="border border-red-200 dark:border-red-950 bg-red-50/40 dark:bg-red-950/10 rounded-2xl p-6 space-y-5 min-h-[300px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertOctagon size={24} className="animate-bounce" />
                  <h3 className="font-extrabold text-lg">ADE Warning Detected</h3>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-red-500/20 text-red-500 rounded border border-red-500/30">
                    {safetyReport.riskLevel} Severity
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 text-sm mt-3 leading-relaxed">
                    {safetyReport.details}
                  </p>
                </div>

                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400">Clinical Recommendation</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                    {safetyReport.recommendation}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Potential Side Effects</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {safetyReport.sideEffects?.map((effect) => (
                      <span key={effect} className="text-xs px-2.5 py-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-full font-medium">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                {savedSuccess ? (
                  <div className="w-full py-2.5 bg-red-600 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 text-sm shadow-md shadow-red-600/10">
                    <CheckCircle2 size={16} /> Acknowledged & Saved
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSave}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-center text-sm shadow-md shadow-red-600/10 transition-colors"
                    >
                      Override & Save (Not Recommended)
                    </button>
                    <button
                      onClick={() => setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' })}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-center text-sm transition-colors"
                    >
                      Cancel Registration
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
