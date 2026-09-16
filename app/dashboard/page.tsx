import { Suspense } from 'react'
import { isSupabaseConfigured, MOCK_ITEMS, MOCK_USER } from '@/lib/mock-data'
import type { SavedItem } from '@/lib/mock-data'
import DashboardExplorer from '@/components/dashboard/DashboardExplorer'
import OfflineBanner from '@/components/dashboard/OfflineBanner'

export default async function DashboardPage() {
  let items: SavedItem[] = []
  let firstName = 'Demo'
  let offlineMode = false

  if (isSupabaseConfigured()) {
    // Online mode: fetch from Supabase
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Kullanıcı'

    const { data } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(60)

    items = (data ?? []) as SavedItem[]
  } else {
    // Offline mode: use mock data
    offlineMode = true
    items = MOCK_ITEMS
    firstName = MOCK_USER.user_metadata.full_name.split(' ')[0]
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Offline banner */}
      {offlineMode && <OfflineBanner />}

      {/* Header greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Merhaba, {firstName} 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {items.length} kayıtlı içerik
          {offlineMode && (
            <span className="ml-2 text-[var(--accent-light)] font-medium">
              (Dewey Çevrimdışı Modu Aktif)
            </span>
          )}
        </p>
      </div>

      {/* Interactive Explorer (QuickSaveBar + Search + Platform + Tags + Grid) */}
      <Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Kütüphane yükleniyor...</div>}>
        <DashboardExplorer initialItems={items} offlineMode={offlineMode} />
      </Suspense>
    </div>
  )
}
