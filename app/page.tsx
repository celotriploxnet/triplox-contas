"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  /* =========================
     AUTH CHECK
     ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });

    return () => unsub();
  }, []);

  function handleAccessArea() {
    if (checkingAuth) return;

    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">TRIPLO-X</div>
              <div className="brand-sub">
                Sistema desenvolvido por Marcelo Sant&apos;Anna
              </div>
            </div>
          </div>

          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <section className="app-container">
        <div className="card">
          <span className="pill">Sistema Online</span>

          <h1 className="h1 mt-3">Sistema TreinoExpresso</h1>

          <p className="p-muted mt-2 max-w-2xl">
            Faça login para acessar seus treinamentos, agenda, arquivos
            obrigatórios e acompanhar tudo em um só lugar.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary">
              Entrar agora <span>➜</span>
            </Link>

            {/* BOTÃO INTELIGENTE */}
            <button
              onClick={handleAccessArea}
              disabled={checkingAuth}
              className="card-soft"
              style={{
                textDecoration: "none",
                cursor: checkingAuth ? "not-allowed" : "pointer",
                border: "1px solid rgba(15,15,25,.12)",
                textAlign: "left",
              }}
            >
              <div className="h2">Acessar minha área</div>
              <p className="p-muted mt-1">
                {checkingAuth
                  ? "Verificando acesso..."
                  : "(se você já estiver logado, entra direto)"}
              </p>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card-soft">
            <div className="h2">📎 Comprovantes</div>
            <p className="p-muted mt-1">
              Anexe notas e recibos de forma simples e segura.
            </p>
          </div>

          <div className="card-soft">
            <div className="h2">🧾 Prestação</div>
            <p className="p-muted mt-1">
              Campos organizados, cálculo automático e histórico.
            </p>
          </div>

          <div className="card-soft">
            <div className="h2">📚 Histórico</div>
            <p className="p-muted mt-1">
              Consulte registros anteriores e baixe documentos.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}