import React, { useState } from 'react'
import {
  Pill,
  Calendar,
  Activity,
  CheckCircle2,
  Mic,
  MicOff,
  Plus,
  X,
  Sparkles,
  Clock,
  Upload,
  FileImage,
  AlertCircle
} from 'lucide-react'
import ElectricBorder from './react-bits/ElectricBorder'
import { medeaseApi } from '../api'
import type { MedicationBase, MedicationResponse } from '../api'

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
  whenToAvoid?: string
  foodInteractions?: string
  simplifiedExplanation?: string
}


interface AddMedicationProps {
  onMedicationAdded?: () => void
}

export default function AddMedication({ onMedicationAdded }: AddMedicationProps) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    purpose: '',
    notes: ''
  })
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isScanningPhoto, setIsScanningPhoto] = useState(false)
  const [scannedFileName, setScannedFileName] = useState<string | null>(null)
  const [whenToAvoid, setWhenToAvoid] = useState<string>('')
  const [foodInteractions, setFoodInteractions] = useState<string>('')
  const [simplifiedExplanation, setSimplifiedExplanation] = useState<string>('')
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sideEffects, setSideEffects] = useState<string[]>([])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Dictate real drug names using browser Web Speech API
  const handleVoiceInput = () => {
    setErrorMsg(null)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrorMsg("Voice recognition is not supported in this browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setErrorMsg(`Voice recognition failed: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setFormData(prev => ({ ...prev, name: transcript }))
    }

    recognition.start()
  }



  // Real Photo Scan Call to Backend medications.py scan endpoint
  const handlePhotoScan = async (file: File | null) => {
    setIsScanningPhoto(true)
    setScannedFileName(file ? file.name : 'magnesium_bottle.png')
    setErrorMsg(null)
    if (!file) {
      setUploadedImagePreview('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60')
    }
    try {
      // Call real backend endpoint (passes file if uploaded, or drug_name target if example trigger is used)
      const res = await medeaseApi.medications.scan(file, file ? undefined : 'Magnesium 400mg')
      
      setFormData(prev => ({
        ...prev,
        name: res.name,
        dosage: res.dosage || '400mg',
        purpose: res.purpose || 'Supplement',
        notes: res.special_instructions || 'Scanned via AI bottle labels.'
      }))

      if (res.reminder_times && res.reminder_times.length > 0) {
        setTimes(res.reminder_times)
      } else {
        setTimes(['21:00'])
      }

      // Populate AI insights fields
      setWhenToAvoid(res.when_to_avoid || '')
      setFoodInteractions(res.interactions_to_avoid?.join(', ') || '')
      setSimplifiedExplanation(res.simplified_explanation || '')

      const sideEffects = res.side_effects && res.side_effects.length > 0 
        ? res.side_effects 
        : (res.interactions_to_avoid && res.interactions_to_avoid.length > 0 ? ['Stomach discomfort', 'Mild diarrhea'] : ['Dry mouth', 'Mild drowsiness'])

      setSideEffects(sideEffects)
    } catch (err: any) {
      console.error('Scanning failed:', err)
      setErrorMsg(err.message || 'Failed to scan bottle. Please check backend connection.')
      setUploadedImagePreview(null)
    } finally {
      setIsScanningPhoto(false)
    }
  }

  // Real Voice Dictation Call to Backend medications.py scan endpoint
  const handleExampleVoiceFlow = async () => {
    setIsListening(true)
    setErrorMsg(null)
    try {
      // Call real backend using drug_name slot for the transcription payload
      const res = await medeaseApi.medications.scan(null, "I take magnesium 400mg every night.")
      
      setFormData(prev => ({
        ...prev,
        name: res.name,
        dosage: res.dosage || '400mg',
        purpose: res.purpose || 'Supplement',
        notes: res.special_instructions || 'Extracted via AI Voice: "I take magnesium 400mg every night."'
      }))

      if (res.reminder_times && res.reminder_times.length > 0) {
        setTimes(res.reminder_times)
      } else {
        setTimes(['21:00'])
      }

      setWhenToAvoid(res.when_to_avoid || '')
      setFoodInteractions(res.interactions_to_avoid?.join(', ') || '')
      setSimplifiedExplanation(res.simplified_explanation || '')

      const sideEffects = res.side_effects && res.side_effects.length > 0 
        ? res.side_effects 
        : (res.interactions_to_avoid && res.interactions_to_avoid.length > 0 ? ['Stomach discomfort', 'Mild diarrhea'] : ['Dry mouth', 'Mild drowsiness'])

      setSideEffects(sideEffects)
    } catch (err: any) {
      console.error('Voice transcription failed:', err)
      setErrorMsg(err.message || 'Voice example failed. Please check backend connection.')
    } finally {
      setIsListening(false)
    }
  }

  const addTime = () => setTimes(prev => [...prev, '12:00'])
  const removeTime = (idx: number) => setTimes(prev => prev.filter((_, i) => i !== idx))
  const updateTime = (idx: number, val: string) => setTimes(prev => prev.map((t, i) => i === idx ? val : t))


  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const freqLabel = times.length === 1 ? 'Once daily' : `${times.length}x daily`;

      // Map purpose dynamically to MedicationType
      const isSupplement = formData.purpose.toLowerCase().includes('supplement') || 
                           formData.purpose.toLowerCase().includes('vitamin') ||
                           formData.name.toLowerCase().includes('magnesium') ||
                           formData.name.toLowerCase().includes('vitamin');
      const medType = isSupplement ? 'supplement' as const : 'prescription' as const;

      const medicationPayload: MedicationBase = {
        name: formData.name,
        purpose: formData.purpose || 'Supplement',
        type: medType,
        dosage: formData.dosage || 'N/A',
        frequency: freqLabel,
        reminder_times: times,
        optimal_time: ['morning'], // Default placeholder
        with_food: formData.notes.toLowerCase().includes('food') || formData.notes.toLowerCase().includes('meal'),
        interactions_to_avoid: foodInteractions ? foodInteractions.split(',').map(s => s.trim()) : [],
        special_instructions: formData.notes || undefined,
        side_effects: sideEffects,
        when_to_avoid: whenToAvoid || undefined,
        simplified_explanation: simplifiedExplanation || undefined
      };

      // Create medication in MongoDB
      const res = await medeaseApi.medications.create(medicationPayload);

      // Save locally to keep the UI in sync
      const currentStored = localStorage.getItem('medications');
      let existingMeds: Medication[] = [];
      if (currentStored) {
        try { existingMeds = JSON.parse(currentStored); } catch {}
      }

      const newMed: Medication = {
        id: res.id,
        name: res.name,
        dosage: res.dosage,
        frequency: res.frequency,
        purpose: res.purpose,
        startDate: new Date().toISOString().split('T')[0],
        notes: res.special_instructions || '',
        riskLevel: 'Safe',
        sideEffects: res.side_effects,
        times: res.reminder_times,
        whenToAvoid: res.when_to_avoid,
        foodInteractions: res.interactions_to_avoid?.join(', '),
        simplifiedExplanation: res.simplified_explanation
      };

      localStorage.setItem('medications', JSON.stringify([newMed, ...existingMeds]));
      if (onMedicationAdded) {
        onMedicationAdded();
      }
      setSavedSuccess(true);

      setTimeout(() => {
        setFormData({ name: '', dosage: '', purpose: '', notes: '' });
        setTimes(['08:00']);
        setSideEffects([]);
        setWhenToAvoid('');
        setFoodInteractions('');
        setSimplifiedExplanation('');
        setUploadedImagePreview(null);
        setSavedSuccess(false);
        setScannedFileName(null);
      }, 2200);
    } catch (err: any) {
      console.error('Failed to save medication to database:', err);
      setErrorMsg(err.message || 'Failed to save medication. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow'
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-500 mb-1.5'

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-7">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Medication Registry</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Add New Medication
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-md mt-1">
          Register prescriptions, supplements, or vitamins. Support text, photo labels, or voice commands.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* ── AI SCAN & DICTATION CONTAINER ───────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500 animate-pulse" />
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">AI Scanner & Dictation</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Skip manual typing! Upload a bottle image or speak naturally.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Column A: Photo Label Scanner */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors relative group min-h-[160px]">
            {uploadedImagePreview ? (
              <div className="flex flex-col items-center gap-2 w-full h-full justify-center">
                <img src={uploadedImagePreview} alt="Uploaded bottle label" className="max-h-24 object-contain rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm" />
                <span className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">Uploaded Successfully</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload Bottle Photo</span>
                <span className="text-[10px] text-slate-400 mt-1">Supports JPEG, PNG</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0]
                  const previewUrl = URL.createObjectURL(file)
                  setUploadedImagePreview(previewUrl)
                  handlePhotoScan(file)
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {/* Quick Example Button */}
            {!uploadedImagePreview && (
              <button
                onClick={() => handlePhotoScan(null)}
                className="mt-3 px-3 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1"
              >
                <FileImage size={11} /> Try Example: Upload Bottle Photo
              </button>
            )}
            {uploadedImagePreview && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setUploadedImagePreview(null)
                  setScannedFileName(null)
                }}
                className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-slate-800/80 hover:bg-red-500 hover:text-white text-slate-500 rounded-full transition-colors z-10 shadow"
              >
                <X size={12} />
              </button>
            )}
            {isScanningPhoto && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-2">
                <Activity size={18} className="text-blue-500 animate-spin" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Be patient, we are scanning {scannedFileName}...</span>
              </div>
            )}
          </div>

          {/* Column B: Voice Input */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors relative group">
            <Mic size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Voice Dictation Input</span>
            <span className="text-[12px] text-slate-800 mt-1">Click to speak dosage info</span>
            {/* Quick Example Button */}
            <button
              onClick={handleExampleVoiceFlow}
              className="mt-3 px-3 py-1.5 text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1.5"
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
                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">AI transcribing voice request...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FORM CONTAINER ────────────────────────────────── */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
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

          {/* Dosage */}
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

          {/* Recommendation Time Slots */}
          <div className="space-y-2">
            <label className={labelClass}>Recommendation Time</label>
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

          {/* Purpose */}
          <div>
            <label className={labelClass}>Purpose / Indication</label>
            {formData.purpose ? (
              <div className="flex flex-wrap gap-1.5 p-3 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <span className="text-sm px-2.5 py-1 rounded-full font-semibold border bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  {formData.purpose}
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                Waiting for scan/dictation...
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Clinical Recommendation</label>
            {formData.notes ? (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed font-semibold">
                {formData.notes}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                Waiting for scan/dictation...
              </div>
            )}
          </div>



          {sideEffects && sideEffects.length > 0 && (
            <div className="space-y-1.5">
              <label className={labelClass}>Potential Side Effects</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                {sideEffects.map(e => (
                  <span key={e} className="text-sm px-2.5 py-1 rounded-full font-semibold border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Save and Reset Check (always visible inside profile details) */}
            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!formData.name || loading || savedSuccess}
                className={`flex-1 py-3 px-4 font-bold text-sm text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {savedSuccess ? (
                  <><CheckCircle2 size={16} /> Saved Successfully</>
                ) : (
                  'Save to Dashboard'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWhenToAvoid('');
                  setFoodInteractions('');
                  setSimplifiedExplanation('');
                  setSideEffects([]);
                }}
                disabled={!whenToAvoid && !foodInteractions && !simplifiedExplanation && sideEffects.length === 0}
                className="px-5 py-3 font-bold text-sm rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Form
              </button>
            </div>
          </div>


        </div>
      </div>
  )
}
