'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookmarkPlus,
  LayoutGrid,
  FolderOpen,
  Tag,
  Star,
  Smartphone,
  RefreshCw,
  Download,
  ChefHat,
  MapPin,
  Ticket,
  Code2,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

interface SidebarUser {
  id: string
  email: string
  user_metadata: { full_name?: string; [key: string]: unknown }
}

const mainNav = [
  { href: '/dashboard', label: 'Tüm Yer İmleri', icon: LayoutGrid },
  { href: '/dashboard?platform=instagram', label: 'Instagram Arşivi', icon: InstagramIcon },
  { href: '/dashboard/collections', label: 'Koleksiyonlar', icon: FolderOpen },
  { href: '/dashboard/tags', label: 'Etiketler', icon: Tag },
  { href: '/dashboard?filter=starred', label: 'Favoriler', icon: Star },
]

const toolNav = [
  { href: '/dashboard/settings/mobile', label: 'Mobil (Shortcuts & Bot)', icon: Smartphone },
  { href: '/dashboard/settings/sync', label: 'Chrome Uzantısı (Sync)', icon: RefreshCw },
  { href: '/dashboard/settings/export', label: 'Dışa Aktar (Export)', icon: Download },
]

const extractorNav = [
  { href: '/dashboard?filter=recipe', label: 'Tarifler', icon: ChefHat },
  { href: '/dashboard?filter=location', label: 'Mekanlar', icon: MapPin },
  { href: '/dashboard?filter=discount', label: 'İndirimler', icon: Ticket },
  { href: '/dashboard?filter=code', label: 'Kod & Yazılım', icon: Code2 },
]

interface SidebarProps {
  user: SidebarUser
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'Kullanıcı'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] z-20"
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-[0_0_16px_var(--accent-glow)]">
          <BookmarkPlus className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
          SavedLens
        </span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] border border-[var(--border-accent)]">
          V2.0
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 mb-2 font-semibold">
          Genel
        </p>
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="divider my-2.5" />

        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 mb-2 font-semibold">
          Araçlar & Yedekleme
        </p>
        {toolNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="divider my-2.5" />

        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 mb-2 font-semibold">
          Akıllı Çıkarıcılar
        </p>
        {extractorNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-[var(--border)] px-3 py-3 flex flex-col gap-1">
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-red-950/20 transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>

        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
  pathname: string
}) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[var(--accent-subtle)] text-[var(--accent-light)] border border-[var(--border-accent)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  )
}
