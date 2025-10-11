import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { ITCost } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/it-costs?year=2025
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    let rows
    if (year) {
      rows = await sql`
        SELECT
          id::text,
          description,
          category,
          provider,
          amount,
          frequency,
          cost_center as "costCenter",
          notes,
          year
        FROM it_costs
        WHERE year = ${Number(year)}
        ORDER BY id DESC
      `
    } else {
      rows = await sql`
        SELECT
          id::text,
          description,
          category,
          provider,
          amount,
          frequency,
          cost_center as "costCenter",
          notes,
          year
        FROM it_costs
        ORDER BY year DESC, id DESC
      `
    }

    const itCosts: ITCost[] = rows.map((row: any) => ({
      id: row.id,
      description: row.description,
      category: row.category,
      provider: row.provider || '',
      amount: Number(row.amount),
      frequency: row.frequency,
      costCenter: row.costCenter || '',
      notes: row.notes || '',
      year: Number(row.year),
    }))

    return NextResponse.json(itCosts)
  } catch (error) {
    console.error('Error fetching IT costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch IT costs' },
      { status: 500 }
    )
  }
}

// POST /api/it-costs
export async function POST(request: Request) {
  try {
    const body: Omit<ITCost, 'id'> & { id?: string } = await request.json()

    // Validate required fields
    if (!body.description || !body.category || !body.provider || body.amount == null || !body.frequency || body.year == null) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.description && 'description',
            !body.category && 'category',
            !body.provider && 'provider',
            body.amount == null && 'amount',
            !body.frequency && 'frequency',
            body.year == null && 'year'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO it_costs (
        description,
        category,
        provider,
        amount,
        frequency,
        cost_center,
        notes,
        year
      ) VALUES (
        ${body.description},
        ${body.category},
        ${body.provider || ''},
        ${body.amount},
        ${body.frequency},
        ${body.costCenter || ''},
        ${body.notes || ''},
        ${body.year}
      )
      RETURNING id
    `

    return NextResponse.json({ success: true, id: result[0].id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating IT cost:', error)

    const pgError = error as { code?: string; detail?: string; constraint?: string }
    let errorMessage = 'Fehler beim Erstellen der IT-Kosten'
    let errorDetails = error.message || String(error)

    if (pgError.code === '23505') {
      errorMessage = 'IT-Kosten existieren bereits'
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

// PATCH /api/it-costs (UPSERT for CSV import)
export async function PATCH(request: Request) {
  try {
    const body: ITCost = await request.json()

    // Validate required fields
    if (!body.id || !body.description || !body.category || !body.provider || body.amount == null || !body.frequency || body.year == null) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.id && 'id',
            !body.description && 'description',
            !body.category && 'category',
            !body.provider && 'provider',
            body.amount == null && 'amount',
            !body.frequency && 'frequency',
            body.year == null && 'year'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    // UPSERT: Insert or Update on conflict
    await sql`
      INSERT INTO it_costs (
        id,
        description,
        category,
        provider,
        amount,
        frequency,
        cost_center,
        notes,
        year
      ) VALUES (
        ${body.id},
        ${body.description},
        ${body.category},
        ${body.provider || ''},
        ${body.amount},
        ${body.frequency},
        ${body.costCenter || ''},
        ${body.notes || ''},
        ${body.year}
      )
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        provider = EXCLUDED.provider,
        amount = EXCLUDED.amount,
        frequency = EXCLUDED.frequency,
        cost_center = EXCLUDED.cost_center,
        notes = EXCLUDED.notes,
        year = EXCLUDED.year
    `

    return NextResponse.json({ success: true, upserted: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error upserting IT cost:', error)

    const pgError = error as { code?: string; detail?: string; constraint?: string }
    let errorMessage = 'Fehler beim Speichern der IT-Kosten'
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
