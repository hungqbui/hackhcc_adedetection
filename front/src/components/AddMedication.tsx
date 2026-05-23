import React, { useState, useRef } from 'react'
import {
  Pill,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Search,
  Mic,
  MicOff,
  Plus,
  X,
  Sparkles,
  Clock,
  Upload,
  FileImage,
  AlertCircle,
  Square
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
  const [whenToAvoid, setWhenToAvoid] = useState<string>('')
  const [foodInteractions, setFoodInteractions] = useState<string>('')
  const [simplifiedExplanation, setSimplifiedExplanation] = useState<string>('')
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Voice & Modality state
  const [isRecording, setIsRecording] = useState(false)
  const [textScanInput, setTextScanInput] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'voice_dictation.webm', { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await processAudioScan(file)
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
      setErrorMsg("Could not access microphone.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Simulate basic voice input for simple micro button
  const handleVoiceInput = () => {
    setIsListening(true)
    setErrorMsg(null)
    setTimeout(() => {
      const randomDrug = VOICE_DRUG_NAMES[Math.floor(Math.random() * VOICE_DRUG_NAMES.length)]
      setFormData(prev => ({ ...prev, name: randomDrug }))
      setIsListening(false)
    }, 2000)
  }

  // Run Safety Check logic locally against predefined interactions database
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
    }, 1200)
  }

  const runSafetyCheck = () => {
    if (!formData.name) return
    performSafetyCheck(formData.name)
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
        notes: res.special_instructions || 'Scanned via AI bottle labels.',
        frequency: res.frequency.toLowerCase().includes('custom') ? 'custom' : 'daily'
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

      // Check for interactions returned by backend API
      if (res.interactions_to_avoid && res.interactions_to_avoid.length > 0) {
        setSafetyReport({
          status: 'alert',
          riskLevel: 'High',
          details: `Adverse drug / food warning labels: ${res.interactions_to_avoid.join(', ')}`,
          recommendation: res.special_instructions || "Consult your provider regarding these interactions.",
          sideEffects: sideEffects
        })
      } else {
        setSafetyReport({
          status: 'safe',
          riskLevel: 'Safe',
          sideEffects: sideEffects
        })
      }
    } catch (err: any) {
      console.error('Scanning failed. Falling back to simulation mode:', err)
      setUploadedImagePreview(null)
      // Fallback offline mock values
      const name = 'Magnesium'
      setFormData(prev => ({
        ...prev,
        name,
        dosage: '400mg',
        purpose: 'Supplement',
        notes: 'Failed to contact backend. Using local offline simulation.',
        frequency: 'daily'
      }))
      setTimes(['21:00'])
      setWhenToAvoid('')
      setFoodInteractions('')
      setSimplifiedExplanation('')
      performSafetyCheck(name)
    } finally {
      setIsScanningPhoto(false)
    }
  }

  // Real Voice Dictation Call to Backend medications.py scan endpoint
  const processAudioScan = async (file: File) => {
    setIsListening(true)
    setErrorMsg(null)
    try {
      const res = await medeaseApi.medications.scan(null, undefined, file)
      
      setFormData(prev => ({
        ...prev,
        name: res.name,
        dosage: res.dosage || '400mg',
        purpose: res.purpose || 'Supplement',
        notes: res.special_instructions || 'Extracted via AI Voice Recording.',
        frequency: res.frequency.toLowerCase().includes('custom') ? 'custom' : 'daily'
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

      if (res.interactions_to_avoid && res.interactions_to_avoid.length > 0) {
        setSafetyReport({
          status: 'alert',
          riskLevel: 'High',
          details: `Adverse drug / food warning labels: ${res.interactions_to_avoid.join(', ')}`,
          recommendation: res.special_instructions || "Consult your provider regarding these interactions.",
          sideEffects: sideEffects
        })
      } else {
        setSafetyReport({
          status: 'safe',
          riskLevel: 'Safe',
          sideEffects: sideEffects
        })
      }
    } catch (err: any) {
      console.error('Voice transcription failed:', err)
      setErrorMsg('Failed to process voice dictation.')
    } finally {
      setIsListening(false)
    }
  }

  // Real Voice Dictation Call to Backend medications.py scan endpoint using a test string
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
        notes: res.special_instructions || 'Extracted via AI Voice: "I take magnesium 400mg every night."',
        frequency: res.frequency.toLowerCase().includes('custom') ? 'custom' : 'daily'
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

      if (res.interactions_to_avoid && res.interactions_to_avoid.length > 0) {
        setSafetyReport({
          status: 'alert',
          riskLevel: 'High',
          details: `Adverse drug / food warning labels: ${res.interactions_to_avoid.join(', ')}`,
          recommendation: res.special_instructions || "Consult your provider regarding these interactions.",
          sideEffects: sideEffects
        })
      } else {
        setSafetyReport({
          status: 'safe',
          riskLevel: 'Safe',
          sideEffects: sideEffects
        })
      }
    } catch (err: any) {
      console.error('Voice transcription failed:', err)
      setErrorMsg('Failed to process example voice dictation.')
    } finally {
      setIsListening(false)
    }
  }

  const processTextScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textScanInput.trim()) return

    setIsListening(true)
    setErrorMsg(null)
    try {
      const res = await medeaseApi.medications.scan(null, textScanInput, null)
      
      setFormData(prev => ({
        ...prev,
        name: res.name,
        dosage: res.dosage || '400mg',
        purpose: res.purpose || 'Supplement',
        notes: res.special_instructions || 'Extracted via AI Text Search.',
        frequency: res.frequency.toLowerCase().includes('custom') ? 'custom' : 'daily'
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

      if (res.interactions_to_avoid && res.interactions_to_avoid.length > 0) {
        setSafetyReport({
          status: 'alert',
          riskLevel: 'High',
          details: `Adverse drug / food warning labels: ${res.interactions_to_avoid.join(', ')}`,
          recommendation: res.special_instructions || "Consult your provider regarding these interactions.",
          sideEffects: sideEffects
        })
      } else {
        setSafetyReport({
          status: 'safe',
          riskLevel: 'Safe',
          sideEffects: sideEffects
        })
      }
      setTextScanInput('')
    } catch (err: any) {
      console.error('Text scan failed:', err)
      setErrorMsg('Failed to process text search.')
    } finally {
      setIsListening(false)
    }
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

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const freqLabel = formData.frequency === 'daily'
        ? (times.length === 1 ? 'Once daily (Morning)' : `${times.length}x daily`)
        : 'Custom schedule';

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
        side_effects: safetyReport.sideEffects || [],
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
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        notes: res.special_instructions || '',
        riskLevel: safetyReport.riskLevel,
        sideEffects: res.side_effects,
        times: res.reminder_times,
        whenToAvoid: res.when_to_avoid,
        foodInteractions: res.interactions_to_avoid?.join(', '),
        simplifiedExplanation: res.simplified_explanation
      };

      localStorage.setItem('medications', JSON.stringify([newMed, ...existingMeds]));
      setSavedSuccess(true);

      setTimeout(() => {
        setFormData({ name: '', dosage: '', frequency: 'daily', purpose: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '' });
        setTimes(['08:00']);
        setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' });
        setWhenToAvoid('');
        setFoodInteractions('');
        setSimplifiedExplanation('');
        setUploadedImagePreview(null);
        setSavedSuccess(false);
        setShowAiPanel(false);
        setAiSchedule(null);
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

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* ── AI SMART SCAN & DICTATION CONTAINER ───────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-500" size={18} />
          <h2 className="font-bold text-slate-800 dark:text-white text-base">AI Smart Scan & Dictation</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
          Use your camera to scan a pill bottle label, tap the microphone to dictate, or type the name below. Our AI automatically extracts dosage, purpose, and schedules it for you!
        </p>

        {/* Text Modality Box */}
        <form onSubmit={processTextScan} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={textScanInput}
            onChange={(e) => setTextScanInput(e.target.value)}
            placeholder="Type drug name or instructions (e.g. 'Magnesium 400mg daily')"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-24 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            disabled={isListening || isScanningPhoto}
          />
          <button
            type="submit"
            disabled={!textScanInput.trim() || isListening || isScanningPhoto}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
          >
            Auto-Fill
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Column A: Photo Label Scanner */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors relative group min-h-[160px]">
            {uploadedImagePreview ? (
              <div className="flex flex-col items-center gap-2 w-full h-full justify-center">
                <img src={uploadedImagePreview} alt="Uploaded bottle label" className="max-h-24 object-contain rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm" />
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">Uploaded Successfully</span>
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
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">AI scanning {scannedFileName}...</span>
              </div>
            )}
          </div>

          {/* Column B: Voice Input */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors relative group min-h-[160px]">
            {isRecording ? (
              <>
                <button onClick={stopRecording} className="text-red-500 hover:text-red-600 transition-colors mb-2 animate-pulse">
                  <Square size={24} fill="currentColor" />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recording audio...</span>
                <span className="text-[10px] text-slate-400 mt-1">Tap to stop</span>
              </>
            ) : (
              <>
                <button onClick={startRecording} className="text-slate-400 hover:text-blue-500 transition-colors mb-2">
                  <Mic size={24} />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice Dictation Input</span>
                <span className="text-[10px] text-slate-400 mt-1">Click mic to record your dosage</span>
              </>
            )}
            
            {/* Quick Example Button */}
            {!isRecording && !isListening && (
              <button
                onClick={handleExampleVoiceFlow}
                className="mt-3 px-3 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1.5"
              >
                <Mic size={11} /> Say: "I take magnesium 400mg every night."
              </button>
            )}
            
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
            <label className={labelClass}>Clinical Recommendation</label>
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

          {/* AI Safety Check alerts */}
          {safetyReport.status === 'alert' && safetyReport.details && (
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertOctagon size={16} className="animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wider">ADE Interaction Warning</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {safetyReport.details}
              </p>
            </div>
          )}

          {safetyReport.status !== 'unchecked' && safetyReport.sideEffects && safetyReport.sideEffects.length > 0 && (
            <div className="space-y-1.5">
              <label className={labelClass}>Potential Side Effects</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                {safetyReport.sideEffects.map(e => (
                  <span key={e} className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                    safetyReport.status === 'alert'
                      ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button" onClick={runSafetyCheck}
                disabled={!formData.name || loading || savedSuccess}
                className="flex-1 py-3 px-4 font-bold text-sm text-white rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Activity size={15} className="animate-spin" />
                    Checking Safety...
                  </>
                ) : '🔬 Check Interactions With Current Medications'}
              </button>
              <button
                type="button" onClick={generateAISchedule}
                disabled={!formData.name}
                className="flex-1 py-3 px-4 font-bold text-sm text-indigo-600 dark:text-indigo-400 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={15} /> Generate AI Schedule
              </button>
            </div>

            {/* Save and Reset Check (always visible inside profile details) */}
            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!formData.name || loading || savedSuccess}
                className={`flex-1 py-3 px-4 font-bold text-sm text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  savedSuccess
                    ? 'bg-emerald-600 shadow-emerald-500/20'
                    : safetyReport.status === 'alert'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {savedSuccess ? (
                  <><CheckCircle2 size={16} /> Saved Successfully</>
                ) : (
                  safetyReport.status === 'alert' ? 'Override & Save to Dashboard' : 'Save to Dashboard'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSafetyReport({ status: 'unchecked', riskLevel: 'Safe' });
                  setWhenToAvoid('');
                  setFoodInteractions('');
                  setSimplifiedExplanation('');
                  setAiSchedule(null);
                  setShowAiPanel(false);
                }}
                disabled={safetyReport.status === 'unchecked' && !aiSchedule && !whenToAvoid}
                className="px-5 py-3 font-bold text-sm rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Check
              </button>
            </div>
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
      </div>
  )
}
