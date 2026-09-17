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
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <ExtensionSyncBridge userId={user.id} />
      <Sidebar user={sidebarUser} />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
