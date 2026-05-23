import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Bot, AlertTriangle, Trash2, X } from 'lucide-react'
import type { View } from '../App'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
  riskLevel?: 'Safe' | 'Moderate' | 'High'
}

interface AIPanelProps {
  mobileMode?: boolean
  currentView?: View
}

const CONTEXT_GREETINGS: Partial<Record<View, string>> = {
  dashboard: "I can summarize today's schedule or explain what to do if you missed a dose.",
  add: "I can check side effects, explain drug names in plain language, or help structure your dosing.",
  generator: "I can optimize your medication times based on your meals and sleep schedule.",
  history: "I can analyze your adherence trends and suggest ways to improve consistency.",
}

const QUICK_PROMPTS: Partial<Record<View, string[]>> = {
  dashboard: ['Summarize today\'s schedule', 'I missed a dose — what should I do?', 'What are my high-risk medications?'],
  add: ['Explain this medication in simple terms', 'What are common side effects of Aspirin?', 'Can I take Ibuprofen with Aspirin?'],
  generator: ['Best time to take Metformin?', 'Can I take Lisinopril with food?', 'Avoid taking with food — what does that mean?'],
  history: ['Why does my adherence drop at bedtime?', 'How serious is missing one dose?', 'Tips for improving consistency'],
}

const AI_RESPONSES = (q: string): { text: string; risk?: 'Safe' | 'Moderate' | 'High' } => {
  const lq = q.toLowerCase()

  if (lq.includes('aspirin') && lq.includes('ibuprofen'))
    return { text: '⚠️ High Risk: Aspirin + Ibuprofen significantly increases gastrointestinal bleeding risk. Ibuprofen also blocks the cardioprotective platelet effect of low-dose Aspirin. Recommendation: use Acetaminophen (Tylenol) for pain relief instead, or space doses by at least 8 hours.', risk: 'High' }
  if ((lq.includes('sildenafil') || lq.includes('viagra')) && (lq.includes('nitroglycerin') || lq.includes('nitrate')))
    return { text: '🚨 Critical Danger: Sildenafil + nitrates (Nitroglycerin) is a life-threatening combination causing severe hypotension. This is a strict contraindication — seek emergency advice if both were recently taken.', risk: 'High' }
  if (lq.includes('lisinopril') && lq.includes('spironolactone'))
    return { text: '⚠️ Moderate Risk: Lisinopril + Spironolactone increases risk of hyperkalemia (high potassium). Monitor serum potassium and renal function regularly. Limit dietary potassium.', risk: 'Moderate' }

  if (lq.includes('missed') || lq.includes('forget') || lq.includes('skip'))
    return { text: 'If you missed a dose, take it as soon as you remember — unless your next dose is soon (within 2 hours), in which case skip the missed dose and continue your normal schedule. Never double-dose to make up for a missed one.', risk: 'Safe' }
  if (lq.includes('metformin'))
    return { text: 'Metformin is taken with meals to minimize GI side effects like nausea. Typical dosing: 500mg with breakfast and 500mg with dinner. It takes 2–3 months of consistent use to see full blood sugar benefits.', risk: 'Safe' }
  if (lq.includes('lisinopril'))
    return { text: 'Lisinopril is an ACE inhibitor typically taken once daily in the morning. Common side effects include dry cough and mild dizziness. Avoid potassium supplements unless instructed by your doctor.', risk: 'Safe' }
  if (lq.includes('summarize') || lq.includes('today'))
    return { text: 'Based on your medication profile: Morning doses include Lisinopril 10mg and Aspirin 81mg (⚠️ interaction with Ibuprofen). Noon includes Ibuprofen 400mg. Evening includes Metformin 500mg. You have 2 doses remaining today.', risk: 'Safe' }
  if (lq.includes('side effect'))
    return { text: 'Side effects vary by drug. For cardiovascular medications like ACE inhibitors: dry cough, dizziness, mild fatigue. For NSAIDs like Ibuprofen: stomach irritation, nausea. Seek immediate care for severe rashes, swelling, or chest pain.', risk: 'Moderate' }
  if (lq.includes('food') || lq.includes('meal') || lq.includes('eat'))
    return { text: '"Take with food" means take your medication during or right after a meal. This reduces stomach irritation and improves absorption for some drugs. "Avoid with food" (rare) usually means the food interferes with absorption — take on an empty stomach 30–60 min before eating.', risk: 'Safe' }
  if (lq.includes('adherence') || lq.includes('consistency') || lq.includes('bedtime'))
    return { text: 'Bedtime doses are the most commonly missed. Tips: set a recurring phone alarm, keep medications on your nightstand, or use a weekly pill organizer. Consistent timing (±1 hour) is key for medications like Warfarin.', risk: 'Safe' }

  return { text: 'No severe interactions flagged for that query. Always take medications with water and follow your prescribed schedule. For personalized advice, consult your prescribing physician or pharmacist.', risk: 'Safe' }
}

