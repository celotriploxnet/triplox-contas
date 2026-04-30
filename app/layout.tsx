import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TreinExpresso',
  description: 'Treinamento e Capacitação',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}