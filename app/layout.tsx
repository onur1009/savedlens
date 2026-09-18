import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SavedLens — Your AI-Powered Content Library',
    template: '%s | SavedLens',
  },
  description:
    'Save anything from the web — Reels, articles, recipes, places — and let AI organise, summarise, and surface it for you.',
  keywords: ['content library', 'AI bookmarks', 'save instagram', 'save tiktok', 'knowledge base'],
  openGraph: {
    title: 'SavedLens — Your AI-Powered Content Library',
    description: 'Save anything. Find everything. Powered by AI.',
    type: 'website',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SavedLens',
  },
  manifest: '/manifest.json',
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  )
}
