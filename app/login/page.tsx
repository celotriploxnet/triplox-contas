"use client";

import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  nome?: string;
  email?: string;
  telefone?: string;
  nascimento?: string;
  role?: "admin" | "operacional" | "consulta";
  ativo?: boolean;
};

type AccessValidation =
  | {
      ok: true;
      profile: UserProfile;
    }
  | {
      ok: false;
      mensagem: string;
    };

function mensagemErroFirebase(error: unknown) {
  const failure = error as { code?: string };
  const code = String(failure?.code || '');
  console.error('Falha durante o acesso ao portal:', error);

  if (code === 'permission-denied') {
    return 'A autenticação ocorreu, mas o sistema não conseguiu consultar seu cadastro. Verifique as regras do Firestore para a coleção users.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Não foi possível conectar ao sistema. Verifique sua internet e tente novamente.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.';
  }
  if (code === 'auth/user-disabled') {
    return 'Este usuário está desativado no Firebase Authentication. Fale com o administrador.';
  }
  if (code) return `Não foi possível entrar no sistema. Código do erro: ${code}.`;
  return 'Não foi possível validar seu acesso no momento.';
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [erro, setErro] = useState("");

  async function validarAcesso(uid: string): Promise<AccessValidation> {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        ok: false,
        mensagem:
          "Seu usuário não possui cadastro liberado no sistema. Fale com o administrador.",
      };
    }

    const profile = snap.data() as UserProfile;

    if (profile.ativo !== true) {
      return {
        ok: false,
        mensagem:
          "Seu acesso está inativo no sistema. Fale com o administrador.",
      };
    }

    return {
      ok: true,
      profile,
    };
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setVerificandoSessao(false);
          return;
        }

        const validacao = await validarAcesso(user.uid);

        if (validacao.ok) {
          router.push("/dashboard");
          return;
        }

        await signOut(auth);
        setErro(validacao.mensagem);
        setVerificandoSessao(false);
      } catch (error) {
        try {
          await signOut(auth);
        } catch {}
        setErro(mensagemErroFirebase(error));
        setVerificandoSessao(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const validacao = await validarAcesso(cred.user.uid);

      if (!validacao.ok) {
        await signOut(auth);
        setErro(validacao.mensagem);
        return;
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const failure = err as { code?: string };
      const code = String(failure?.code || "");

      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found") ||
        code.includes("auth/invalid-email")
      ) {
        setErro("Email ou senha inválidos.");
      } else {
        setErro(mensagemErroFirebase(err));
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="app-shell">
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
                  disabled={carregando || verificandoSessao}
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
                  disabled={carregando || verificandoSessao}
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
                disabled={carregando || verificandoSessao}
              >
                {verificandoSessao
                  ? "Verificando acesso..."
                  : carregando
                    ? "Entrando..."
                    : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
