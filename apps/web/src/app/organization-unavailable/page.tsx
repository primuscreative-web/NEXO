import Link from 'next/link'
export default function OrganizationUnavailablePage() {
  return (
    <main className="state-page">
      <span className="badge warning">Organização indisponível</span>
      <h1>Este workspace está suspenso ou arquivado.</h1>
      <p>Selecione outra organização ou contate um proprietário.</p>
      <Link className="button primary" href="/app">
        Trocar organização
      </Link>
    </main>
  )
}
