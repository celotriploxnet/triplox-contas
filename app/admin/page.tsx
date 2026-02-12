"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

type Prestacao = {
  id: string;
  userId: string;
  userNome?: string;

  dataViagem?: string;
  destino?: string;

  kmRodado?: number;

  gasolina?: number;
  alimentacao?: number;
  hospedagem?: number;
  totalViagem?: number;

  createdAt?: any;
};

function moeda(v?: number) {
  return (Number(v || 0)).toFixed(2);
}

export default function AdminPage() {
  const router = useRouter();

  // ✅ Defina aqui quais emails são ADMIN
  const ADMIN_EMAILS = useMemo(
    () => [
      "marcelo@treinexpresso.com.br",
      // se quiser outro, adicione aqui:
      // "seuoutroemail@gmail.com",
    ],
    []
  );

  const [userEmail, setUserEmail] = useState<string>("");
  const [carregando, setCarregando] = useState(true);

  const [prestacoes, setPrestacoes] = useState<Prestacao[]>([]);
  const [selecionada, setSelecionada] = useState<Prestacao | null>(null);

  const [comprovantes, setComprovantes] = useState<string[]>([]);
  const [carregandoComprovantes, setCarregandoComprovantes] = useState(false);

  const [busca, setBusca] = useState("");

  const isAdmin = useMemo(() => ADMIN_EMAILS.includes(userEmail), [ADMIN_EMAILS, userEmail]);

  async function sair() {
    await signOut(auth);
    router.push("/login");
  }

  async function carregarTudo() {
    setCarregando(true);
    try {
      const q = query(collection(db, "prestacoes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const lista: Prestacao[] = snap.docs.map((d) => {
        const data = d.data() as any;

        const gasolina = Number(data.gasolina || 0);
        const alimentacao = Number(data.alimentacao || 0);
        const hospedagem = Number(data.hospedagem || 0);
        const total =
          typeof data.totalViagem === "number"
            ? data.totalViagem
            : gasolina + alimentacao + hospedagem;

        return {
          id: d.id,
          userId: data.userId || "",
          userNome: data.userNome || data.userEmail || "—",
          dataViagem: data.dataViagem || "",
          destino: data.destino || "",
          kmRodado: Number(data.kmRodado || 0),
          gasolina,
          alimentacao,
          hospedagem,
          totalViagem: total,
          createdAt: data.createdAt,
        };
      });

      setPrestacoes(lista);
      setSelecionada(lista[0] || null);
    } catch (e: any) {
      console.error("ADMIN carregarTudo:", e);
      alert(e?.message || "Erro ao carregar prestações");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarComprovantes(prestacaoId: string) {
    setCarregandoComprovantes(true);
    setComprovantes([]);

    try {
      const urls: string[] = [];
      const snap = await getDocs(collection(db, "prestacoes", prestacaoId, "comprovantes"));

      snap.forEach((d) => {
        const data = d.data() as any;
        if (Array.isArray(data.urls)) urls.push(...data.urls);
      });

      setComprovantes(Array.from(new Set(urls)));
    } catch (e: any) {
      console.error("ADMIN comprovantes:", e);
      alert(e?.message || "Erro ao carregar comprovantes");
    } finally {
      setCarregandoComprovantes(false);
    }
  }

  async function excluirPrestacao(p: Prestacao) {
    const ok = confirm(
      `Tem certeza que deseja excluir a prestação?\n\nDestino: ${p.destino}\nData: ${p.dataViagem}\nUsuário: ${p.userNome}\n\nIsso remove o documento do Firestore.`
    );
    if (!ok) return;

    try {
      // Apaga docs da subcoleção comprovantes
      const compSnap = await getDocs(collection(db, "prestacoes", p.id, "comprovantes"));
      for (const c of compSnap.docs) {
        await deleteDoc(doc(db, "prestacoes", p.id, "comprovantes", c.id));
      }

      // Apaga doc principal
      await deleteDoc(doc(db, "prestacoes", p.id));

      alert("Prestação excluída com sucesso!");
      setSelecionada(null);
      setComprovantes([]);
      await carregarTudo();
    } catch (e: any) {
      console.error("ADMIN excluirPrestacao:", e);
      alert(e?.message || "Erro ao excluir");
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const email = u.email || "";
      setUserEmail(email);

      // bloqueia se não for admin
      if (!ADMIN_EMAILS.includes(email)) {
        router.push("/dashboard"); // joga de volta
        return;
      }

      await carregarTudo();
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selecionada?.id) carregarComprovantes(selecionada.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada?.id]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return prestacoes;

    return prestacoes.filter((p) => {
      return (
        (p.destino || "").toLowerCase().includes(q) ||
        (p.dataViagem || "").toLowerCase().includes(q) ||
        (p.userNome || "").toLowerCase().includes(q) ||
        (p.userId || "").toLowerCase().includes(q)
      );
    });
  }, [prestacoes, busca]);

  if (!isAdmin && userEmail) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <span className="brand-dot" />
              <div className="leading-tight">
                <div className="brand-title">TriploX Contas</div>
                <div className="brand-sub">Admin</div>
              </div>
            </div>
          </div>
        </header>

        <section className="app-container">
          <div className="card">
            <h1 className="h1">Acesso negado</h1>
            <p className="p-muted mt-2">
              Seu login (<b>{userEmail}</b>) não tem permissão de administrador.
            </p>
            <div className="mt-5 flex gap-2">
              <Link href="/dashboard" className="btn-primary">
                Voltar ao Dashboard ➜
              </Link>
              <button onClick={sair} className="btn-ghost" style={{ color: "#fff" }}>
                Sair
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">TriploX Contas</div>
              <div className="brand-sub">Administrador</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
            <Link href="/dashboard/historico" className="btn-ghost">
              Meu histórico
            </Link>
            <button onClick={sair} className="btn-ghost">
              Sair
            </button>
          </nav>
        </div>
      </header>

      <section className="app-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="pill">Admin</span>
            <h1 className="h1 mt-3">Controle de Prestações</h1>
            <p className="p-muted mt-2">
              Logado como <b>{userEmail}</b>
            </p>
          </div>

          <div className="card-soft w-full sm:w-[360px]">
            <p className="text-xs text-zinc-600">Total de prestações</p>
            <p className="mt-1 text-3xl font-extrabold">{prestacoes.length}</p>
          </div>
        </div>

        <div className="card mt-6">
          <label className="label">Buscar (destino, data, usuário)</label>
          <input
            className="input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex: salvador, 2026-02, fulano..."
          />
        </div>

        {carregando ? (
          <div className="card mt-6">
            <p className="p-muted">Carregando…</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
            {/* LISTA */}
            <section className="card">
              <h2 className="h2">📚 Todas as prestações</h2>
              <p className="p-muted mt-1">Clique em uma para ver detalhes.</p>

              <div className="mt-4 space-y-3">
                {filtradas.map((p) => {
                  const ativa = selecionada?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelecionada(p)}
                      className={`w-full text-left rounded-2xl border p-4 transition ${
                        ativa ? "bg-red-50 border-red-200" : "bg-white hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-extrabold">{p.destino || "—"}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {p.dataViagem || "—"} • {p.userNome || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">Total</p>
                          <p className="font-extrabold">R$ {moeda(p.totalViagem)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between text-xs text-zinc-500">
                        <span className="pill">KM {p.kmRodado || 0}</span>
                        <span className="pill">ID {p.id.slice(0, 6)}…</span>
                      </div>
                    </button>
                  );
                })}

                {filtradas.length === 0 && (
                  <p className="p-muted">Nenhum resultado para esta busca.</p>
                )}
              </div>
            </section>

            {/* DETALHES */}
            <section className="card">
              <h2 className="h2">🔎 Detalhes</h2>

              {!selecionada ? (
                <p className="p-muted mt-3">Selecione uma prestação.</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="card-soft">
                      <p className="text-xs text-zinc-600">Usuário</p>
                      <p className="font-extrabold mt-1">{selecionada.userNome}</p>

                      <p className="text-xs text-zinc-600 mt-4">Destino</p>
                      <p className="mt-1">{selecionada.destino}</p>

                      <p className="text-xs text-zinc-600 mt-4">Data</p>
                      <p className="mt-1">{selecionada.dataViagem}</p>
                    </div>

                    <div className="card-soft">
                      <p className="text-xs text-zinc-600">KM rodado</p>
                      <p className="text-4xl font-extrabold mt-1">
                        {selecionada.kmRodado || 0}
                        <span className="ml-1 text-sm text-zinc-500">km</span>
                      </p>

                      <p className="text-xs text-zinc-600 mt-4">Total</p>
                      <p className="text-2xl font-extrabold mt-1">
                        R$ {moeda(selecionada.totalViagem)}
                      </p>
                    </div>
                  </div>

                  <div className="card-soft mt-5">
                    <p className="font-extrabold">💸 Gastos</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-zinc-600">Gasolina</p>
                        <p className="font-extrabold">R$ {moeda(selecionada.gasolina)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-600">Alimentação</p>
                        <p className="font-extrabold">R$ {moeda(selecionada.alimentacao)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-600">Hospedagem</p>
                        <p className="font-extrabold">R$ {moeda(selecionada.hospedagem)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold">🧾 Comprovantes</h3>
                      {carregandoComprovantes && <span className="pill">Carregando…</span>}
                    </div>

                    {!carregandoComprovantes && comprovantes.length === 0 ? (
                      <p className="p-muted mt-3">Nenhum comprovante encontrado.</p>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {comprovantes.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-2xl border bg-white"
                          >
                            <img
                              src={url}
                              alt={`Comprovante ${i + 1}`}
                              className="h-32 w-full object-cover"
                            />
                            <div className="p-2 text-center text-xs text-zinc-600">
                              Abrir / Baixar
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-zinc-500 break-all">
                      ID: {selecionada.id}
                    </p>
                    <button
                      onClick={() => excluirPrestacao(selecionada)}
                      className="btn-primary"
                      style={{ background: "linear-gradient(90deg, #b3122a, #7a1ea1)" }}
                    >
                      Excluir prestação 🗑️
                    </button>
                  </div>

                  <p className="p-muted mt-3">
                    Obs.: a exclusão remove os documentos do Firestore. Para apagar arquivos do Storage
                    também, o ideal é guardar o “path” do arquivo no banco (eu te ajusto isso depois).
                  </p>
                </>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}