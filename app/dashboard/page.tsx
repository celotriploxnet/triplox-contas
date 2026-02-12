"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/config";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // ✅ Defina aqui quais emails são ADMIN
  const ADMIN_EMAILS = useMemo(
    () => [
      "marcelo@treinexpresso.com.br",
      // "seuoutroemail@gmail.com",
    ],
    []
  );

  const email = user?.email || "";
  const nome = user?.displayName || "Usuário";
  const isAdmin = useMemo(() => ADMIN_EMAILS.includes(email), [ADMIN_EMAILS, email]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
    });

    return () => unsub();
  }, [router]);

  async function sair() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">TriploX Contas</div>
              <div className="brand-sub">Área Restrita</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard/nova-prestacao" className="btn-ghost">
              Nova prestação
            </Link>

            <Link href="/dashboard/historico" className="btn-ghost">
              Histórico
            </Link>

            {/* ✅ Novo link */}
            <Link href="/dashboard/baixa-empresa" className="btn-ghost">
              Baixa
            </Link>

            {isAdmin && (
              <Link href="/admin" className="btn-ghost">
                Admin
              </Link>
            )}

            <button onClick={sair} className="btn-ghost">
              Sair
            </button>
          </nav>
        </div>
      </header>

      <section className="app-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="pill">Dashboard</span>
            <h1 className="h1 mt-3">Bem-vindo, {nome} 👋</h1>
            <p className="p-muted mt-2">
              Você está logado como: <b>{email || "—"}</b>
            </p>
          </div>

          <div className="card-soft w-full sm:w-[360px]">
            <p className="text-xs text-zinc-600">Sessão ativa</p>
            <p className="mt-1 text-lg font-extrabold">{email || "—"}</p>
            <p className="mt-1 text-xs text-zinc-600">
              Se não for você, clique em Sair.
            </p>
          </div>
        </div>

        {/* ✅ Cards padronizados */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/nova-prestacao" className="card">
            <h2 className="h2">➕ Nova prestação</h2>
            <p className="p-muted mt-2">
              Envie uma nova prestação com dados e comprovantes.
            </p>
          </Link>

          <Link href="/dashboard/historico" className="card">
            <h2 className="h2">📚 Histórico</h2>
            <p className="p-muted mt-2">
              Veja prestações enviadas e abra os comprovantes.
            </p>
          </Link>

          <Link href="/dashboard/baixa-empresa" className="card">
            <h2 className="h2">📩 Baixa de Expresso</h2>
            <p className="p-muted mt-2">
              Envie uma solicitação de baixa de empresa diretamente para o administrativo.
            </p>
          </Link>

          {isAdmin && (
            <Link href="/admin" className="card">
              <h2 className="h2">🛠️ Administração</h2>
              <p className="p-muted mt-2">
                Visualize e controle todas as prestações de todos os usuários.
              </p>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
