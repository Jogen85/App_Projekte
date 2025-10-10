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
  } catch (error) {
    console.error('Error creating IT cost:', error)
    return NextResponse.json(
      { error: 'Failed to create IT cost' },
      { status: 500 }
    )
  }
}
