import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { VDBSBudgetItem } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/vdbs-budget?year=2026
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    let rows
    if (year) {
      rows = await sql`
        SELECT
          id::text,
          project_number as "projectNumber",
          project_name as "projectName",
          category,
          budget_2026 as "budget2026",
          year
        FROM vdbs_budget
        WHERE year = ${Number(year)}
        ORDER BY id
      `
    } else {
      rows = await sql`
        SELECT
          id::text,
          project_number as "projectNumber",
          project_name as "projectName",
          category,
          budget_2026 as "budget2026",
          year
        FROM vdbs_budget
        ORDER BY year DESC, id
      `
    }

    const vdbsBudget: VDBSBudgetItem[] = rows.map((row: any) => ({
      id: row.id,
      projectNumber: row.projectNumber,
      projectName: row.projectName,
      category: row.category,
      budget2026: Number(row.budget2026),
      year: Number(row.year),
    }))

    return NextResponse.json(vdbsBudget)
  } catch (error) {
    console.error('Error fetching VDB-S budget:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VDB-S budget' },
      { status: 500 }
    )
  }
}

// POST /api/vdbs-budget
export async function POST(request: Request) {
  try {
    const body: Omit<VDBSBudgetItem, 'id'> & { id?: string } = await request.json()

    // Validate required fields
    if (!body.projectNumber || !body.projectName || !body.category || body.budget2026 == null || body.year == null) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.projectNumber && 'projectNumber',
            !body.projectName && 'projectName',
            !body.category && 'category',
            body.budget2026 == null && 'budget2026',
            body.year == null && 'year'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO vdbs_budget (
        project_number,
        project_name,
        category,
        budget_2026,
        year
      ) VALUES (
        ${body.projectNumber},
        ${body.projectName},
        ${body.category},
        ${body.budget2026},
        ${body.year}
      )
      RETURNING id
    `

    return NextResponse.json({ success: true, id: result[0].id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating VDB-S budget item:', error)

    const pgError = error as { code?: string; detail?: string; constraint?: string }
    let errorMessage = 'Fehler beim Erstellen des VDB-S Budgets'
    let errorDetails = error.message || String(error)

    if (pgError.code === '23505') {
      errorMessage = 'VDB-S Budget existiert bereits'
      errorDetails = `ID "${error.constraint}" ist bereits vergeben`
    } else if (pgError.code === '23502') {
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

// PATCH /api/vdbs-budget (UPSERT for CSV import)
export async function PATCH(request: Request) {
  try {
    const body: VDBSBudgetItem = await request.json()

    // Validate required fields
    if (!body.id || !body.projectNumber || !body.projectName || !body.category || body.budget2026 == null || body.year == null) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.id && 'id',
            !body.projectNumber && 'projectNumber',
            !body.projectName && 'projectName',
            !body.category && 'category',
            body.budget2026 == null && 'budget2026',
            body.year == null && 'year'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    // UPSERT: Insert or Update on conflict
    await sql`
      INSERT INTO vdbs_budget (
        id,
        project_number,
        project_name,
        category,
        budget_2026,
        year
      ) VALUES (
        ${body.id},
        ${body.projectNumber},
        ${body.projectName},
        ${body.category},
        ${body.budget2026},
        ${body.year}
      )
      ON CONFLICT (id) DO UPDATE SET
        project_number = EXCLUDED.project_number,
        project_name = EXCLUDED.project_name,
        category = EXCLUDED.category,
        budget_2026 = EXCLUDED.budget_2026,
        year = EXCLUDED.year
    `

    return NextResponse.json({ success: true, upserted: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error upserting VDB-S budget item:', error)

    const pgError = error as { code?: string; detail?: string; constraint?: string }
    let errorMessage = 'Fehler beim Speichern des VDB-S Budgets'
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
