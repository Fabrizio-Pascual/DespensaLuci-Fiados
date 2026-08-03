import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Nunito, Fraunces } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
})

export const metadata: Metadata = {
  title: 'Despensa de la Luci — Cuentas',
  description:
    'Cuentas de clientes (fiado) y proveedores de la Despensa de la Luci. Acceso solo para personal habilitado.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#7a8450',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${nunito.variable} ${fraunces.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
