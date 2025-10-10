import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ year: string }> }

// DELETE /api/year-budgets/:year
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { year } = await params

    await sql`DELETE FROM year_budgets WHERE year = ${Number(year)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting year budget:', error)
    return NextResponse.json(
      { error: 'Failed to delete year budget' },
      { status: 500 }
    )
  }
}
