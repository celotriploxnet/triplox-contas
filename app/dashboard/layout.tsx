import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      {/* Topbar usando suas classes do globals.css */}
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/dashboard" className="brand">
            <span className="brand-dot" />
            <div>
              <div className="brand-title">TriploX Contas</div>
              <div className="brand-sub">Área Restrita</div>
            </div>
          </Link>

          <nav style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/nova-prestacao" className="btn-ghost">
              Nova prestação
            </Link>
            <Link href="/dashboard/historico" className="btn-ghost">
              Histórico
            </Link>
            <Link href="/dashboard/baixa-empresa" className="btn-ghost">
              Baixa
            </Link>
            <Link href="/dashboard/treinamentos" className="btn-ghost">
              Treinamentos
            </Link>
            <Link href="/admin" className="btn-ghost">
              Admin
            </Link>
            <Link href="/logout" className="btn-ghost">
              Sair
            </Link>
          </nav>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="app-container">{children}</main>
    </div>
  )
}