'use client'

import { useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Table,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { MOCK_BOOKMARKS } from '@/lib/mock-data'

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null)

  function triggerDownload(format: 'csv' | 'json') {
    setDownloading(format)
    const link = document.createElement('a')
    link.href = `/api/v1/bookmarks/export?format=${format}`
    link.setAttribute('download', `savedlens_export.${format}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloading(null), 1000)
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Download className="w-6 h-6 text-[var(--accent-light)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Çoklu Format Dışa Aktarma (Multi-Format Export)
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Kayıtlı sosyal medya içeriklerinizi, kalıcı medya linklerini ve AI etiketlerinizi dilediğiniz formata dönüştürün.
        </p>
      </div>

      {/* Export Format Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CSV Card */}
        <div className="glass rounded-2xl p-6 glow-border flex flex-col justify-between gap-5 group">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Excel & CSV Tablosu
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                Türkçe karakterler için UTF-8 BOM destekli. Microsoft Excel, Google E-Tablolar ve Apple Numbers ile doğrudan açılır.
              </p>
            </div>
          </div>

          <button
            onClick={() => triggerDownload('csv')}
            disabled={downloading === 'csv'}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading === 'csv' ? 'İndiriliyor...' : 'CSV Olarak İndir (.csv)'}
          </button>
        </div>

        {/* JSON Card */}
        <div className="glass rounded-2xl p-6 glow-border flex flex-col justify-between gap-5 group">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                JSON & Notion Arşivi
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                Tüm ham veriler, etiket listeleri, AI özetleri ve çıkarıcı bayrakları içeren yapılandırılmış geliştirici formatı.
              </p>
            </div>
          </div>

          <button
            onClick={() => triggerDownload('json')}
            disabled={downloading === 'json'}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading === 'json' ? 'İndiriliyor...' : 'JSON Olarak İndir (.json)'}
          </button>
        </div>
      </div>

      {/* Live Preview Table */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[var(--accent-light)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Dışa Aktarılacak Veriler Önizlemesi ({MOCK_BOOKMARKS.length} kayıt)
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">Canlı Veri</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3 font-semibold">Platform</th>
                <th className="py-2.5 px-3 font-semibold">Yazar</th>
                <th className="py-2.5 px-3 font-semibold">Özet</th>
                <th className="py-2.5 px-3 font-semibold">Etiketler</th>
                <th className="py-2.5 px-3 font-semibold">Tür</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {MOCK_BOOKMARKS.slice(0, 4).map((b) => (
                <tr key={b.id} className="hover:bg-[var(--bg-surface)]">
                  <td className="py-2.5 px-3 font-medium uppercase text-[10px] text-[var(--accent-light)]">
                    {b.platform}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                    @{b.author_username}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)] max-w-xs truncate">
                    {b.ai_summary}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-muted)]">
                    {b.ai_tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-muted)] text-[10px]">
                    {b.media_type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
