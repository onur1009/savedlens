'use client'

import { useState } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  DownloadCloud,
  Terminal,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export default function SyncSettingsPage() {
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<string | null>(null)

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
            caption: '2026 UI Tasarım Trendleri — Senkronizasyon Testi!',
            media_type: 'carousel',
            media_urls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
          },
          saved_at: new Date().toISOString(),
        },
      ],
    }

    try {
      const res = await fetch('/api/v1/sync/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestStatus('success')
        setTestResult(`✓ Başarılı: ${data.count} kayıt SavedLens API'sine başarıyla aktarıldı. (${data.offline ? 'Çevrimdışı Simülasyon' : 'Supabase'})`)
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
          <RefreshCw className="w-6 h-6 text-[var(--accent-light)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Chrome Extension & Senkronizasyon
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Instagram ve sosyal medya kaydedilenlerinizi API kısıtlamalarına takılmadan tarayıcınızdan SavedLens&apos;e aktarın.
        </p>
      </div>

      {/* Extension Installation Card */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                SavedLens Sync Extension (Manifest V3)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Proje klasörünüzde hazır paketlenmiş: <code className="text-[var(--accent-light)] font-mono">extension/</code>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            V3 Uyumlu
          </span>
        </div>

        {/* 3 Step Install Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
              Uzantılar Sayfası
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Chrome/Brave adres çubuğuna <code className="text-zinc-300 font-mono">chrome://extensions</code> yazıp Geliştirici Modunu açın.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
              Paketlenmemiş Yükle
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Sol üstteki <strong>Paketlenmemiş Öğe Yükle</strong> butonuna basıp <code className="text-zinc-300 font-mono">savedlens/extension/</code> klasörünü seçin.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] text-xs font-bold flex items-center justify-center mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
              Instagram&apos;da Eşitle
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Instagram kaydedilenler sayfasındayken uzantı ikonuna tıklayın ve <strong>Eşitle</strong> butonuna basın.
            </p>
          </div>
        </div>
      </div>

      {/* Live Test Sync Section */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Canlı Senkronizasyon Testi (API Endpoint Doğrulaması)
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              <code className="text-[var(--accent-light)] font-mono">POST /api/v1/sync/instagram</code> rotasına örnek Dewey payload gönderir.
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

      {/* Technical Architecture Info */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-light)]" />
          Dewey Data Flow Güvenliği
        </h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Uzantı yalnızca yerel tarayıcınızda çalışır, Instagram şifrenizi veya oturum çerezlerinizi asla dışarı aktarmaz. Yalnızca ekranınızda açık olan kaydedilen gönderilerin bağlantılarını ve medya linklerini kendi SavedLens API uç noktanıza iletir.
        </p>
      </div>
    </div>
  )
}
