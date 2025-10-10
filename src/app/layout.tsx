import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IT Portfolio Dashboard',
  description: 'Executive project oversight dashboard for BMV',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="min-w-[1440px] bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
