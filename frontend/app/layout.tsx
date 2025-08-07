// frontend/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/app/providers'
import { Auth0Header } from '@/components/Auth0Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SecurePass - Zero-Knowledge File Sharing',
  description: 'Share files securely with end-to-end encryption',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <Auth0Header />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}