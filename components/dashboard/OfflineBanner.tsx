'use client'

import { Wifi } from 'lucide-react'

export default function OfflineBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-sm">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-amber-900/40 flex items-center justify-center">
        <Wifi className="w-4 h-4" />
      </div>
      <div>
        <span className="font-semibold">Offline Geliştirme Modu</span>
        <span className="text-amber-300/70 ml-2">
          — Aşağıdaki içerikler örnek verilerdir. Supabase bağlantısı kurulduğunda gerçek verilerin göreceksin.
        </span>
      </div>
    </div>
  )
}
