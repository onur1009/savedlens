'use client'

import { useState, useTransition } from 'react'
import { Link2, Sparkles, Loader2, X, Check } from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'

interface QuickSaveBarProps {
  offlineMode?: boolean
  onItemAdded?: (item: SavedItem) => void
}

export default function QuickSaveBar({
  offlineMode = false,
  onItemAdded,
}: QuickSaveBarProps) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setStatus('success')
          setMessage(data.title ?? 'İçerik başarıyla kaydedildi!')
          if (data.item && onItemAdded) {
            onItemAdded(data.item)
          }
          setUrl('')
          setTimeout(() => setStatus('idle'), 4000)
        } else {
          throw new Error(data.error ?? 'Kaydetme başarısız')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bir hata oluştu'
        setStatus('error')
        setMessage(msg)
        setTimeout(() => setStatus('idle'), 4000)
      }
    })
  }

  function handleInsertExample(exampleUrl: string) {
    setUrl(exampleUrl)
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <form
        onSubmit={handleSave}
        className="glass p-1.5 rounded-2xl flex items-center gap-2 glow-border"
        aria-label="İçerik kaydet"
      >
        <div className="flex items-center gap-2.5 flex-1 px-3 py-1.5">
          <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            id="quick-save-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Instagram, TikTok, YouTube veya herhangi bir link yapıştır..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            disabled={isPending}
          />
          {url && !isPending && (
            <button
              type="button"
              onClick={() => setUrl('')}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1"
              aria-label="Temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          id="btn-save-url"
          type="submit"
          disabled={isPending || !url.trim()}
          className="btn-primary text-xs font-semibold py-2.5 px-4 shrink-0 rounded-xl flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI ile Kaydet</span>
            </>
          )}
        </button>
      </form>

      {/* Quick sample link chips */}
      <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--text-muted)] overflow-x-auto pb-1 scrollbar-hide">
        <span className="shrink-0">Örnek dene:</span>
        <button
          type="button"
          onClick={() => handleInsertExample('https://www.instagram.com/p/tiramisu-tarifi/')}
          className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors shrink-0"
        >
          🍰 Instagram Tarif
        </button>
        <button
          type="button"
          onClick={() => handleInsertExample('https://www.tiktok.com/@istanbul_kahve/video/1234')}
          className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors shrink-0"
        >
          ☕ TikTok Mekan
        </button>
        <button
          type="button"
          onClick={() => handleInsertExample('https://www.linkedin.com/posts/ai-trendler-2026')}
          className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors shrink-0"
        >
          💼 LinkedIn AI Post
        </button>
      </div>

      {/* Toast notification */}
      {status !== 'idle' && (
        <div
          role="status"
          className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 animate-fade-up ${
            status === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
          }`}
        >
          {status === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}
