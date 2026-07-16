const foundations = [
  'Web',
  'API',
  'Worker',
  'Webhook Gateway',
  'PostgreSQL',
  'Redis',
] as const

export default function FoundationPage() {
  return (
    <main>
      <section className="panel" aria-labelledby="foundation-title">
        <p className="eyebrow">NEXO · FASE 0</p>
        <h1 id="foundation-title">Fundação técnica operacional</h1>
        <p className="summary">
          Esta superfície confirma o shell do frontend. Nenhuma funcionalidade
          de negócio foi habilitada.
        </p>
        <ul aria-label="Componentes da fundação">
          {foundations.map((foundation) => (
            <li key={foundation}>
              <span aria-hidden="true" />
              {foundation}
            </li>
          ))}
        </ul>
        <a href="/health">Verificar health check</a>
      </section>
    </main>
  )
}
