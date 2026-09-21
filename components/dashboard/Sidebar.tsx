'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  HeartPulse,
  BookOpen,
  LogOut,
  Folder,
  Plus,
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

interface SidebarCollection {
  id: string
  name: string
  color: string
  count: number
}

const mainNav = [
  { href: '/dashboard', label: 'Tüm Yer İmleri', icon: LayoutGrid, exact: true },
  { href: '/dashboard?platform=instagram', label: 'Instagram Arşivi', icon: InstagramIcon, platformMatch: 'instagram' },
  { href: '/dashboard/collections', label: 'Koleksiyon Yönetimi', icon: FolderOpen },
  { href: '/dashboard/tags', label: 'Etiketler', icon: Tag },
  { href: '/dashboard?filter=starred', label: 'Favoriler', icon: Star, filterMatch: 'starred' },
]

const toolNav = [
  { href: '/dashboard/settings/mobile', label: 'Mobil (Shortcuts & Bot)', icon: Smartphone },
  { href: '/dashboard/settings/sync', label: 'Chrome Uzantısı (Sync)', icon: RefreshCw },
  { href: '/dashboard/settings/export', label: 'Dışa Aktar (Export)', icon: Download },
]

const smartCategoryNav = [
  { href: '/dashboard?filter=recipe', label: 'Yemek & Tarifler', icon: ChefHat, filterMatch: 'recipe', badgeColor: 'text-amber-400' },
  { href: '/dashboard?filter=health', label: 'Sağlık & Doktor', icon: HeartPulse, filterMatch: 'health', badgeColor: 'text-emerald-400' },
  { href: '/dashboard?filter=code', label: 'Kod & Yapay Zeka', icon: Code2, filterMatch: 'code', badgeColor: 'text-indigo-400' },
  { href: '/dashboard?filter=location', label: 'Mekan & Gezi', icon: MapPin, filterMatch: 'location', badgeColor: 'text-blue-400' },
  { href: '/dashboard?filter=discount', label: 'Ürün & İndirim', icon: Ticket, filterMatch: 'discount', badgeColor: 'text-pink-400' },
  { href: '/dashboard?filter=book_movie', label: 'Kitap & Dizi', icon: BookOpen, filterMatch: 'book_movie', badgeColor: 'text-purple-400' },
]

interface SidebarProps {
  user: SidebarUser
  initialCollections?: SidebarCollection[]
}

export default function Sidebar({ user, initialCollections = [] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collections, setCollections] = useState<SidebarCollection[]>(initialCollections)

  const activeCollectionId = searchParams.get('collection')
  const activeFilter = searchParams.get('filter')
  const activePlatform = searchParams.get('platform')

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch('/api/v1/collections')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.collections)) {
            setCollections(data.collections)
          }
        }
      } catch {
        // ignore
      }
    }

    const handleUpdate = () => loadCollections()
    window.addEventListener('collections-updated', handleUpdate)
    return () => window.removeEventListener('collections-updated', handleUpdate)
  }, [])

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
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 scrollbar-hide">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 mb-1.5 font-bold">
          Genel
        </p>
        {mainNav.map((item) => {
          const isActive = item.exact
            ? pathname === '/dashboard' && !activeFilter && !activeCollectionId && !activePlatform
            : item.platformMatch
            ? activePlatform === item.platformMatch
            : item.filterMatch
            ? activeFilter === item.filterMatch
            : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-light)] border border-[var(--border-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <div className="divider my-2" />

        {/* ── Kullanıcı Koleksiyonları & Kategoriler ────────────── */}
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
            Koleksiyonlarım
          </span>
          <Link
            href="/dashboard/collections"
            className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-white transition-colors"
            title="Yeni Koleksiyon Ekle / Yönet"
          >
            <Plus className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Collections List */}
        <div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-hide">
          {collections.length > 0 ? (
            collections.map((col) => {
              const isColActive = activeCollectionId === col.id
              return (
                <Link
                  key={col.id}
                  href={`/dashboard?collection=${col.id}`}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isColActive
                      ? 'bg-purple-950/60 text-purple-200 border border-purple-500/50 shadow-sm font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: col.color || '#6366f1' }}
                    />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)] font-semibold shrink-0 ml-1">
                    {col.count}
                  </span>
                </Link>
              )
            })
          ) : (
            <Link
              href="/dashboard/collections"
              className="px-3 py-2 rounded-xl text-xs text-zinc-400 border border-dashed border-white/10 hover:border-purple-500/40 hover:text-purple-300 flex items-center gap-2 transition-colors"
            >
              <Folder className="w-3.5 h-3.5 text-zinc-500" />
              <span>+ İlk Koleksiyonu Aç</span>
            </Link>
          )}
        </div>

        <div className="divider my-2" />

        {/* ── Akıllı AI Kategorileri ───────────────────────────── */}
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
            Akıllı Kategoriler
          </span>
        </div>

        {smartCategoryNav.map((item) => {
          const isActive = activeFilter === item.filterMatch
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-light)] border border-[var(--border-accent)] font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <item.icon className={`w-3.5 h-3.5 shrink-0 ${item.badgeColor}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <div className="divider my-2" />

        {/* ── Araçlar & Yedekleme ──────────────────────────────── */}
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 mb-1.5 font-bold">
          Araçlar & Yedekleme
        </p>
        {toolNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-light)] border border-[var(--border-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-[var(--border)] px-3 py-3 flex flex-col gap-1">
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-red-950/20 transition-colors w-full text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>

        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
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
