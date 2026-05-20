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

  // NOVOS
  { nome: "HANNA NAVACK", foto: "/informativoquadro/pessoal/hanna.png" },
  { nome: "CAIO QUEIROZ", foto: "/informativoquadro/pessoal/caio.png" },
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
      </div>
    </main>
  );
}