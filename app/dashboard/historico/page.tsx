"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

type Prestacao = {
  id: string;
  dataViagem: string;
  destino: string;
  kmRodado: number;

  userNome?: string;

  gasolina?: number;
  alimentacao?: number;
  hospedagem?: number;
  totalViagem?: number;

  createdAt?: any;
};

function moeda(n: number) {
  return (Number(n || 0)).toFixed(2);
}

export default function Historico() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [prestacoes, setPrestacoes] = useState<Prestacao[]>([]);
  const [selecionada, setSelecionada] = useState<Prestacao | null>(null);

  const [comprovantes, setComprovantes] = useState<string[]>([]);
  const [carregandoComprovantes, setCarregandoComprovantes] = useState(false);

  const [apagando, setApagando] = useState(false);

  async function sair() {
    await signOut(auth);
    router.push("/login");
  }

  async function carregarHistorico(userId: string) {
    setCarregando(true);
    try {
      const q = query(
        collection(db, "prestacoes"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const lista: Prestacao[] = snap.docs.map((d) => {
        const data = d.data() as any;

        const gasolina = Number(data.gasolina || 0);
        const alimentacao = Number(data.alimentacao || 0);
        const hospedagem = Number(data.hospedagem || 0);

        const totalCalculado = gasolina + alimentacao + hospedagem;

        return {
          id: d.id,
          userNome: data.userNome || "—",

          dataViagem: data.dataViagem || "",
          destino: data.destino || "",
          kmRodado: Number(data.kmRodado || 0),

          gasolina,
          alimentacao,
          hospedagem,

          totalViagem:
            typeof data.totalViagem === "number" ? data.totalViagem : totalCalculado,

          createdAt: data.createdAt,
        };
      });

      setPrestacoes(lista);
      setSelecionada(lista[0] || null);
    } catch (e: any) {
      console.error("ERRO HISTÓRICO:", e);
      alert(e?.message || "Erro ao carregar histórico");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarComprovantes(prestacaoId: string) {
    setCarregandoComprovantes(true);
    setComprovantes([]);

    try {
      const urls: string[] = [];

      const compSnap = await getDocs(
        collection(db, "prestacoes", prestacaoId, "comprovantes")
      );

      compSnap.forEach((docu) => {
        const data = docu.data() as any;
        if (Array.isArray(data.urls)) urls.push(...data.urls);
      });

      setComprovantes(Array.from(new Set(urls)));
    } catch (e: any) {
      console.error("ERRO COMPROVANTES:", e);
      alert(e?.message || "Erro ao carregar comprovantes");
    } finally {
      setCarregandoComprovantes(false);
    }
  }

  async function excluirPrestacao() {
    if (!selecionada) return;
    if (!auth.currentUser) return;

    const ok = confirm(
      `Deseja excluir esta prestação?\n\nDestino: ${selecionada.destino}\nData: ${selecionada.dataViagem}\n\nEssa ação não pode ser desfeita.`
    );
    if (!ok) return;

    try {
      setApagando(true);

      // 1) apaga subcoleção comprovantes
      const compSnap = await getDocs(
        collection(db, "prestacoes", selecionada.id, "comprovantes")
      );
      for (const c of compSnap.docs) {
        await deleteDoc(doc(db, "prestacoes", selecionada.id, "comprovantes", c.id));
      }

      // 2) apaga doc principal
      await deleteDoc(doc(db, "prestacoes", selecionada.id));

      alert("Prestação excluída com sucesso!");

      // 3) recarrega lista
      await carregarHistorico(auth.currentUser.uid);
    } catch (e: any) {
      console.error("ERRO EXCLUIR:", e);
      alert(e?.message || "Erro ao excluir a prestação");
    } finally {
      setApagando(false);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      await carregarHistorico(user.uid);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (selecionada) carregarComprovantes(selecionada.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada?.id]);

  const total = useMemo(() => Number(selecionada?.totalViagem || 0), [selecionada]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-dot" />
            <div className="leading-tight">
              <div className="brand-title">TriploX Contas</div>
              <div className="brand-sub">Histórico</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-ghost">
              Início
            </Link>
            <Link href="/dashboard/nova-prestacao" className="btn-ghost">
              Nova prestação
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
            <span className="pill">Histórico</span>
            <h1 className="h1 mt-3">Minhas prestações</h1>
            <p className="p-muted mt-2">
              Selecione uma prestação para ver detalhes e comprovantes.
            </p>
          </div>

          <div className="card-soft w-full sm:w-[280px]">
            <p className="text-xs text-zinc-600">Total de prestações</p>
            <p className="mt-1 text-3xl font-extrabold">{prestacoes.length}</p>
          </div>
        </div>

        {carregando ? (
          <div className="card mt-6">
            <p className="p-muted">Carregando histórico…</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
            {/* LISTA */}
            <section className="card">
              <h2 className="h2 mb-4">📚 Lista</h2>

              {prestacoes.length === 0 && (
                <p className="p-muted">Nenhuma prestação encontrada.</p>
              )}

              <div className="space-y-3">
                {prestacoes.map((p) => {
                  const ativa = selecionada?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelecionada(p)}
                      className={`w-full text-left rounded-2xl border p-4 transition
                        ${ativa ? "bg-red-50 border-red-200" : "bg-white hover:bg-zinc-50"}`}
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-extrabold">{p.destino}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {p.dataViagem} • {p.userNome}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-zinc-500">Total</p>
                          <p className="font-extrabold">R$ {moeda(p.totalViagem || 0)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between text-xs text-zinc-500">
                        <span className="pill">KM {p.kmRodado}</span>
                        <span className="pill">ID {p.id.slice(0, 6)}…</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* DETALHES */}
            <section className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="h2">🔎 Detalhes</h2>
                  <p className="p-muted mt-1">
                    Informações da prestação selecionada.
                  </p>
                </div>

                {/* ✅ Botão Excluir */}
                <button
                  onClick={excluirPrestacao}
                  disabled={!selecionada || apagando}
                  className="btn-primary"
                  style={{
                    background: "linear-gradient(90deg, #b3122a, #7a1ea1)",
                  }}
                >
                  {apagando ? "Excluindo..." : "Excluir prestação 🗑️"}
                </button>
              </div>

              {!selecionada ? (
                <div className="card-soft mt-4">
                  <p className="p-muted">Selecione uma prestação na lista.</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="card-soft">
                      <p className="text-xs text-zinc-500">Destino</p>
                      <p className="font-extrabold mt-1">{selecionada.destino}</p>

                      <p className="text-xs text-zinc-500 mt-4">Data</p>
                      <p className="mt-1">{selecionada.dataViagem}</p>

                      <p className="text-xs text-zinc-500 mt-4">Enviado por</p>
                      <p className="mt-1">{selecionada.userNome}</p>
                    </div>

                    <div className="card-soft">
                      <p className="text-xs text-zinc-500">KM rodado</p>
                      <p className="text-4xl font-extrabold mt-1">
                        {selecionada.kmRodado}
                        <span className="ml-1 text-sm text-zinc-500">km</span>
                      </p>

                      <p className="text-xs text-zinc-500 mt-4">Total</p>
                      <p className="text-2xl font-extrabold mt-1">
                        R$ {moeda(total)}
                      </p>
                    </div>
                  </div>

                  <div className="card-soft mt-5">
                    <p className="font-extrabold mb-3">💸 Gastos</p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-zinc-500">Gasolina</p>
                        <p className="font-extrabold">
                          R$ {moeda(selecionada.gasolina || 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">Alimentação</p>
                        <p className="font-extrabold">
                          R$ {moeda(selecionada.alimentacao || 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">Hospedagem</p>
                        <p className="font-extrabold">
                          R$ {moeda(selecionada.hospedagem || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-extrabold mb-3">🧾 Comprovantes</h3>

                    {carregandoComprovantes ? (
                      <p className="p-muted">Carregando comprovantes…</p>
                    ) : comprovantes.length === 0 ? (
                      <p className="p-muted">Nenhum comprovante encontrado.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                  <p className="p-muted mt-4">
                    
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