"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";

import { auth, db, storage } from "../../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NovaPrestacao() {
  const router = useRouter();

  const [dataViagem, setDataViagem] = useState("");
  const [destino, setDestino] = useState("");

  const [kmInicial, setKmInicial] = useState("");
  const [kmFinal, setKmFinal] = useState("");

  const [gasolina, setGasolina] = useState("");
  const [alimentacao, setAlimentacao] = useState("");
  const [hospedagem, setHospedagem] = useState("");

  const [imagens, setImagens] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const kmRodado = (Number(kmFinal || 0) - Number(kmInicial || 0)) || 0;
  const totalViagem =
    Number(gasolina || 0) + Number(alimentacao || 0) + Number(hospedagem || 0);

  async function sair() {
    await signOut(auth);
    router.push("/login");
  }

  async function enviarPrestacao(e: React.FormEvent) {
    e.preventDefault();

    if (!auth.currentUser) return alert("Usuário não autenticado");
    if (kmRodado < 0) return alert("KM final não pode ser menor que KM inicial.");
    if (imagens.length > 10) return alert("Você pode anexar no máximo 10 imagens.");

    try {
      setLoading(true);

      const usuario = auth.currentUser;
      const nomeUsuario =
        usuario?.displayName || usuario?.email || "Usuário não identificado";

      const docRef = await addDoc(collection(db, "prestacoes"), {
        userId: usuario.uid,
        userNome: nomeUsuario,

        dataViagem,
        destino,
        kmInicial: Number(kmInicial || 0),
        kmFinal: Number(kmFinal || 0),
        kmRodado,
        gasolina: Number(gasolina || 0),
        alimentacao: Number(alimentacao || 0),
        hospedagem: Number(hospedagem || 0),
        totalViagem,

        createdAt: serverTimestamp(),
      });

      const urls: string[] = [];
      for (const file of imagens) {
        const path = `prestacoes/${usuario.uid}/${docRef.id}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file);
        urls.push(await getDownloadURL(fileRef));
      }

      if (urls.length > 0) {
        await addDoc(collection(db, "prestacoes", docRef.id, "comprovantes"), {
          urls,
          createdAt: serverTimestamp(),
        });
      }

      alert("Prestação enviada com sucesso!");

      setDataViagem("");
      setDestino("");
      setKmInicial("");
      setKmFinal("");
      setGasolina("");
      setAlimentacao("");
      setHospedagem("");
      setImagens([]);
    } catch (error: any) {
      console.error("ERRO FIREBASE:", error);
      alert(error?.message || "Erro ao enviar prestação");
    } finally {
      setLoading(false);
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
              <div className="brand-sub">Prestação de Contas</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-ghost">
              Início
            </Link>
            <Link href="/dashboard/historico" className="btn-ghost">
              Histórico
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
            <span className="pill">Nova prestação</span>
            <h1 className="h1 mt-3">Dados da viagem</h1>
            <p className="p-muted mt-2 max-w-2xl">
              Preencha os campos abaixo. O sistema calcula automaticamente KM rodado e Total.
            </p>
          </div>

          <div className="card-soft w-full sm:w-[320px]">
            <p className="text-xs text-zinc-600">Total da viagem</p>
            <p className="mt-1 text-3xl font-extrabold">
              R$ {totalViagem.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              gasolina + alimentação + hospedagem
            </p>
          </div>
        </div>

        <form onSubmit={enviarPrestacao} className="card mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Data da viagem</label>
              <input
                type="date"
                value={dataViagem}
                onChange={(e) => setDataViagem(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="label">Destino</label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                required
                placeholder="Ex: Salvador → Feira de Santana"
                className="input"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">KM inicial</label>
              <input
                type="number"
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="label">KM final</label>
              <input
                type="number"
                value={kmFinal}
                onChange={(e) => setKmFinal(e.target.value)}
                required
                className="input"
              />
            </div>

            <div className="card-soft">
              <p className="label">KM rodado</p>
              <p className="mt-2 text-3xl font-extrabold">
                {kmRodado < 0 ? 0 : kmRodado}
                <span className="ml-2 text-sm font-semibold text-zinc-500">km</span>
              </p>
              <p className="mt-1 text-xs text-zinc-600">(KM final - KM inicial)</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Gasolina (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gasolina}
                onChange={(e) => setGasolina(e.target.value)}
                required
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">Alimentação (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={alimentacao}
                onChange={(e) => setAlimentacao(e.target.value)}
                required
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">Hospedagem (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hospedagem}
                onChange={(e) => setHospedagem(e.target.value)}
                required
                className="input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mt-6 card-soft">
            <label className="label">Comprovantes (até 10 imagens)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                setImagens(files.slice(0, 10));
              }}
              className="mt-3 block w-full text-sm"
            />
            <p className="p-muted mt-2">
              Selecionadas: <b>{imagens.length}</b>/10
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="card-soft">
              <p className="text-xs text-zinc-600">Total da viagem</p>
              <p className="mt-1 text-lg font-extrabold">
                R$ {totalViagem.toFixed(2)}
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Enviando..." : "Enviar prestação"} <span>➜</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}