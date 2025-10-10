import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Project } from '@/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// PUT /api/projects/:id
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body: Project = await request.json()

    await sql`
      UPDATE projects SET
        project_number_internal = ${body.projectNumberInternal},
        project_number_external = ${body.projectNumberExternal || null},
        classification = ${body.classification},
        title = ${body.title},
        owner = ${body.owner},
        description = ${body.description || ''},
        status = ${body.status},
        start_date = ${body.start}::date,
        end_date = ${body.end}::date,
        progress = ${body.progress},
        budget_planned = ${body.budgetPlanned},
        cost_to_date = ${body.costToDate},
        org = ${body.org || 'Nicht zugeordnet'},
        requires_at82_check = ${body.requiresAT82Check || false},
        at82_completed = ${body.at82Completed || false},
        updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:id
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params

    await sql`DELETE FROM projects WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
