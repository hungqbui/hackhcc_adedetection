import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Bot, AlertTriangle, Trash2, X, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import type { View } from '../App'
import type { MedicationAdvisingInfo } from '../api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChat } from '../contexts/ChatContext'
import type { Message } from '../contexts/ChatContext'

interface AIPanelProps {
  mobileMode?: boolean
  currentView?: View
  onNavigate?: (view: View) => void
  onClose?: () => void
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

const ExpandableMedications = ({ meds }: { meds: MedicationAdvisingInfo[] }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-indigo-500/20 rounded-xl overflow-hidden bg-indigo-50/50 dark:bg-indigo-500/5 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Bot size={12} />
          {meds.length} Context Medications Retrieved
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          {expanded && (
            <div className="p-2 space-y-1.5">
              {meds.map((med, i) => (
                <div
                  key={med.id}
                  className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationFillMode: 'both', animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">{med.name} <span className="text-slate-500 font-normal">({med.dosage})</span></p>
                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">{(med.similarity * 100).toFixed(1)}% match</span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">{med.purpose}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AIPanel({ mobileMode = false, currentView = 'dashboard', onNavigate, onClose }: AIPanelProps) {
  const { messages, isTyping, sendMessage, clearChat } = useChat()

  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(320)
  const isDragging = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      // Calculate new width: distance from cursor to right edge of window
      const newWidth = window.innerWidth - e.clientX
      // Constrain width
      if (newWidth > 280 && newWidth < 800) {
        setPanelWidth(newWidth)
      }
    }
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = 'default'
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return
    const textToSend = input
    const imgToSend = selectedImage
    setInput('')
    setSelectedImage(null)
    await sendMessage(textToSend, imgToSend, onNavigate)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
    <aside
      style={!mobileMode ? { width: panelWidth } : undefined}
      className={`relative flex flex-col bg-white dark:bg-slate-900 z-30 ${mobileMode
          ? 'w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300'
          : 'hidden lg:flex border-l border-slate-100 dark:border-slate-800 h-screen sticky top-0 shadow-xl shadow-slate-900/5'
        }`}>
      {!mobileMode && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 -ml-[2px] cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 z-50 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault() // prevent text selection
            isDragging.current = true
            document.body.style.cursor = 'col-resize'
          }}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/15 rounded-lg">
            <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">AI Assistant</p>
            <p className="text-[10px] text-slate-600 mt-0.5 capitalize">{currentView} context</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} title="Clear Chat" className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Trash2 size={16} />
          </button>
          {mobileMode && onClose && (
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X size={20} />
            </button>
          )}
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
              onClick={() => sendMessage(p, null, onNavigate)}
              className="text-[10px] font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-full transition-colors whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3">
        {messages.map((msg, i) => {
          const isAi = msg.sender === 'ai'
          return (
            <div
              key={msg.id}
              className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ${isAi ? '' : 'items-end'}`}
              style={{ animationFillMode: 'both' }}
            >
              <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed border ${isAi
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
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded" className="max-w-[200px] rounded-lg mb-2 border border-white/20 shadow-sm" />
                )}
                <div className="text-[11.5px] leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-inherit" {...props} />,
                      a: ({ node, ...props }) => <a className="text-indigo-500 hover:underline" {...props} />,
                      h1: ({ node, ...props }) => <h1 className="font-bold text-sm mb-2" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="font-bold text-xs mb-2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="font-bold text-xs mb-1" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
                {msg.retrievedMedications && msg.retrievedMedications.length > 0 && (
                  <ExpandableMedications meds={msg.retrievedMedications} />
                )}
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
      {selectedImage && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-sm flex-shrink-0">
              <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                {selectedImage.name}
              </span>
              <span className="text-[10px] text-slate-400">Image attached</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500 rounded-lg transition-colors"
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <form
        onSubmit={e => { e.preventDefault(); handleSend() }}
        className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
          title="Upload image"
        >
          <ImageIcon size={16} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => setSelectedImage(e.target.files?.[0] || null)}
          accept="image/*"
          className="hidden"
        />
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onPaste={e => {
            const items = e.clipboardData?.items;
            if (items) {
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) {
                    setSelectedImage(blob);
                    // Do not prevent default so they can still paste text simultaneously if it was mixed (though usually it's one or the other)
                    break;
                  }
                }
              }
            }
          }}
          placeholder="Ask about drugs, interactions… (You can also paste images)"
          className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
        />
        <button
          type="submit" disabled={!input.trim() && !selectedImage}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-colors shadow-sm shadow-indigo-500/20 shrink-0"
        >
          <Send size={13} />
        </button>
      </form>
    </aside>
  )
}
