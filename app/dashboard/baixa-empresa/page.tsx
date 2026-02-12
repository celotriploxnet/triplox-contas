"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";

export default function BaixaEmpresaPage() {
  const router = useRouter();

  const [nomeExpresso, setNomeExpresso] = useState("");
  const [chave, setChave] = useState("");
  const [agencia, setAgencia] = useState("");
  const [pacb, setPacb] = useState("");
  const [motivo, setMotivo] = useState("");
  const [emailGerente, setEmailGerente] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  async function sair() {
    await signOut(auth);
    router.push("/login");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setEnviando(true);

    try {
      const u = auth.currentUser;

      const resp = await fetch("/api/baixa-empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeExpresso,
          chave,
          agencia,
          pacb,
          motivo,
          emailGerente,
          solicitanteEmail: u?.email || "",
          solicitanteNome: u?.displayName || "",
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data?.ok) {
        throw new Error(data?.message || "Falha ao enviar solicitação.");
      }

      setMsg("✅ Solicitação enviada com sucesso para marcelo@treinexpresso.com.br!");
      // opcional: limpar
      setNomeExpresso("");
      setChave("");
      setAgencia("");
      setPacb("");
      setMotivo("");
      setEmailGerente("");
    } catch (err: any) {
      setMsg(`❌ ${err.message || "Erro ao enviar."}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">TriploX Contas</div>
              <div className="brand-sub">Solicitação de baixa</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-ghost">
              Início
            </Link>
            <button onClick={sair} className="btn-ghost">
              Sair
            </button>
          </nav>
        </div>
      </header>

      <section className="app-container">
        <div>
          <span className="pill">Formulário</span>
          <h1 className="h1 mt-3">Solicitar baixa de empresa</h1>
          <p className="p-muted mt-2">
            Preencha os dados e clique em <b>Enviar</b>. O e-mail será enviado automaticamente.
          </p>
        </div>

        <form onSubmit={enviar} className="card mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome do Expresso</label>
              <input className="input" value={nomeExpresso} onChange={(e) => setNomeExpresso(e.target.value)} required />
            </div>

            <div>
              <label className="label">Chave</label>
              <input className="input" value={chave} onChange={(e) => setChave(e.target.value)} required />
            </div>

            <div>
              <label className="label">Agência</label>
              <input className="input" value={agencia} onChange={(e) => setAgencia(e.target.value)} required />
            </div>

            <div>
              <label className="label">PACB</label>
              <input className="input" value={pacb} onChange={(e) => setPacb(e.target.value)} required />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Motivo do pedido de baixa</label>
              <textarea className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} required rows={5} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">E-mail do gerente da agência</label>
              <input className="input" type="email" value={emailGerente} onChange={(e) => setEmailGerente(e.target.value)} required />
            </div>
          </div>

          {msg && (
            <div className="card-soft mt-5">
              <p className="font-semibold">{msg}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/dashboard" className="btn-ghost" style={{ color: "#fff" }}>
              Voltar
            </Link>
            <button className="btn-primary" type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar solicitação ➜"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}