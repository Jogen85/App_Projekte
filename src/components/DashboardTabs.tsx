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
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-presentation px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="py-4">
              <h1 className="text-xl font-bold text-slate-900">IT Portfolio Dashboard</h1>
              <p className="text-xs text-slate-500">Executive Project Oversight</p>
            </div>
          </div>
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.path ||
                (tab.path !== '/' && pathname?.startsWith(`${tab.path}/`))
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`
                    px-5 py-4 text-sm font-medium transition-all relative
                    ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
