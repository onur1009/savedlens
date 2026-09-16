'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BookmarkPlus, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="mesh-bg min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-fade-up glass p-8 rounded-2xl glow-border">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-[0_0_24px_var(--accent-glow)] mx-auto mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Hesabınız oluşturuldu!
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            <strong>{email}</strong> adresiyle kaydınız tamamlandı. Şimdi kütüphanenize giriş yapabilirsiniz.
          </p>
          <Link href="/auth/login" className="btn-primary w-full mt-6 justify-center py-2.5 rounded-xl">
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-[0_0_24px_var(--accent-glow)] mb-4">
            <BookmarkPlus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            SavedLens&apos;e katıl
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Ücretsiz hesap oluştur, içeriklerini arşivle
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="glass p-6 rounded-2xl flex flex-col gap-4 glow-border">
          {error && (
            <div
              role="alert"
              className="text-sm text-[var(--error)] bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-medium text-[var(--text-secondary)]">
              Adın Soyadın
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                required
                autoComplete="name"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[var(--text-secondary)]">
              E-posta
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adiniz@sirket.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-[var(--text-secondary)]">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                minLength={6}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <button
            id="btn-signup"
            type="submit"
            disabled={isPending}
            className="btn-primary w-full mt-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Hesap Oluştur
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-5">
          Zaten hesabın var mı?{' '}
          <Link href="/auth/login" className="text-[var(--accent-light)] hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
