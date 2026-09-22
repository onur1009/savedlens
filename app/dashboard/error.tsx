'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error caught by boundary:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 gap-4 animate-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-bold text-white">
          Sayfa yüklenirken bir sorun oluştu
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {error.message || 'Veriler yüklenirken geçici bir bağlantı sorunu yaşandı.'}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Yeniden Dene</span>
        </button>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-2 transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Ana Sayfaya Dön</span>
        </Link>
      </div>
    </div>
  )
}
