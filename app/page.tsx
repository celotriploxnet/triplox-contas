"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell">
      {/* Topbar com tema */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">TriploX Contas</div>
              <div className="brand-sub">Prestação de Contas</div>
            </div>
          </div>

          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
        </div>
      </header>

      <section className="app-container">
        <div className="card">
          <span className="pill">Sistema Online</span>

          <h1 className="h1 mt-3">Sistema de Prestação de Contas</h1>

          <p className="p-muted mt-2 max-w-2xl">
            Faça login para enviar uma nova prestação, anexar comprovantes e
            consultar o histórico.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary">
              Entrar agora <span>➜</span>
            </Link>

            <Link href="/dashboard" className="card-soft" style={{ textDecoration: "none" }}>
              <div className="h2">Ir para o Dashboard</div>
              <p className="p-muted mt-1">
                (se você já estiver logado, entra direto)
              </p>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card-soft">
            <div className="h2">📎 Comprovantes</div>
            <p className="p-muted mt-1">Anexe notas e recibos da viagem.</p>
          </div>

          <div className="card-soft">
            <div className="h2">🧾 Prestação</div>
            <p className="p-muted mt-1">Campos organizados e total automático.</p>
          </div>

          <div className="card-soft">
            <div className="h2">📚 Histórico</div>
            <p className="p-muted mt-1">Acesse tudo depois e baixe arquivos.</p>
          </div>
        </div>
      </section>
    </main>
  );
}