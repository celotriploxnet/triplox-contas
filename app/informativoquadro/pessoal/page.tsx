import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Informativo Quadro Pessoal',
  description: 'Apresentação da equipe TreinExpresso',
  robots: {
    index: false,
    follow: false,
  },
}

const colaboradores = [
  'FÁBIO MELO',
  'JOÃO SANTOS',
  'CATARINE LEAL',
  'PAULO SANTANA',
  'LORENA VASCONCELOS',
  'ELISMAGNA SANTOS',
]

const administracao = [
  'RITA LEAL',
  'ELIVALDO LEAL',
]

export default function Page() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg,#d61f2c 0%,#b51f5e 45%,#4a2eb0 100%)',
        padding: '30px 16px 40px',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gap: '30px',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 28px',
            background: 'rgba(255,255,255,0.94)',
            borderRadius: '22px',
            boxShadow: '0 12px 28px rgba(0,0,0,.12)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <img
  src="/logos/logotreinexpresso.png"
  alt="TreinExpresso"
  style={{
    height: '70px',
    objectFit: 'contain',
  }}
/>

          <img
            src="/logos/logobradescoexpresso.png"
            alt="Bradesco Expresso"
            style={{
              height: '55px',
              objectFit: 'contain',
            }}
          />
        </header>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 28,
            padding: '50px 40px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,.12)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2.4rem,5vw,3.5rem)',
              fontWeight: 900,
            }}
          >
            Marcelo Sant&apos;Anna
          </h1>

          <p
            style={{
              marginTop: 6,
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#666',
            }}
          >
            Multiplicador
          </p>

          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gap: 6,
              fontWeight: 600,
              fontSize: '1.05rem',
            }}
          >
            <span>marcelo@treinexpresso.com.br</span>
            <span>(71) 98128-4289</span>
          </div>
        </section>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 28,
            padding: '40px',
            boxShadow: '0 20px 50px rgba(0,0,0,.12)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              marginBottom: 30,
              fontSize: '2rem',
              fontWeight: 900,
            }}
          >
            COLABORADORES
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {colaboradores.map((nome) => (
              <Pessoa key={nome} nome={nome} />
            ))}
          </div>
        </section>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 28,
            padding: '40px',
            boxShadow: '0 20px 50px rgba(0,0,0,.12)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              marginBottom: 30,
              fontSize: '2rem',
              fontWeight: 900,
            }}
          >
            ADMINISTRAÇÃO / PROSPECÇÃO
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {administracao.map((nome) => (
              <Pessoa key={nome} nome={nome} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Pessoa({ nome }: { nome: string }) {
  const iniciais = nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

  return (
    <div
      style={{
        borderRadius: 22,
        padding: '22px',
        border: '1px solid rgba(0,0,0,.08)',
        background: '#fafafa',
        display: 'grid',
        gap: 12,
        justifyItems: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background:
            'linear-gradient(135deg,#d61f2c,#4a2eb0)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          fontSize: 26,
        }}
      >
        {iniciais}
      </div>

      <span
        style={{
          fontWeight: 800,
          fontSize: '1rem',
          textAlign: 'center',
        }}
      >
        {nome}
      </span>
    </div>
  )
}