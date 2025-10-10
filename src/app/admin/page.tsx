'use client'

import React from 'react'
import { Card, COLORS } from '@/ui'

export default function AdminPage() {
  const adminSections = [
    {
      title: 'Projekte verwalten',
      description: 'IT-Projektübersicht bearbeiten, CSV Import/Export, Jahresbudgets pflegen',
      href: '/admin/projects',
      icon: '📊',
    },
    {
      title: 'IT-Kosten verwalten',
      description: 'Laufende IT-Kosten erfassen, Kategorien und Dienstleister pflegen',
      href: '/admin/it-costs',
      icon: '💰',
    },
    {
      title: 'VDB-S Budget verwalten',
      description: 'VDB-S Budgetpositionen verwalten, RUN/CHANGE Kategorien zuordnen',
      href: '/admin/vdbs-budget',
      icon: '📈',
    },
  ]

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-8`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Verwaltung</h1>
          <p className="text-slate-600">Daten verwalten und bearbeiten</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <a key={section.href} href={section.href} className="block group">
              <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                <div className="flex flex-col items-center text-center space-y-4 p-6">
                  <div className="text-6xl">{section.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-sm text-slate-600">{section.description}</p>
                  </div>
                  <div className="mt-4 text-blue-600 text-sm font-medium group-hover:underline">
                    Öffnen →
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <a href="/projects" className="text-blue-600 hover:underline text-sm">
                ← Zurück zu Projekten
              </a>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              <a href="/it-costs" className="hover:text-blue-600">
                IT-Kosten Dashboard
              </a>
              <a href="/vdbs-budget" className="hover:text-blue-600">
                VDB-S Budget Dashboard
              </a>
              <a href="/overall-budget" className="hover:text-blue-600">
                Gesamtbudgetplanung
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
