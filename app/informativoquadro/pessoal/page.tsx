import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informativo Quadro Pessoal",
  robots: { index: false, follow: false },
};

const colaboradores = [
  { nome: "FÁBIO MELO", foto: "/informativoquadro/pessoal/fabio.png" },
  { nome: "CATARINE LEAL", foto: "/informativoquadro/pessoal/catarine.png" },
  { nome: "JOÃO SANTOS", foto: "/informativoquadro/pessoal/joao.png" },
  { nome: "LORENA VASCONCELOS", foto: "/informativoquadro/pessoal/lorena.png" },
  { nome: "PAULO SANTANA", foto: "/informativoquadro/pessoal/paulo.png" },
  { nome: "ELISMAGNA SANTOS", foto: "/informativoquadro/pessoal/elismagna.png" },
  { nome: "ELIVALDO LEAL", foto: "/informativoquadro/pessoal/elivaldo.png" },
  { nome: "RITA LEAL", foto: "/informativoquadro/pessoal/rita.png" },
];

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#d61f2c 0%,#b51f5e 45%,#4a2eb0 100%)",
        padding: "24px 14px 34px",
      }}
    >
      <style>{`
.container{
  max-width:1180px;
  margin:auto;
  display:grid;
  gap:22px;
}

.header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:white;
  padding:14px 24px;
  border-radius:20px;
  box-shadow:0 10px 28px rgba(0,0,0,.15);
}

.header img{
  max-height:56px;
}

.panel{
  background:white;
  border-radius:28px;
  padding:22px;
  box-shadow:0 25px 50px rgba(0,0,0,.20);
}

.main-grid{
  display:grid;
  grid-template-columns:240px 1fr;
  gap:26px;
}

.member{
  width:200px;
  text-align:center;
  background:#fff;
  padding:10px;
  border-radius:20px;
  box-shadow:0 10px 22px rgba(0,0,0,.12);
}

.member-role{
  font-weight:900;
  margin-bottom:6px;
}

.member-photo-frame{
  background:linear-gradient(135deg,#d61f2c,#4a2eb0);
  padding:2px;
  border-radius:16px;
}

.member-photo{
  border-radius:14px;
  overflow:hidden;
  aspect-ratio:3/4;
  position:relative;
}

.member-photo img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.watermark{
  position:absolute;
  inset:0;
  display:flex;
  justify-content:center;
  align-items:center;
  transform:rotate(-25deg);
  font-weight:900;
  font-size:13px;
  color:rgba(255,255,255,.25);
  text-align:center;
}

.member-name{
  margin-top:8px;
  font-weight:800;
  font-size:.95rem;
}

.actions{
  display:flex;
  gap:6px;
  justify-content:center;
  margin-top:10px;
}

.btn{
  color:white;
  padding:6px 9px;
  border-radius:8px;
  font-weight:700;
  font-size:.75rem;
  text-decoration:none;
}

.right-title{
  text-align:center;
  font-weight:900;
  font-size:1.1rem;
}

.team{
  display:grid;
  grid-template-columns:repeat(4,150px);
  justify-content:center;
  gap:16px;
  margin-top:14px;
}

.team-card{
  width:150px;
  background:#fff;
  padding:9px;
  border-radius:18px;
  box-shadow:0 10px 22px rgba(0,0,0,.12);
  text-align:center;
}

.team-photo-frame{
  background:linear-gradient(135deg,#d61f2c,#4a2eb0);
  padding:2px;
  border-radius:14px;
}

.team-photo{
  aspect-ratio:3/4;
  border-radius:12px;
  overflow:hidden;
  position:relative;
}

.team-photo img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.team-name{
  margin-top:6px;
  font-weight:800;
  font-size:.85rem;
}

/* BLOCO TOKEN */

.warning{
  background:#fff;
  border-radius:22px;
  padding:24px;
  box-shadow:0 15px 35px rgba(0,0,0,.18);
  display:grid;
  grid-template-columns:1.2fr .8fr;
  gap:24px;
  align-items:center;
  border:1px solid rgba(214,31,44,.12);
}

.warning-left{
  display:grid;
  gap:16px;
}

.warning-top{
  display:flex;
  gap:14px;
  align-items:flex-start;
}

.warning-icon{
  width:52px;
  height:52px;
  border-radius:16px;
  display:grid;
  place-items:center;
  font-size:26px;
  background:linear-gradient(135deg,#d61f2c 0%, #b51f5e 45%, #4a2eb0 100%);
  color:white;
  box-shadow:0 10px 22px rgba(0,0,0,.14);
  flex-shrink:0;
}

.warning-title{
  font-weight:900;
  color:#d61f2c;
  font-size:1.2rem;
  margin-bottom:4px;
}

.warning-text{
  font-size:.95rem;
  line-height:1.6;
  color:#333;
}

.token-box{
  background:linear-gradient(180deg,#fff8f8 0%, #faf7ff 100%);
  border:1px solid rgba(214,31,44,.12);
  border-radius:18px;
  padding:18px;
  display:grid;
  gap:14px;
}

.token-box-title{
  font-weight:900;
  color:#3a3a3a;
  font-size:1rem;
  text-align:center;
}

.token-steps{
  display:grid;
  gap:10px;
}

.token-step{
  display:grid;
  grid-template-columns:40px 1fr;
  gap:10px;
  align-items:center;
  background:white;
  border-radius:14px;
  padding:10px 12px;
  box-shadow:0 6px 14px rgba(0,0,0,.06);
  border:1px solid rgba(0,0,0,.05);
}

.token-num{
  width:40px;
  height:40px;
  border-radius:12px;
  display:grid;
  place-items:center;
  color:white;
  font-weight:900;
  background:linear-gradient(135deg,#d61f2c 0%, #4a2eb0 100%);
}

.token-label{
  font-size:.95rem;
  font-weight:800;
  color:#2d2d2d;
  line-height:1.25;
}

.token-note{
  font-size:.88rem;
  line-height:1.5;
  color:#444;
  background:#fff;
  border-radius:14px;
  padding:12px 14px;
  border:1px dashed rgba(74,46,176,.25);
}

.support-box{
  background:#fff;
  border-radius:16px;
  padding:14px 16px;
  border:1px solid rgba(0,0,0,.06);
  box-shadow:0 6px 14px rgba(0,0,0,.05);
}

.support-title{
  font-weight:900;
  color:#d61f2c;
  margin-bottom:6px;
}

.support-box strong{
  color:#111;
}

.pos-img{
  display:flex;
  justify-content:center;
}

.pos-img img{
  width:100%;
  max-width:300px;
  border-radius:18px;
  box-shadow:0 12px 24px rgba(0,0,0,.16);
}

@media(max-width:900px){
  .main-grid{
    grid-template-columns:1fr;
  }

  .team{
    grid-template-columns:repeat(2,140px);
  }

  .team-card{
    width:140px;
  }

  .warning{
    grid-template-columns:1fr;
  }

  .pos-img img{
    max-width:220px;
  }
}
      `}</style>

      <div className="container">
        <header className="header">
          <img src="/logos/logotreinexpresso.png" alt="TreinExpresso" />
          <img src="/logos/logobradescoexpresso.png" alt="Bradesco Expresso" />
        </header>

        <section className="panel">
          <div className="main-grid">
            <div style={{ display: "grid", justifyItems: "center" }}>
              <div className="member">
                <div className="member-role">MULTIPLICADOR</div>

                <div className="member-photo-frame">
                  <div className="member-photo">
                    <img
                      src="/informativoquadro/pessoal/marcelo.png"
                      alt="Marcelo Sant'Anna"
                    />
                    <div className="watermark">TREINEXPRESSO</div>
                  </div>
                </div>

                <div className="member-name">Marcelo Sant&apos;Anna</div>

                <div className="actions">
                  <a
                    href="mailto:marcelo@treinexpresso.com.br"
                    className="btn"
                    style={{ background: "#4a2eb0" }}
                  >
                    Email
                  </a>

                  <a
                    href="https://wa.me/5571981284289"
                    className="btn"
                    style={{ background: "#25D366" }}
                  >
                    WhatsApp
                  </a>

                  <a
                    href="tel:+5571981284289"
                    className="btn"
                    style={{ background: "#d61f2c" }}
                  >
                    Ligar
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h2 className="right-title">COLABORADORES</h2>

              <div className="team">
                {colaboradores.map((c) => (
                  <div className="team-card" key={c.nome}>
                    <div className="team-photo-frame">
                      <div className="team-photo">
                        <img src={c.foto} alt={c.nome} />
                        <div className="watermark">TREINEXPRESSO</div>
                      </div>
                    </div>

                    <div className="team-name">{c.nome}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="warning">
          <div className="warning-left">
            <div className="warning-top">
              <div className="warning-icon">🛡️</div>

              <div>
                <div className="warning-title">Não caia em golpes</div>
                <div className="warning-text">
                  Nossa equipe nunca entra em contato pedindo para realizar qualquer tipo de transação financeira, transferências ou pagamentos de boletos.
                </div>
              </div>
            </div>

            <div className="token-box">
              <div className="token-box-title">Como validar no TOKEN da sua máquina (POS)</div>

              <div className="token-steps">
                <div className="token-step">
                  <div className="token-num">7</div>
                  <div className="token-label">Funções Administrativas</div>
                </div>

                <div className="token-step">
                  <div className="token-num">7</div>
                  <div className="token-label">Token</div>
                </div>

                <div className="token-step">
                  <div className="token-num">1</div>
                  <div className="token-label">Atendimento</div>
                </div>

                <div className="token-step">
                  <div className="token-num">3</div>
                  <div className="token-label">Multiplicador</div>
                </div>
              </div>

              <div className="token-note">
                <strong>TDS</strong> = Atendimento
                <br />
                <strong>Multiplicador</strong> = Identificação e Finalização
              </div>
            </div>

            <div className="support-box">
              <div className="support-title">Em caso de dúvida</div>
              Fale conosco ou com o suporte da TDS:
              <br />
              <br />
              <strong>0800-727-7667</strong>
              <br />
              WhatsApp <strong>(11) 3534-8599</strong>
            </div>
          </div>

          <div className="pos-img">
            <img
              src="/informativoquadro/pessoal/maquininha.jpg"
              alt="Passo a passo do token na máquina POS"
            />
          </div>
        </section>
      </div>
    </main>
  );
}