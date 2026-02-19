'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'

import { auth } from '@/lib/firebase'
import '../globals.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (e) {
      console.error('Erro ao sair:', e)
      alert('Não foi possível sair. Tente novamente.')
    }
  }

  return (
    <div className="app-shell">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar-inner">
          {/* BRAND */}
          <div className="brand">
            <div className="brand-dot" />
            <div>
              <div className="brand-title">TreinoExpresso</div>
              <div className="brand-sub">Gestão de Treinamentos</div>
            </div>
          </div>

          {/* MENU */}
          <nav
            style={{
              display: 'flex',
              gap: '.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Link href="/dashboard" className="btn-ghost">
              Início
            </Link>

            <Link href="/dashboard/treinamentos" className="btn-ghost">
              Treinamentos
            </Link>

            <Link href="/dashboard/agenda" className="btn-ghost">
              Agenda
            </Link>

            <Link href="/dashboard/nova-prestacao" className="btn-ghost">
              Nova Prestação
            </Link>

            <Link href="/dashboard/historico" className="btn-ghost">
              Histórico
            </Link>

            <Link href="/dashboard/baixa-empresa" className="btn-ghost">
              Baixa
            </Link>

            {/* LOGOUT */}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-ghost"
              style={{
                borderColor: 'rgba(255,255,255,.45)',
              }}
              title="Sair do sistema"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="app-container">{children}</main>
    </div>
  )
}