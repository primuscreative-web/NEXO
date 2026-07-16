import { Suspense } from 'react'
import { AuthForm } from '../../components/auth-form'

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-layout">
          <div className="skeleton" />
        </main>
      }
    >
      <AuthForm mode="verify" />
    </Suspense>
  )
}
