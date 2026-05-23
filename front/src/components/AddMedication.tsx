import React, { useState } from 'react'
import {
  Pill,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Mic,
  MicOff,
  Plus,
  X,
  Sparkles,
  Clock,
  Upload,
  FileImage
} from 'lucide-react'
import ElectricBorder from './react-bits/ElectricBorder'

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  purpose: string
  startDate: string
  endDate?: string
  notes?: string
  riskLevel: 'Safe' | 'Moderate' | 'High'
  sideEffects?: string[]
  times?: string[]
}

const INTERACTION_DATABASE: {
  drugs: string[]
  riskLevel: 'Moderate' | 'High'
  message: string
  recommendation: string
  sideEffects: string[]
}[] = [
  {
    drugs: ['aspirin', 'ibuprofen'], riskLevel: 'High',
    message: 'Increased gastrointestinal bleeding risk and decreased cardioprotective effect of Aspirin.',
    recommendation: 'Avoid simultaneous use if taking Aspirin for cardiovascular protection. Use Acetaminophen under medical supervision.',
    sideEffects: ['Gastrointestinal ulceration', 'Internal bleeding', 'Abdominal pain']
  },
  {
    drugs: ['warfarin', 'aspirin'], riskLevel: 'High',
    message: 'Severe increase in systemic bleeding risk. Both medications inhibit coagulation cascade.',
    recommendation: 'Requires strict INR monitoring. Consult your cardiologist.',
    sideEffects: ['Easy bruising', 'Nosebleeds', 'Severe internal bleeding']
  },
  {
    drugs: ['sildenafil', 'nitroglycerin'], riskLevel: 'High',
    message: 'Potentially life-threatening hypotension. Nitroglycerin vasodilation is amplified by Sildenafil.',
    recommendation: 'Strict contraindication. Do NOT take Sildenafil within 24 hours of Nitroglycerin.',
    sideEffects: ['Severe hypotension', 'Syncope', 'Myocardial infarction']
  },
  {
    drugs: ['lisinopril', 'spironolactone'], riskLevel: 'Moderate',
    message: 'Risk of hyperkalemia. Both agents conserve potassium in the kidneys.',
    recommendation: 'Monitor serum potassium regularly. Limit dietary potassium intake.',
    sideEffects: ['Muscle weakness', 'Cardiac arrhythmias', 'Nausea']
  }
]

