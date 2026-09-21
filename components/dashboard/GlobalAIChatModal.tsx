'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ExternalLink,
  ChefHat,
  MapPin,
  Maximize2,
  Minimize2,
} from 'lucide-react'

interface SourceItem {
  id: string
  permalink: string
  title: string
  summary: string | null
  description: string | null
  category: string | null
  thumbnail_url: string | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceItem[]
}

const QUICK_PROMPTS = [
  '🍰 Bu ay kaydettiğim tatlı tarifleri ve malzemeleri neler?',
  '☕ İstanbul\'da kaydettiğim en iyi kahveciler hangileri?',
  '🤖 Yapay zeka ve yazılım hakkında ne kaydetmiştim?',
]

let nextMsgId = 1
function createMessageId(prefix: string): string {
  return `${prefix}-${nextMsgId++}`
}

export default function GlobalAIChatModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Merhaba! Ben SavedLens **İkinci Beyin** AI asistanınızım. 🧠\n\nKütüphanenizdeki tüm Reels videolarını, tarifleri ve mekanları tarayarak sorularınızı yanıtlayabilirim. Bana kütüphanenizle ilgili her şeyi sorabilirsiniz!',
    },
  ])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  async function handleSend(queryText?: string) {
    const textToSend = queryText || input.trim()
    if (!textToSend || loading) return

    const userMessage: Message = {
      id: createMessageId('msg'),
      role: 'user',
      content: textToSend,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const assistantMessage: Message = {
          id: createMessageId('reply'),
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Yanıt alınamadı')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu'
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId('err'),
          role: 'assistant',
          content: `⚠️ Üzgünüm, yanıt üretilirken bir hata oluştu: ${message}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Floating Launcher Trigger Button ────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-2.5 shadow-[0_10px_30px_rgba(99,102,241,0.5)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 group"
        title="İkinci Beyin AI Kütüphane Asistanı"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
        </span>
        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        <span className="font-bold tracking-wide">İkinci Beyin AI</span>
      </button>

      {/* ── Chat Modal / Drawer ─────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full bg-[#12121a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
              isExpanded
                ? 'sm:w-[700px] h-[92vh]'
                : 'sm:w-[480px] h-[85vh] sm:h-[650px]'
            }`}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#161622] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>SavedLens İkinci Beyin</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/30 font-semibold">
                      RAG Vektör AI
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Kütüphanenizdeki tüm içerikleri tarar ve yanıtlar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors hidden sm:block"
                  title={isExpanded ? 'Küçült' : 'Genişlet'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30 text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-md'
                        : 'bg-[#181824] text-zinc-200 border border-white/10 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Sources Carousel if present */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider block">
                          İlgili Kütüphane İçerikleri ({msg.sources.length}):
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {msg.sources.map((src) => (
                            <a
                              key={src.id}
                              href={src.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 text-[11px] text-zinc-300 hover:text-white transition-colors group"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {src.category === 'recipe' && <ChefHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                {src.category === 'travel' && <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                <span className="truncate font-medium">{src.title}</span>
                              </div>
                              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 shrink-0 ml-2" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-white/10 text-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#181824] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span>Kütüphaneniz taranıyor ve yanıt üretiliyor...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            {messages.length <= 2 && !loading && (
              <div className="px-4 py-2 border-t border-white/5 bg-[#14141f]/50 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 text-[10px] text-purple-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="p-3 sm:p-4 bg-[#161622] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Kütüphanenize sorun: örn. 'Pratik tavuk tarifleri'..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:hover:bg-purple-600 transition-all shadow-md shrink-0"
                title="Gönder"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
