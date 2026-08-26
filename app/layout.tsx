import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Greece Tracker',
  description: 'Suivi des prix de vols Paris → Grèce — aller one-way, alertes prix, calendrier.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
