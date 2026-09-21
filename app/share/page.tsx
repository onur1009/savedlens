'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react'

export default function ShareTargetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-light)]" />
      </div>
    }>
      <ShareTargetContent />
    </Suspense>
  )
}

function ShareTargetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTitle = searchParams.get('title')
  const rawText = searchParams.get('text')
  const rawUrl = searchParams.get('url')

  const [status, setStatus] = useState<'analyzing' | 'success' | 'error'>('analyzing')
  const [resultItem, setResultItem] = useState<{ title?: string; author?: string; url?: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // Extract shared URL from url or text
    const textOrUrl = rawUrl || rawText || ''
    const match = textOrUrl.match(/https?:\/\/[^\s]+/i)
    const targetUrl = match ? match[0] : (rawUrl && rawUrl.startsWith('http') ? rawUrl : null)

    let isMounted = true

    async function handleShareIngest() {
      if (!targetUrl) {
        if (isMounted) {
          setStatus('error')
          setErrorMsg('Paylaşılan içerikte geçerli bir web bağlantısı bulunamadı.')
        }
        return
      }

      try {
        const res = await fetch('/api/v1/mobile/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            text: rawText || rawTitle || targetUrl,
          }),
        })

        const data = await res.json()
        if (res.ok && data.success) {
          if (isMounted) {
            setStatus('success')
            setResultItem({
              title: data.title || rawTitle || 'Paylaşılan İçerik',
              author: data.author || 'Sosyal Medya',
              url: targetUrl || undefined,
            })
          }
        } else {
          throw new Error(data.error || 'İçerik kaydedilemedi')
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error')
          const message = err instanceof Error ? err.message : 'Paylaşım işlenirken bir hata oluştu.'
          setErrorMsg(message)
        }
      }
    }

    handleShareIngest()

    return () => {
      isMounted = false
    }
  }, [rawTitle, rawText, rawUrl])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-md glass rounded-3xl p-6 sm:p-8 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex flex-col gap-6 text-center glow-border relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)]">
            <BookmarkPlus className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">SavedLens</span>
        </div>

        {/* State 1: Analyzing */}
        {status === 'analyzing' && (
          <div className="py-8 space-y-4 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] flex items-center justify-center mx-auto border border-[var(--accent)]/30 shadow-lg">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Paylaşım Kaydediliyor...</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Yapay zeka metni analiz ediyor, etiketliyor ve kütüphanenize ekliyor.
              </p>
            </div>
          </div>
        )}

        {/* State 2: Success */}
        {status === 'success' && resultItem && (
          <div className="py-4 space-y-5 animate-scale-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 text-xs font-bold border border-emerald-800/50 inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                SavedLens&apos;e Kaydedildi!
              </span>
              <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
                {resultItem.title}
              </h2>
              {resultItem.author && (
                <p className="text-xs text-zinc-400 font-medium">
                  {resultItem.author}
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Kütüphanede Göster</span>
                <ExternalLink className="w-4 h-4" />
              </Link>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
              >
                Paneli Aç
              </button>
            </div>
          </div>
        )}

        {/* State 3: Error */}
        {status === 'error' && (
          <div className="py-4 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-800/40 flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">İçerik Aktarılamadı</h2>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Panele Dön</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
