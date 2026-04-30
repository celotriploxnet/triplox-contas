import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TreinExpresso',
  description: 'Sistema Triplo-X | Treinamento e Capacitação',

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },

  openGraph: {
    title: 'TreinExpresso',
    description: 'Sistema Triplo-X | Treinamento e Capacitação',
    url: 'https://treinoexpresso.com.br',
    siteName: 'TreinExpresso',
    images: [
      {
        url: 'https://treinoexpresso.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TreinExpresso',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'TreinExpresso',
    description: 'Sistema Triplo-X | Treinamento e Capacitação',
    images: ['https://treinoexpresso.com.br/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}