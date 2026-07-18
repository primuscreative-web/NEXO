import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@nexo/ui/styles.css'
import './styles.css'
import { ThemeProvider } from '../components/theme-provider'
import { themeBootstrapScript } from '../lib/theme'

export const metadata: Metadata = {
  title: { default: 'NEXO', template: '%s · NEXO' },
  description: 'Plataforma empresarial omnichannel NEXO',
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
