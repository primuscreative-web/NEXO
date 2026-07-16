import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="state-page">
      <p className="eyebrow">NEXO · FUNDAÇÃO SAAS</p>
      <h1>Identidade e organizações preparadas para operações reais.</h1>
      <p className="summary">
        Acesse sua conta, selecione uma organização e administre memberships,
        equipes, permissões, sessões e auditoria.
      </p>
      <div className="topbar-actions">
        <Link className="button primary" href="/login">
          Entrar
        </Link>
        <Link className="button ghost" href="/register">
          Criar conta
        </Link>
      </div>
    </main>
  )
}
