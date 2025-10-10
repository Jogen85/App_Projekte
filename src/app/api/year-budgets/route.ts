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

    await sql`
      INSERT INTO year_budgets (year, budget)
      VALUES (${body.year}, ${body.budget})
      ON CONFLICT (year)
      DO UPDATE SET
        budget = ${body.budget},
        updated_at = NOW()
    `

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error upserting year budget:', error)
    return NextResponse.json(
      { error: 'Failed to save year budget' },
      { status: 500 }
    )
  }
}
