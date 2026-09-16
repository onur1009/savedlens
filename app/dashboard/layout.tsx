import { redirect } from 'next/navigation'
import { isSupabaseConfigured, MOCK_USER } from '@/lib/mock-data'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'

interface DashboardUser {
  id: string
  email: string
  user_metadata: { full_name?: string }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: DashboardUser

  if (isSupabaseConfigured()) {
    // Online mode: real auth check
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) redirect('/auth/login')
    user = {
      id: data.user.id,
      email: data.user.email ?? '',
      user_metadata: { full_name: data.user.user_metadata?.full_name as string | undefined },
    }
  } else {
    // Offline mode: use mock user, skip auth
    user = MOCK_USER
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