export default function AIPanel({ mobileMode = false, currentView = 'dashboard' }: AIPanelProps) {
  const greet = CONTEXT_GREETINGS[currentView] ?? "Ask me about drug interactions, side effects, or your medication schedule."
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: `Hello! I'm your MedEase AI Assistant. ${greet}`, timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Update greeting when view changes
  useEffect(() => {
    const newGreet = CONTEXT_GREETINGS[currentView] ?? "Ask me about drug interactions, side effects, or your medication schedule."
    setMessages([{ id: '1', sender: 'ai', text: `Hello! I'm your MedEase AI Assistant. ${newGreet}`, timestamp: new Date() }])
  }, [currentView])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const { text: replyText, risk } = AI_RESPONSES(text)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'ai',
        text: replyText, timestamp: new Date(), riskLevel: risk
      }])
      setIsTyping(false)
    }, 1400)
  }

  const clearChat = () => {
    setMessages([{ id: '1', sender: 'ai', text: `Chat cleared. ${greet}`, timestamp: new Date() }])
  }

  const quickPrompts = QUICK_PROMPTS[currentView] ?? []

  // Collapsed floating button (desktop only)
  if (collapsed && !mobileMode) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden lg:flex fixed right-5 bottom-6 bg-slate-900 border border-slate-700 text-white p-4 rounded-2xl shadow-2xl hover:scale-105 transition-all duration-200 z-50 items-center gap-2"
      >
        <Sparkles size={18} className="text-indigo-400 animate-pulse" />
        <span className="text-xs font-bold">AI Assistant</span>
      </button>
    )
  }

  const riskStyle = (risk?: 'Safe' | 'Moderate' | 'High') => {
    if (risk === 'High') return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-200'
    if (risk === 'Moderate') return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200'
    return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
  }

  return (
    <aside className={`flex flex-col bg-white dark:bg-slate-900 transition-all duration-300 z-30 ${
      mobileMode
        ? 'w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800'
        : 'hidden lg:flex border-l border-slate-100 dark:border-slate-800 w-80 h-screen sticky top-0 shadow-xl shadow-slate-900/5'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/15 rounded-lg">
            <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">AI Assistant</p>
            <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{currentView} context</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} title="Clear chat"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
          {!mobileMode && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Quick prompts */}
      {quickPrompts.length > 0 && (
        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
          {quickPrompts.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-[10px] font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-full transition-colors whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3">
        {messages.map(msg => {
          const isAi = msg.sender === 'ai'
          return (
            <div key={msg.id} className={`flex flex-col ${isAi ? '' : 'items-end'}`}>
              <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed border ${
                isAi
                  ? riskStyle(msg.riskLevel)
                  : 'bg-indigo-600 border-indigo-500 text-white rounded-br-none'
              } ${isAi ? 'rounded-bl-none' : ''}`}>
                {isAi && (
                  <div className="flex items-center gap-1 mb-1.5">
                    {msg.riskLevel === 'High' ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-red-500"><AlertTriangle size={9} /> High Risk</span>
                    ) : msg.riskLevel === 'Moderate' ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-amber-500"><AlertTriangle size={9} /> Warning</span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-indigo-500"><Bot size={9} /> MedEase AI</span>
                    )}
                  </div>
                )}
                <span className="whitespace-pre-line">{msg.text}</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex flex-col">
            <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-bl-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs flex items-center gap-2">
              <Bot size={12} className="animate-spin text-indigo-400" />
              Analyzing…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); sendMessage(input) }}
        className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900"
      >
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask about drugs, interactions…"
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
        />
        <button
          type="submit" disabled={!input.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-colors shadow-sm shadow-indigo-500/20"
        >
          <Send size={13} />
        </button>
      </form>
    </aside>
  )
}
