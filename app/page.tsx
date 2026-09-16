import Link from 'next/link'
import { BookmarkPlus, Sparkles, Layers, ArrowRight, Zap, Globe, Mic } from 'lucide-react'

const features = [
  {
    icon: BookmarkPlus,
    title: 'Sıfır Sürtünmeli Kaydetme',
    desc: 'Instagram, TikTok, X, YouTube veya herhangi bir web sayfasını tek tıkla kaydet.',
  },
  {
    icon: Sparkles,
    title: 'AI Özeti & Etiketler',
    desc: 'Yapay zeka her içeriği otomatik özetler, etiketler ve renge göre sınıflandırır.',
  },
  {
    icon: Zap,
    title: 'Akıllı Çıkarıcılar',
    desc: 'Tarif adımlarını, harita linklerini ve indirim kodlarını otomatik çıkar.',
  },
  {
    icon: Mic,
    title: 'Ses Deşifresi',
    desc: 'Reels ve TikTok\'ta konuşulanları metne döker; içerik içinde kelime araması yap.',
  },
  {
    icon: Globe,
    title: 'Anti-Kayıp Arşiv',
    desc: 'Gönderi silinse bile medyan güvende. Kalıcı bulut yedekleme ile kayıplar tarihe karışır.',
  },
  {
    icon: Layers,
    title: 'Kütüphane AI Chat',
    desc: 'Tüm kütüphaneni bilen bir asistan. "Geçen ay kaydettiğim İtalya mekanları?" yeter.',
  },
]

export default function LandingPage() {
  return (
    <div className="mesh-bg min-h-screen flex flex-col relative">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-[0_0_16px_var(--accent-glow)]">
            <BookmarkPlus className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
            SavedLens
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-light)] border border-[var(--border-accent)] ml-1">
            V2.0
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm">
            Giriş Yap
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm">
            Ücretsiz Başla
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 stagger">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-sm text-sm text-[var(--text-secondary)] mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-light)]" />
          AI destekli sosyal medya kütüphanesi • V2.0 Yayında
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter mb-6 max-w-4xl">
          <span className="gradient-text">Her şeyi kaydet.</span>
          <br />
          <span className="text-[var(--text-primary)]">Hiçbir şeyi kaybetme.</span>
        </h1>

        <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mb-10 leading-relaxed">
          Instagram, TikTok, LinkedIn, YouTube ve web içerikleri — yapay zeka özetler,
          etiketler ve anında bulmanı sağlar. Kalıcı bulut medya yedekleme ve Notion/CSV dışa aktarma.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/signup"
            className="btn-primary text-base px-7 py-3 rounded-2xl flex items-center justify-center gap-2"
            id="cta-signup"
          >
            Hemen Başla
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="btn-ghost text-base px-7 py-3 rounded-2xl"
            id="cta-login"
          >
            Kütüphaneye Git
          </Link>
        </div>

        {/* ── Feature grid ───────────────────────────────────── */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl w-full text-left">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass card-lift glow-border p-6 rounded-2xl flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
                <f.icon className="w-5 h-5 text-[var(--accent-light)]" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="relative z-10 py-6 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
        © {new Date().getFullYear()} SavedLens — Kişisel İçerik Arşivleme & Bilgi Yönetim Platformu.
      </footer>
    </div>
  )
}
