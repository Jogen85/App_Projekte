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
  } catch (error) {
    console.error('Error creating VDB-S budget item:', error)
    return NextResponse.json(
      { error: 'Failed to create VDB-S budget item' },
      { status: 500 }
    )
  }
}
