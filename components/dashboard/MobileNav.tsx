'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, FolderOpen, Tag, Star, Plus } from 'lucide-react'
import { useState } from 'react'
import QuickSaveModal from './QuickSaveModal'

const tabs = [
  { href: '/dashboard', label: 'Kütüphane', icon: LayoutGrid },
  { href: '/dashboard/collections', label: 'Koleksiyon', icon: FolderOpen },
  { href: '/dashboard/tags', label: 'Etiketler', icon: Tag },
  { href: '/dashboard?filter=starred', label: 'Favoriler', icon: Star },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--bg-surface)]/90 backdrop-blur-xl"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2 relative">
          {tabs.slice(0, 2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* Center FAB Button */}
          <button
            id="mobile-fab"
            onClick={() => setOpen(true)}
            className="w-12 h-12 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)] -mt-6 transition-transform active:scale-95 text-white"
            aria-label="Hızlı içerik kaydet"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>

          {tabs.slice(2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} />
          ))}
        </div>
      </nav>

      {open && <QuickSaveModal onClose={() => setOpen(false)} />}
    </>
  )
}

function MobileTab({
  tab,
  pathname,
}: {
  tab: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
  pathname: string
}) {
  const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
  return (
    <Link
      href={tab.href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
        isActive ? 'text-[var(--accent-light)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
    >
      <tab.icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  )
}
