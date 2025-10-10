import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Project } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/projects
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        id,
        project_number_internal as "projectNumberInternal",
        project_number_external as "projectNumberExternal",
        classification,
        title,
        owner,
        description,
        status,
        to_char(start_date, 'YYYY-MM-DD') as start,
        to_char(end_date, 'YYYY-MM-DD') as "end",
        progress,
        budget_planned as "budgetPlanned",
        cost_to_date as "costToDate",
        org,
        requires_at82_check as "requiresAT82Check",
        at82_completed as "at82Completed"
      FROM projects
      ORDER BY start_date DESC
    `

    const projects: Project[] = rows.map((row: any) => ({
      id: row.id,
      projectNumberInternal: row.projectNumberInternal,
      projectNumberExternal: row.projectNumberExternal || undefined,
      classification: row.classification,
      title: row.title,
      owner: row.owner,
      description: row.description || '',
      status: row.status,
      start: row.start,
      end: row.end,
      progress: Number(row.progress),
      budgetPlanned: Number(row.budgetPlanned),
      costToDate: Number(row.costToDate),
      org: row.org,
      requiresAT82Check: row.requiresAT82Check,
      at82Completed: row.at82Completed,
    }))

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects
export async function POST(request: Request) {
  try {
    const body: Project = await request.json()

    await sql`
      INSERT INTO projects (
        id,
        project_number_internal,
        project_number_external,
        classification,
        title,
        owner,
        description,
        status,
        start_date,
        end_date,
        progress,
        budget_planned,
        cost_to_date,
        org,
        requires_at82_check,
        at82_completed
      ) VALUES (
        ${body.id},
        ${body.projectNumberInternal},
        ${body.projectNumberExternal || null},
        ${body.classification},
        ${body.title},
        ${body.owner},
        ${body.description || ''},
        ${body.status},
        ${body.start}::date,
        ${body.end}::date,
        ${body.progress},
        ${body.budgetPlanned},
        ${body.costToDate},
        ${body.org || 'Nicht zugeordnet'},
        ${body.requiresAT82Check || false},
        ${body.at82Completed || false}
      )
    `

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/:id (handled via dynamic route)
// DELETE /api/projects/:id (handled via dynamic route)
