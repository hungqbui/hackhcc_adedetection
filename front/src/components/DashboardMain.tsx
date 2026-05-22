import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Pill,
  Search,
  Plus,
  RefreshCw
} from 'lucide-react'
import SpotlightCard from './react-bits/SpotlightCard'
import StarBorder from './react-bits/StarBorder'

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

const DEFAULT_MEDICATIONS: Medication[] = [
  {
    id: '1',
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily (Morning)',
    purpose: 'Hypertension',
    startDate: '2026-01-15',
    riskLevel: 'Safe',
    sideEffects: ['Dry cough', 'Dizziness']
  },
  {
    id: '2',
    name: 'Aspirin',
    dosage: '81mg',
    frequency: 'Once daily (Morning)',
    purpose: 'Cardioprotection',
    startDate: '2026-02-10',
    riskLevel: 'High',
    sideEffects: ['Stomach irritation', 'Easy bruising'],
    notes: 'Interact warning: Co-administration with Ibuprofen increases gastrointestinal bleeding risks.'
  },
  {
    id: '3',
    name: 'Ibuprofen',
    dosage: '400mg',
    frequency: 'Every 8 hours as needed',
    purpose: 'Joint Pain',
    startDate: '2026-05-01',
    riskLevel: 'High',
    sideEffects: ['Stomach ache', 'Nausea'],
    notes: 'Interact warning: May reduce cardioprotective effect of low-dose Aspirin.'
  },
  {
    id: '4',
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily (Morning/Evening)',
    purpose: 'Type 2 Diabetes',
    startDate: '2026-03-01',
    riskLevel: 'Safe',
    sideEffects: ['Nausea', 'Metabolism changes']
  }
]

export default function DashboardMain() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRisk, setFilterRisk] = useState<string>('all')

  useEffect(() => {
    const stored = localStorage.getItem('medications')
    if (stored) {
      try {
        setMedications(JSON.parse(stored))
      } catch (e) {
        console.error('Error parsing stored medications, resetting to default', e)
        setMedications(DEFAULT_MEDICATIONS)
        localStorage.setItem('medications', JSON.stringify(DEFAULT_MEDICATIONS))
      }
    } else {
      setMedications(DEFAULT_MEDICATIONS)
      localStorage.setItem('medications', JSON.stringify(DEFAULT_MEDICATIONS))
    }
  }, [])

  const resetToDefault = () => {
    localStorage.setItem('medications', JSON.stringify(DEFAULT_MEDICATIONS))
    setMedications(DEFAULT_MEDICATIONS)
  }

  const filteredMeds = medications.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          med.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRisk = filterRisk === 'all' ? true : med.riskLevel.toLowerCase() === filterRisk.toLowerCase()
    return matchesSearch && matchesRisk
  })

  // Calculations
  const totalMeds = medications.length
  const highRiskCount = medications.filter((m) => m.riskLevel === 'High').length
  const moderateRiskCount = medications.filter((m) => m.riskLevel === 'Moderate').length
  const safeCount = medications.filter((m) => m.riskLevel === 'Safe').length

  // Simulated Alert checks
  const hasAspirinAndIbuprofen = medications.some(m => m.name.toLowerCase().includes('aspirin')) &&
                                 medications.some(m => m.name.toLowerCase().includes('ibuprofen'))

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight margin-0">
            Adverse Drug Event Panel
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time patient medication monitoring and interaction analysis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RefreshCw size={14} />
            Reset Data
          </button>
        </div>
      </div>

      {/* Critical Warnings */}
      {hasAspirinAndIbuprofen && (
        <StarBorder
          as="div"
          color="#ef4444"
          speed="3s"
          className="w-full text-left"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/20 text-red-500 rounded-xl mt-1">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Critical Drug Interaction Warning</h3>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed max-w-4xl">
                A potential high-risk interaction has been detected between <strong>Aspirin</strong> and <strong>Ibuprofen</strong>. 
                Using Aspirin with Ibuprofen can reduce the blood-thinning benefits of Aspirin and significantly increase the risk of gastrointestinal bleeding or ulceration. 
                Please consult a healthcare professional.
              </p>
            </div>
          </div>
        </StarBorder>
      )}

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SpotlightCard className="flex flex-col justify-between" spotlightColor="rgba(99, 102, 241, 0.15)">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-semibold tracking-wider uppercase text-indigo-400">Total Medications</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Pill size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">{totalMeds}</span>
            <span className="text-xs text-slate-500 block mt-1">active prescriptions</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="flex flex-col justify-between" spotlightColor="rgba(239, 68, 68, 0.15)">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-semibold tracking-wider uppercase text-red-400">High Risk ADEs</span>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">{highRiskCount}</span>
            <span className="text-xs text-slate-500 block mt-1">requiring immediate review</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="flex flex-col justify-between" spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-semibold tracking-wider uppercase text-emerald-400">Adherence Rate</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">92%</span>
            <span className="text-xs text-slate-500 block mt-1">+4% increase this week</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="flex flex-col justify-between" spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-semibold tracking-wider uppercase text-amber-400">Next Intake</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xl font-bold text-white truncate block">08:00 AM</span>
            <span className="text-xs text-slate-500 block mt-1">Lisinopril + Metformin</span>
          </div>
        </SpotlightCard>
      </div>

      {/* Medications List and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white margin-0">Medication Overview</h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search drug or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-60 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            {/* Risk Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="all">All Risks</option>
              <option value="safe">Safe Only</option>
              <option value="moderate">Moderate Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
        </div>

        {/* Medications Table/List */}
        {filteredMeds.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Pill className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
            <h4 className="text-slate-600 dark:text-slate-400 font-bold">No medications found</h4>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Medication Name</th>
                  <th className="py-3 px-4">Dosage</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">ADE Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredMeds.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors text-sm text-slate-700 dark:text-slate-300">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      {med.name}
                    </td>
                    <td className="py-4 px-4 font-mono">{med.dosage}</td>
                    <td className="py-4 px-4">{med.frequency}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-md">
                        {med.purpose}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">{med.startDate}</td>
                    <td className="py-4 px-4">
                      {med.riskLevel === 'High' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-150 dark:bg-red-500/15 text-red-600 dark:text-red-400 font-semibold text-xs rounded-full">
                          <AlertTriangle size={12} /> High Alert
                        </span>
                      ) : med.riskLevel === 'Moderate' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-150 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-xs rounded-full">
                          <AlertTriangle size={12} /> Moderate Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-150 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-full">
                          <CheckCircle2 size={12} /> Safe
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => {
                          const updated = medications.filter((m) => m.id !== med.id)
                          setMedications(updated)
                          localStorage.setItem('medications', JSON.stringify(updated))
                        }}
                        className="text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
