'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardTabs() {
  const pathname = usePathname()

  const tabs = [
    { path: '/', label: 'Cockpit' },
    { path: '/projects', label: 'Projekte' },
    { path: '/overall-budget', label: 'Gesamtbudget' },
    { path: '/it-costs', label: 'IT-Kosten' },
    { path: '/vdbs-budget', label: 'VDB-S Budget' },
  ]

  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.path ||
          (tab.path !== '/' && pathname?.startsWith(`${tab.path}/`))
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`
              px-6 py-3 text-sm font-medium transition-colors
              ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
