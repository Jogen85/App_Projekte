import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { ITCost } from '@/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// PUT /api/it-costs/:id
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body: ITCost = await request.json()

    await sql`
      UPDATE it_costs SET
        description = ${body.description},
        category = ${body.category},
        provider = ${body.provider || ''},
        amount = ${body.amount},
        frequency = ${body.frequency},
        cost_center = ${body.costCenter || ''},
        notes = ${body.notes || ''},
        year = ${body.year},
        updated_at = NOW()
      WHERE id = ${Number(id)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating IT cost:', error)
    return NextResponse.json(
      { error: 'Failed to update IT cost' },
      { status: 500 }
    )
  }
}

// DELETE /api/it-costs/:id
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params

    await sql`DELETE FROM it_costs WHERE id = ${Number(id)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting IT cost:', error)
    return NextResponse.json(
      { error: 'Failed to delete IT cost' },
      { status: 500 }
    )
  }
}
