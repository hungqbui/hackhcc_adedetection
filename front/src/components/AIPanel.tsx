import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
  riskLevel?: 'Safe' | 'Moderate' | 'High'
}

interface AIPanelProps {
  logo?: string
  mobileMode?: boolean
}

export default function AIPanel({ logo = '🤖', mobileMode = false }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello! I am your ADE Safety Assistant. Ask me anything about side effects, drug-drug compatibility (e.g., 'Can I take Aspirin with Ibuprofen?'), or specific medication schedules.",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    const question = input.toLowerCase()
    setInput('')
    setIsTyping(true)

    // Simulate AI reply delay
    setTimeout(() => {
      let replyText = ''
      let risk: 'Safe' | 'Moderate' | 'High' | undefined

      if (question.includes('aspirin') && question.includes('ibuprofen')) {
        replyText = "⚠️ High Risk Detected: Concomitant use of Aspirin and Ibuprofen increases the risk of gastrointestinal toxicity (including bleeding and ulceration). Ibuprofen also limits the cardioprotective effects of low-dose Aspirin. Recommendation: Use Acetaminophen (Tylenol) for pain relief, or space Ibuprofen intake at least 8 hours after Aspirin."
        risk = 'High'
      } else if (
        (question.includes('sildenafil') || question.includes('viagra')) &&
        (question.includes('nitroglycerin') || question.includes('nitrate'))
      ) {
        replyText = "🚨 Critical Danger: Sildenafil and Nitroglycerin co-administration is strictly contraindicated. Sildenafil amplifies the vasodilatory effects of nitrates, potentially causing a severe, life-threatening drop in blood pressure (hypotension). Seek emergency advice if both were recently taken."
        risk = 'High'
      } else if (question.includes('lisinopril') && question.includes('spironolactone')) {
        replyText = "⚠️ Moderate Risk: Lisinopril and Spironolactone together increase the risk of hyperkalemia (high blood potassium levels), which can lead to cardiac rhythm disorders. Recommendation: Monitor serum potassium levels regularly and avoid excessive potassium-rich foods."
        risk = 'Moderate'
      } else if (question.includes('side effect') || question.includes('side-effect')) {
        replyText = "Common adverse side effects of cardiovascular medications (like ACE inhibitors) include dry cough, dizziness, and mild headache. If you experience severe rashes, swelling of the face/throat (angioedema), or chest pain, seek immediate emergency care."
        risk = 'Moderate'
      } else {
        replyText = "I have scanned our clinical database for your query. No immediate severe contraindications were flagged. Always take medications with water and follow the prescribed spacing intervals. For absolute verification, consult your prescribing physician."
        risk = 'Safe'
      }

      const aiMessage: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date(),
        riskLevel: risk
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: "Chat cleared. Ask me another adverse drug event or medication safety question.",
        timestamp: new Date()
      }
    ])
  }

  if (isPanelCollapsed && !mobileMode) {
    return (
      <button
        onClick={() => setIsPanelCollapsed(false)}
        className="hidden lg:flex fixed right-6 bottom-6 bg-slate-900 border border-slate-800 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all duration-200 z-50 items-center justify-center gap-2"
        title="Open AI Safety Assistant"
      >
        <Sparkles size={20} className="text-indigo-400 animate-pulse" />
        <span className="text-xs font-bold pr-1">ADE AI</span>
      </button>
    )
  }

  return (
    <aside className={`flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 z-30 select-none ${
      mobileMode 
        ? 'w-full h-full rounded-2xl border border-slate-800' 
        : 'hidden lg:flex border-l border-slate-850 w-96 h-screen sticky top-0'
    }`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-slate-850 bg-slate-950/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block leading-none">ADE Advisor</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Clinical Safety AI {logo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>
          {!mobileMode && (
            <button
              onClick={() => setIsPanelCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Collapse Panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/20">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai'
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${isAi ? 'self-start' : 'self-end ml-auto'}`}
            >
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
                  isAi
                    ? msg.riskLevel === 'High'
                      ? 'bg-red-500/10 border-red-500/20 text-red-150'
                      : msg.riskLevel === 'Moderate'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-150'
                      : 'bg-slate-800/80 border-slate-700/50 text-slate-200'
                    : 'bg-indigo-600 border-indigo-500 text-white rounded-br-none'
                }`}
              >
                {isAi && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {msg.riskLevel === 'High' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black text-red-400">
                        <AlertTriangle size={12} /> High Danger
                      </span>
                    ) : msg.riskLevel === 'Moderate' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black text-amber-400">
                        <AlertTriangle size={12} /> Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black text-indigo-400">
                        <Bot size={12} /> Safety AI
                      </span>
                    )}
                  </div>
                )}
                <span className="whitespace-pre-line">{msg.text}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-semibold mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex flex-col max-w-[80%] self-start">
            <div className="p-3 bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-none text-slate-400 text-xs flex items-center gap-2">
              <Bot size={14} className="animate-spin text-indigo-400" />
              <span>Analyzing interaction chemistry...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-850 bg-slate-950/40 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Lisinopril, Ibuprofen..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </aside>
  )
}
