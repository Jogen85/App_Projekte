import type { Metadata } from 'next'
import './globals.css'
import DashboardTabs from '@/components/DashboardTabs'

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
      <body className="min-w-[1440px] bg-slate-50 text-slate-900 antialiased">
        <DashboardTabs />
        {children}
      </body>
    </html>
  )
}
