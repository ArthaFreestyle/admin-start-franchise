import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './reference.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Admin Panel — Start Franchise',
  description: 'Dashboard admin untuk manajemen merchant dan franchise Start Franchise.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
