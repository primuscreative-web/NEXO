import Link from 'next/link'
export default function AccessDeniedPage() {
  return (
    <main className="state-page">
      <span className="badge danger">Acesso negado</span>
      <h1>Você não possui permissão para esta ação.</h1>
      <p>Solicite acesso a um administrador da organização.</p>
      <Link className="button primary" href="/app">
        Voltar
      </Link>
    </main>
  )
}
