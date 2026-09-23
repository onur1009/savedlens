'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  DownloadCloud,
  Terminal,
  ShieldCheck,
  Zap,
  KeyRound,
  Copy,
  Check,
  Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SyncSettingsPage() {
  const [token, setToken] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserToken() {
      try {
        const res = await fetch('/api/v1/tokens')
        if (res.ok) {
          const data = await res.json()
          if (data.activeToken) {
            setToken(data.activeToken)
            localStorage.setItem('sl_active_token', data.activeToken)
            return
          }
        }
        const cached = localStorage.getItem('sl_active_token')
        if (cached) {
          setToken(cached)
          return
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const genRes = await fetch('/api/v1/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: 'Chrome Extension & Telegram' }),
          })
          if (genRes.ok) {
            const genData = await genRes.json()
            if (genData.rawToken) {
              setToken(genData.rawToken)
              localStorage.setItem('sl_active_token', genData.rawToken)
              return
            }
          }
          setToken(user.id)
        } else {
          setToken('demo-user-token-offline')
        }
      } catch {
        setToken('demo-user-token-offline')
      }
    }
    loadUserToken()
  }, [])

  async function handleGenerateNewToken() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Yenilenen Senkronizasyon Tokenı' }),
      })
      const data = await res.json()
      if (res.ok && data.rawToken) {
        setToken(data.rawToken)
        localStorage.setItem('sl_active_token', data.rawToken)
      }
    } catch {} finally {
      setIsGenerating(false)
    }
  }

  function handleCopyToken() {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleTestSync() {
    setTestStatus('loading')
    setTestResult(null)

    const testPayload = {
      bookmarks: [
        {
          platform: 'instagram',
          external_id: `ext_${Date.now()}`,
          permalink: `https://www.instagram.com/p/test_${Date.now().toString(36)}/`,
          author: {
            username: 'tasarim_gunlugu',
            full_name: 'Tasarım Günlüğü',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120',
          },
          content: {
            caption: '2026 UI Tasarım Trendleri — Canlı Senkronizasyon Testi!',
            media_type: 'carousel',
            media_urls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
          },
          saved_at: new Date().toISOString(),
        },
      ],
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['x-savedlens-token'] = token
      }

      const res = await fetch('/api/v1/sync/instagram', {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestStatus('success')
        setTestResult(`✓ Başarılı: ${data.count} kayıt SavedLens API'sine başarıyla aktarıldı. (${data.offline ? 'Çevrimdışı Simülasyon' : 'Supabase Canlı'})`)
      } else {
        setTestStatus('error')
        setTestResult(`✗ Hata: ${data.error || 'İşlem başarısız'}`)
      }
    } catch (err: unknown) {
      setTestStatus('error')
      const errorMessage = err instanceof Error ? err.message : 'Bağlantı hatası'
      setTestResult(`✗ İstek hatası: ${errorMessage}`)
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-[var(--accent-light)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Chrome Eklentisi & Senkronizasyon
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Instagram, Twitter, TikTok, YouTube ve gezindiğiniz web sayfalarını tek tıkla yapay zeka analizli olarak SavedLens kütüphanenize aktarın.
        </p>
      </div>

      {/* ── 1. Kişisel Eşitleme Anahtarı (Token) ─────────────── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent-light)]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Kişisel Eşitleme Anahtarınız (Sync Token)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Chrome eklentisinin tarayıcınızdan SavedLens hesabınıza güvenle bağlanmasını sağlar.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aktif
          </span>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/50 border border-[var(--border)]">
          <input
            type="text"
            readOnly
            value={token || 'Oturum bilgisi yükleniyor...'}
            className="flex-1 bg-transparent px-3 py-1 text-xs font-mono text-zinc-300 outline-none select-all"
          />
          <button
            onClick={handleGenerateNewToken}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Yeni bir API tokenı üret"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Üretiliyor...' : 'Yenile'}</span>
          </button>
          <button
            onClick={handleCopyToken}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Kurulum Rehberi (4 Adım) ───────────────────────── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                SavedLens Chrome Eklentisi (Manifest V3)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Proje dizininde hazır: <code className="text-[var(--accent-light)] font-mono">savedlens/extension/</code>
              </p>
            </div>
          </div>
        </div>

        {/* 4 Step Visual Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
                1
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                Uzantılar Sayfası
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Chrome adres çubuğuna <code className="text-zinc-200 font-mono">chrome://extensions</code> yazıp sağ üstteki <strong>Geliştirici Modu</strong>&apos;nu açın.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
                2
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                Klasörü Yükle
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                <strong>Paketlenmemiş Öğe Yükle</strong> butonuna tıklayın ve <code className="text-zinc-200 font-mono">savedlens/extension/</code> klasörünü seçin.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
                3
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                Tokeni Yapıştır
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Uzantı simgesine tıklayın ve yukarıdaki <strong>Eşitleme Anahtarınızı</strong> açılan alana yapıştırın.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
                4
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                Tek Tıkla Kaydet
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Herhangi bir sayfada <strong>Aktif Sekmeyi Kaydet</strong>&apos;e basın veya Instagram&apos;da kaydedilenleri toplu eşitleyin!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Canlı Test Bölümü ─────────────────────────────── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Canlı Senkronizasyon Testi (API Endpoint Doğrulaması)
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Tarayıcınızdan doğrudan <code className="text-[var(--accent-light)] font-mono">POST /api/v1/sync/instagram</code> rotasına test yükü gönderir.
            </p>
          </div>

          <button
            onClick={handleTestSync}
            disabled={testStatus === 'loading'}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-light)] transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            {testStatus === 'loading' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
            )}
            Test İsteği Gönder
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-mono border ${
              testStatus === 'success'
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
            }`}
          >
            {testResult}
          </div>
        )}
      </div>

      {/* ── 4. Güvenlik Bilgisi ──────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-light)]" />
          SavedLens Uçtan Uca Veri Güvenliği
        </h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Uzantı yalnızca yerel tarayıcınızda çalışır, sosyal medya şifrelerinizi veya tarayıcı çerezlerinizi asla dışarı aktarmaz. Yalnızca ekranınızda açık olan sayfaların bağlantılarını ve medya linklerini kendi SavedLens API uç noktanıza iletir.
        </p>
      </div>
    </div>
  )
}
