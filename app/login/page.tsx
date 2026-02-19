"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
    });
    return () => unsub();
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setErro("Email ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="app-shell">
      {/* TOPO PADRONIZADO */}
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

          <Link href="/" className="btn-ghost">
            Início
          </Link>
        </div>
      </header>

      {/* CONTEÚDO */}
      <section className="app-container">
        <div className="mx-auto max-w-md">
          <div className="card">
            <span className="pill">Login</span>

            <h1 className="h1 mt-3">Entrar no sistema</h1>
            <p className="p-muted mt-2">
              Acesse com seu email corporativo para continuar.
            </p>

            <form onSubmit={entrar} className="mt-6 space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="seunome@treinexpresso.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Senha</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>

              {erro && (
                <div className="card-soft">
                  <p
                    className="p-muted"
                    style={{ color: "rgba(214,31,44,.95)", fontWeight: 700 }}
                  >
                    {erro}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={carregando}
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}