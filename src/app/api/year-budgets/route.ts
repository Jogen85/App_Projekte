import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { YearBudget } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/year-budgets
export async function GET() {
  try {
    const rows = await sql`
      SELECT year, budget
      FROM year_budgets
      ORDER BY year DESC
    `

    const yearBudgets: YearBudget[] = rows.map((row: any) => ({
      year: Number(row.year),
      budget: Number(row.budget),
    }))

    return NextResponse.json(yearBudgets)
  } catch (error) {
    console.error('Error fetching year budgets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch year budgets' },
      { status: 500 }
    )
  }
}

// POST /api/year-budgets (upsert logic)
export async function POST(request: Request) {
  try {
    const body: YearBudget = await request.json()

    // Validate required fields
    if (body.year == null || body.budget == null) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            body.year == null && 'year',
            body.budget == null && 'budget'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    await sql`
      INSERT INTO year_budgets (year, budget)
      VALUES (${body.year}, ${body.budget})
      ON CONFLICT (year)
      DO UPDATE SET
        budget = ${body.budget},
        updated_at = NOW()
    `

    return NextResponse.json({ success: true, upserted: true }, { status: 201 })
  } catch (error: any) {
    console.error('Error upserting year budget:', error)

    const pgError = error as { code?: string; detail?: string; constraint?: string }
    let errorMessage = 'Fehler beim Speichern des Jahresbudgets'
    let errorDetails = error.message || String(error)

    if (pgError.code === '23502') {
      errorMessage = 'Pflichtfeld fehlt'
      errorDetails = pgError.detail || 'Ein erforderliches Feld ist leer'
    } else if (pgError.code === '23514') {
      errorMessage = 'Ungültiger Wert'
      errorDetails = pgError.detail || 'Ein Wert entspricht nicht den Anforderungen'
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    )
  }
}

// PATCH /api/year-budgets (UPSERT for CSV import - same as POST for consistency)
export async function PATCH(request: Request) {
  try {
    const body: YearBudget = await request.json()

    // Validate required fields
    if (body.year == null || body.budget == null) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            body.year == null && 'year',
            body.budget == null && 'budget'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    await sql`
      INSERT INTO year_budgets (year, budget)
      VALUES (${body.year}, ${body.budget})
      ON CONFLICT (year)
      DO UPDATE SET
        budget = ${body.budget},
        updated_at = NOW()
    `

    return NextResponse.json({ success: true, upserted: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error upserting year budget:', error)

    const pgError = error as { code?: string; detail?: string; constraint?: string }
    let errorMessage = 'Fehler beim Speichern des Jahresbudgets'
    let errorDetails = error.message || String(error)

    if (pgError.code === '23502') {
      errorMessage = 'Pflichtfeld fehlt'
      errorDetails = pgError.detail || 'Ein erforderliches Feld ist leer'
    } else if (pgError.code === '23514') {
      errorMessage = 'Ungültiger Wert'
      errorDetails = pgError.detail || 'Ein Wert entspricht nicht den Anforderungen'
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    )
  }
}