const VOICE_DRUG_NAMES = ['Lisinopril', 'Metformin', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Atorvastatin']

const AI_SCHEDULE_HINTS: Record<string, string[]> = {
  metformin: ['Take with meals to reduce nausea', 'Split morning and evening doses with food'],
  ibuprofen: ['Take with food or milk to protect stomach lining', 'Avoid taking on an empty stomach'],
  aspirin: ['Take in the morning for optimal cardioprotective effect', 'Avoid concurrent NSAIDs'],
  lisinopril: ['Best taken in the morning', 'Avoid potassium supplements unless directed'],
  magnesium: ['Take in the evening or before bed to support muscle relaxation and sleep quality.'],
  default: ['Space doses evenly throughout the day', 'Take with a full glass of water']
}

export default function AddMedication() {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    purpose: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  })
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isScanningPhoto, setIsScanningPhoto] = useState(false)
  const [scannedFileName, setScannedFileName] = useState<string | null>(null)
  const [aiSchedule, setAiSchedule] = useState<string[] | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [safetyReport, setSafetyReport] = useState<{
    status: 'unchecked' | 'safe' | 'alert'
    riskLevel: 'Safe' | 'Moderate' | 'High'
    details?: string
    recommendation?: string
    sideEffects?: string[]
  }>({ status: 'unchecked', riskLevel: 'Safe' })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Simulate voice input
  const handleVoiceInput = () => {
    setIsListening(true)
    setTimeout(() => {
      const randomDrug = VOICE_DRUG_NAMES[Math.floor(Math.random() * VOICE_DRUG_NAMES.length)]
      setFormData(prev => ({ ...prev, name: randomDrug }))
      setIsListening(false)
    }, 2000)
  }

  // Run Safety Check logic
  const performSafetyCheck = (drugName: string) => {
    setLoading(true)
    setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' })

    setTimeout(() => {
      const currentStored = localStorage.getItem('medications')
      let existingMeds: Medication[] = []
      if (currentStored) {
        try { existingMeds = JSON.parse(currentStored) } catch {}
      }

      const newDrugLower = drugName.trim().toLowerCase()
      let detectedInteraction = null

      for (const existing of existingMeds) {
        const existingLower = existing.name.trim().toLowerCase()
        const interaction = INTERACTION_DATABASE.find(
          item => item.drugs.includes(newDrugLower) && item.drugs.includes(existingLower) && newDrugLower !== existingLower
        )
        if (interaction) { detectedInteraction = interaction; break }
      }

      if (detectedInteraction) {
        setSafetyReport({
          status: 'alert',
          riskLevel: detectedInteraction.riskLevel,
          details: detectedInteraction.message,
          recommendation: detectedInteraction.recommendation,
          sideEffects: detectedInteraction.sideEffects
        })
      } else {
        const standardSideEffects = newDrugLower.includes('magnesium')
          ? ['Mild laxative effect', 'Stomach upset']
          : ['Dry mouth', 'Mild drowsiness']
        setSafetyReport({
          status: 'safe',
          riskLevel: 'Safe',
          sideEffects: standardSideEffects
        })
      }
      setLoading(false)
    }, 1500)
  }

  const runSafetyCheck = () => {
    if (!formData.name) return
    performSafetyCheck(formData.name)
  }

  // Simulate photo scanning flow
  const handlePhotoScan = (fileName: string) => {
    setIsScanningPhoto(true)
    setScannedFileName(fileName)
    setTimeout(() => {
      const name = 'Magnesium'
      const dosage = '400mg'
      const purpose = 'Supplement'
      const notes = 'Extracted via AI label OCR photo scanning.'

      setFormData(prev => ({
        ...prev,
        name,
        dosage,
        purpose,
        notes,
        frequency: 'daily'
      }))
      setTimes(['21:00'])
      setIsScanningPhoto(false)
      // Trigger safety check automatically
      performSafetyCheck(name)
    }, 2000)
  }

  // Simulate example voice saying: "I take magnesium 400mg every night."
  const handleExampleVoiceFlow = () => {
    setIsListening(true)
    setTimeout(() => {
      const name = 'Magnesium'
      const dosage = '400mg'
      const purpose = 'Supplement'
      const notes = 'Extracted via AI Voice: "I take magnesium 400mg every night."'

      setFormData(prev => ({
        ...prev,
        name,
        dosage,
        purpose,
        notes,
        frequency: 'daily'
      }))
      setTimes(['21:00'])
      setIsListening(false)
      // Trigger safety check automatically
      performSafetyCheck(name)
    }, 2200)
  }

  const addTime = () => setTimes(prev => [...prev, '12:00'])
  const removeTime = (idx: number) => setTimes(prev => prev.filter((_, i) => i !== idx))
  const updateTime = (idx: number, val: string) => setTimes(prev => prev.map((t, i) => i === idx ? val : t))

  const generateAISchedule = () => {
    setShowAiPanel(true)
    const key = formData.name.toLowerCase()
    const hints = AI_SCHEDULE_HINTS[key] || AI_SCHEDULE_HINTS['default']
    const freq = formData.frequency === 'daily' ? 'Once Daily' : 'Custom'
    const timeList = times.map(t => {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
    })
    setAiSchedule([
      `📅 Frequency: ${freq} at ${timeList.join(', ')}`,
      ...hints.map(h => `💡 ${h}`)
    ])
  }

  const handleSave = () => {
    const currentStored = localStorage.getItem('medications')
    let existingMeds: Medication[] = []
    if (currentStored) {
      try { existingMeds = JSON.parse(currentStored) } catch {}
    }

    const freqLabel = formData.frequency === 'daily'
      ? (times.length === 1 ? 'Once daily (Morning)' : `${times.length}x daily`)
      : 'Custom schedule'

    const newMed: Medication = {
      id: Math.random().toString(36).substring(2, 9),
      name: formData.name,
      dosage: formData.dosage || 'N/A',
      frequency: freqLabel,
      purpose: formData.purpose || 'Supplement',
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      notes: formData.notes,
      riskLevel: safetyReport.riskLevel,
      sideEffects: safetyReport.sideEffects,
      times
    }

    localStorage.setItem('medications', JSON.stringify([newMed, ...existingMeds]))
    setSavedSuccess(true)
    setTimeout(() => {
      setFormData({ name: '', dosage: '', frequency: 'daily', purpose: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '' })
      setTimes(['08:00'])
      setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' })
      setSavedSuccess(false)
      setShowAiPanel(false)
      setAiSchedule(null)
      setScannedFileName(null)
    }, 2200)
  }

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow'
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5'

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-7">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Medication Registry</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Add New Medication
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Register prescriptions, supplements, or vitamins. Support text, photo labels, or voice commands.
        </p>
      </div>

      {/* ── AI SMART SCAN & DICTATION CONTAINER ───────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500 animate-pulse" />
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">AI Smart Scanner & Dictation</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Skip manual typing! Upload a bottle image or speak naturally. Try the interactive example flows below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Column A: Photo Label Scanner */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors relative group">
            <Upload size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload Bottle Photo</span>
            <span className="text-[10px] text-slate-400 mt-1">Supports JPEG, PNG</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handlePhotoScan(e.target.files[0].name)
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {/* Quick Example Button */}
            <button
              onClick={() => handlePhotoScan('magnesium_bottle.png')}
              className="mt-3 px-3 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1"
            >
              <FileImage size={11} /> Try Example: Upload Bottle Photo
            </button>
            {isScanningPhoto && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-2">
                <Activity size={18} className="text-blue-500 animate-spin" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">AI scanning {scannedFileName}...</span>
              </div>
            )}
          </div>

          {/* Column B: Voice Input */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors relative group">
            <Mic size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice Dictation Input</span>
            <span className="text-[10px] text-slate-400 mt-1">Click to speak dosage info</span>
            {/* Quick Example Button */}
            <button
              onClick={handleExampleVoiceFlow}
              className="mt-3 px-3 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1.5"
            >
              <Mic size={11} /> Say: "I take magnesium 400mg every night."
            </button>
            {isListening && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-2">
                <div className="flex gap-1 items-center justify-center h-4">
                  <div className="w-1 bg-blue-500 h-2 rounded animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 bg-blue-500 h-4 rounded animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 bg-blue-500 h-3 rounded animate-bounce" style={{ animationDelay: '0.3s' }} />
                  <div className="w-1 bg-blue-500 h-1 rounded animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">AI transcribing voice request...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* ── FORM ──────────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-slate-800 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            Medication Profile Details
          </h2>

          {/* Drug Name + Simple Voice button */}
          <div>
            <label className={labelClass}>Drug / Supplement Name *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Magnesium, Aspirin, Vitamin D3..."
                  className={`pl-9 ${inputClass}`}
                />
              </div>
              <button
                type="button"
                onClick={handleVoiceInput}
                title={isListening ? 'Listening…' : 'Voice input'}
                className={`flex-shrink-0 px-3 py-2.5 rounded-xl border transition-all ${
                  isListening
                    ? 'bg-red-500 border-red-400 text-white animate-pulse'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500'
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>

          {/* Dosage + Start/End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Dosage</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" name="dosage" value={formData.dosage}
                  onChange={handleInputChange} placeholder="e.g. 400mg"
                  className={`pl-9 ${inputClass}`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="date" name="startDate" value={formData.startDate}
                  onChange={handleInputChange} className={`pl-9 ${inputClass}`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="date" name="endDate" value={formData.endDate}
                  onChange={handleInputChange} className={`pl-9 ${inputClass}`}
                />
              </div>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className={labelClass}>Frequency</label>
            <div className="flex gap-2 mb-3">
              {['daily', 'custom'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, frequency: opt }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize transition-all ${
                    formData.frequency === opt
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  }`}
                >
                  {opt === 'daily' ? 'Daily (Fixed)' : 'Custom Times'}
                </button>
              ))}
            </div>

            {/* Time Slots */}
            <div className="space-y-2">
              <label className={labelClass + ' mt-1'}>Times</label>
              {times.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="time" value={t}
                      onChange={e => updateTime(idx, e.target.value)}
                      className={`pl-9 ${inputClass}`}
                    />
                  </div>
                  {times.length > 1 && (
                    <button type="button" onClick={() => removeTime(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTime}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 mt-1 transition-colors">
                <Plus size={13} /> Add another time
              </button>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className={labelClass}>Purpose / Indication</label>
            <input type="text" name="purpose" value={formData.purpose}
              onChange={handleInputChange} placeholder="e.g. Supplement, Hypertension, Vitamin"
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes / Side Effects</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea name="notes" value={formData.notes}
                onChange={handleInputChange}
                placeholder="Take with food, monitor blood pressure weekly…"
                rows={3}
                className={`pl-9 resize-none ${inputClass}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button" onClick={runSafetyCheck}
              disabled={!formData.name || loading || savedSuccess}
              className="flex-1 py-3 px-4 font-bold text-sm text-white rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20"
            >
              {loading ? 'Analyzing…' : '🔬 Analyze Drug Safety'}
            </button>
            <button
              type="button" onClick={generateAISchedule}
              disabled={!formData.name}
              className="flex-1 py-3 px-4 font-bold text-sm text-indigo-600 dark:text-indigo-400 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={15} /> Generate AI Schedule
            </button>
          </div>

          {/* AI Schedule Output */}
          {showAiPanel && aiSchedule && (
            <div className="mt-2 p-4 bg-indigo-50/60 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <Sparkles size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">AI Suggested Schedule</span>
              </div>
              {aiSchedule.map((line, i) => (
                <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{line}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── SAFETY CHECKER PANEL ───────────────────────────── */}
        <div className="lg:col-span-5 space-y-5">
          {loading && (
            <ElectricBorder color="#3b82f6" borderRadius={16} speed={2}>
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[260px]">
                <Activity className="h-9 w-9 text-blue-500 animate-spin mb-4" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Running Safety Screen</h3>
                <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                  Scanning active records for adverse drug events, interaction risks, and clinical cautions…
                </p>
              </div>
            </ElectricBorder>
          )}

          {!loading && safetyReport.status === 'unchecked' && (
            <div className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 text-center min-h-[260px] flex flex-col items-center justify-center shadow-sm">
              <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-slate-700 dark:text-slate-300 font-bold text-sm">Safety Report Pending</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 max-w-[220px] mx-auto leading-relaxed">
                Enter a drug name or scan a label to run automatic interaction safety checks.
              </p>
            </div>
          )}

          {!loading && safetyReport.status === 'safe' && (
            <div className="border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl p-6 space-y-4 min-h-[260px] flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-3">
                  <CheckCircle2 size={20} />
                  <h3 className="font-bold text-base">No Interactions Detected</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  No interactions found between <strong>{formData.name}</strong> and your current medications.
                </p>
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Common Side Effects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {safetyReport.sideEffects?.map(e => (
                      <span key={e} className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">{e}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={savedSuccess}
                className="w-full py-2.5 font-bold text-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {savedSuccess ? <><CheckCircle2 size={15} /> Saved Successfully</> : 'Save to Dashboard'}
              </button>
            </div>
          )}

          {!loading && safetyReport.status === 'alert' && (
            <div className="border border-red-200 dark:border-red-900/30 bg-red-50/40 dark:bg-red-950/10 rounded-2xl p-6 space-y-4 min-h-[260px] flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertOctagon size={20} className="animate-pulse" />
                  <h3 className="font-bold text-base">ADE Warning Detected</h3>
                </div>
                <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 bg-red-500/15 text-red-500 rounded border border-red-500/25">
                  {safetyReport.riskLevel} Severity
                </span>
                <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{safetyReport.details}</p>
                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                  <p className="text-xs font-bold text-red-500 mb-1">Clinical Recommendation</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{safetyReport.recommendation}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Potential Side Effects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {safetyReport.sideEffects?.map(e => (
                      <span key={e} className="text-xs px-2.5 py-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-full font-medium">{e}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleSave} disabled={savedSuccess}
                  className="w-full py-2.5 font-bold text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md shadow-red-500/20 flex items-center justify-center gap-2">
                  {savedSuccess ? <><CheckCircle2 size={15} /> Acknowledged</> : 'Override & Save (Not Recommended)'}
                </button>
                <button onClick={() => setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' })}
                  className="w-full py-2.5 font-bold text-sm rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                  Cancel Registration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
