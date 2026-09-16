'use client'

import { useState, useTransition } from 'react'
import { X, Link2, Sparkles, Loader2, Check } from 'lucide-react'

interface QuickSaveModalProps {
  onClose: () => void
}

export default function QuickSaveModal({ onClose }: QuickSaveModalProps) {
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
          setMessage(data.title ?? 'İçerik kaydedildi!')
          setUrl('')
          setTimeout(onClose, 1500)
        } else {
          throw new Error(data.error ?? 'Bir hata oluştu')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bir hata oluştu'
        setStatus('error')
        setMessage(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0 bg-black/60 backdrop-blur-sm animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Hızlı kaydetme"
    >
      <div className="w-full max-w-md glass p-5 rounded-2xl glow-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-sm">
              Hızlı İçerik Kaydet
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {status === 'success' && (
            <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3 py-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2 flex items-center gap-2">
              <X className="w-4 h-4 text-red-400" />
              <span>{message}</span>
            </div>
          )}

          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              id="modal-save-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Instagram, TikTok, YouTube linki..."
              required
              autoFocus
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              disabled={isPending}
            />
          </div>

          {/* Quick chip buttons */}
          <div className="flex gap-2 text-[11px] text-[var(--text-muted)] overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setUrl('https://www.instagram.com/p/tiramisu/')}
              className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] shrink-0"
            >
              🍰 Instagram
            </button>
            <button
              type="button"
              onClick={() => setUrl('https://www.tiktok.com/@video/123')}
              className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] shrink-0"
            >
              🎵 TikTok
            </button>
            <button
              type="button"
              onClick={() => setUrl('https://www.linkedin.com/posts/ai')}
              className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] shrink-0"
            >
              💼 LinkedIn
            </button>
          </div>

          <button
            id="modal-btn-save"
            type="submit"
            disabled={isPending || !url.trim()}
            className="btn-primary w-full py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI ile Kütüphaneye Ekle
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
