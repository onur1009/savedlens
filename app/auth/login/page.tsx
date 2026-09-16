'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookmarkPlus, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'E-posta veya şifre hatalı.'
            : error.message
        )
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    })
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
            Tekrar hoş geldin
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            SavedLens kütüphanene devam et
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="glass p-6 rounded-2xl flex flex-col gap-4 glow-border">
          {error && (
            <div
              role="alert"
              className="text-sm text-[var(--error)] bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3"
            >
              {error}
            </div>
          )}

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
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            disabled={isPending}
            className="btn-primary w-full mt-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Giriş Yap
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-5">
          Hesabın yok mu?{' '}
          <Link href="/auth/signup" className="text-[var(--accent-light)] hover:underline">
            Ücretsiz kaydol
          </Link>
        </p>
      </div>
    </div>
  )
}
