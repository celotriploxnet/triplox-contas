export default function DashboardPage() {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Cabeçalho da página */}
      <div>
        <span className="pill">Dashboard</span>

        <h1 className="h1" style={{ marginTop: '1rem' }}>
          Bem-vindo, Usuário 👋
        </h1>

        <p className="p-muted" style={{ marginTop: '.5rem' }}>
          Aqui vai o conteúdo da sua dashboard.
        </p>
      </div>

      {/* Card principal */}
      <div className="card">
        <h2 className="h2">Resumo</h2>

        <p className="p-muted" style={{ marginTop: '.5rem' }}>
          Use o menu superior para acessar:
        </p>

        <ul style={{ marginTop: '1rem', display: 'grid', gap: '.5rem' }}>
          <li className="pill">Nova prestação</li>
          <li className="pill">Histórico</li>
          <li className="pill">Baixa</li>
          <li className="pill">Treinamentos</li>
        </ul>
      </div>
    </div>
  )
}