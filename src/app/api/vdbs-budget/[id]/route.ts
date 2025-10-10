import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { VDBSBudgetItem } from '@/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// PUT /api/vdbs-budget/:id
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body: VDBSBudgetItem = await request.json()

    await sql`
      UPDATE vdbs_budget SET
        project_number = ${body.projectNumber},
        project_name = ${body.projectName},
        category = ${body.category},
        budget_2026 = ${body.budget2026},
        year = ${body.year},
        updated_at = NOW()
      WHERE id = ${Number(id)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating VDB-S budget item:', error)
    return NextResponse.json(
      { error: 'Failed to update VDB-S budget item' },
      { status: 500 }
    )
  }
}

// DELETE /api/vdbs-budget/:id
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params

    await sql`DELETE FROM vdbs_budget WHERE id = ${Number(id)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting VDB-S budget item:', error)
    return NextResponse.json(
      { error: 'Failed to delete VDB-S budget item' },
      { status: 500 }
    )
  }
}
