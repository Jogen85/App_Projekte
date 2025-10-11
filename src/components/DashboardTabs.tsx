'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardTabs() {
  const pathname = usePathname()

  const tabs = [
    {
      path: '/',
      label: 'Cockpit',
      title: 'IT-Cockpit',
      subtitle: 'Verdichtete Kennzahlen, Warnungen und Schnellzugriffe über alle Bereiche'
    },
    {
      path: '/projects',
      label: 'Projekte',
      title: 'IT-Projektübersicht',
      subtitle: 'Projektplanung, Fortschritt und Budget-Tracking'
    },
    {
      path: '/overall-budget',
      label: 'Gesamtbudget',
      title: 'Gesamtbudgetplanung',
      subtitle: 'Konsolidierte Übersicht über Projektbudgets, IT-Kosten und VDB-S Budget'
    },
    {
      path: '/it-costs',
      label: 'IT-Kosten',
      title: 'IT-Kostenübersicht',
      subtitle: 'Laufende Kosten, Lizenzen und Service-Verträge'
    },
    {
      path: '/vdbs-budget',
      label: 'VDB-S Budget',
      title: 'VDB-S Budget',
      subtitle: 'Budgetplanung für VDB-Service, Arbeitskreise und Projekte'
    },
  ]

  const activeTab = tabs.find(tab =>
    pathname === tab.path || (tab.path !== '/' && pathname?.startsWith(`${tab.path}/`))
  ) || tabs[0]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-presentation px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="py-4">
              <h1 className="text-xl font-bold text-slate-900">{activeTab.title}</h1>
              <p className="text-xs text-slate-500">{activeTab.subtitle}</p>
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
