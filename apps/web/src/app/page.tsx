import Link from 'next/link'
import { t } from '../lib/i18n'

export default function HomePage() {
  return (
    <main className="nexo-public-home">
      <div className="nexo-public-home__brand" aria-hidden="true">
        N
      </div>
      <div className="nexo-public-home__content">
        <p className="nexo-eyebrow">{t('home.eyebrow')}</p>
        <h1>{t('home.title')}</h1>
        <p>{t('home.description')}</p>
        <div className="nexo-public-home__actions">
          <Link className="button primary" href="/login">
            {t('auth.enter')}
          </Link>
          <Link className="button ghost" href="/register">
            {t('auth.createAccount')}
          </Link>
        </div>
      </div>
    </main>
  )
}
