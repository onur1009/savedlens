import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import ExtensionSyncBridge from '@/components/dashboard/ExtensionSyncBridge'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const sidebarUser = {
    id: user.id,
    email: user.email ?? '',
    user_metadata: {
      full_name: user.user_metadata?.full_name as string | undefined,
    },
  }

  let rawCollections: unknown[] = []
  try {
    const res = await supabase
      .from('collections')
      .select('*, bookmark_collections(count)')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    rawCollections = res.data || []
  } catch (err) {
    console.error('[DashboardLayout] Koleksiyon yükleme hatası:', err)
  }

  interface RawCol {
    id: string
    name: string
    color?: string | null
    icon?: string | null
    bookmark_collections?: Array<{ count?: number }>
  }

  const initialCollections = ((rawCollections as unknown as RawCol[]) || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color || '#6366f1',
    icon: c.icon || 'folder',
    count: c.bookmark_collections?.[0]?.count || 0,
  }))

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg-base)]">
      <ExtensionSyncBridge userId={user.id} />
      <Sidebar user={sidebarUser} initialCollections={initialCollections} />
      {/* Main content: fills remaining space next to sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 md:ml-64">
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 pb-24 md:pb-8 min-h-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
