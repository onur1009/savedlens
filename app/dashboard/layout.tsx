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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg-base)]">
      <ExtensionSyncBridge userId={user.id} />
      <Sidebar user={sidebarUser} />
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
