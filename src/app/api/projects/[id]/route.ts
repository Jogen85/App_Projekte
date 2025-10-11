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

    // Validate required fields
    if (!body.title || !body.owner || !body.start || !body.end) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.title && 'title',
            !body.owner && 'owner',
            !body.start && 'start',
            !body.end && 'end'
          ].filter(Boolean).join(', ')
        },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(body.start) || !dateRegex.test(body.end)) {
      return NextResponse.json(
        {
          error: 'Datumsformat ungültig',
          details: `Erwartetes Format: YYYY-MM-DD. Erhalten: start="${body.start}", end="${body.end}"`
        },
        { status: 400 }
      )
    }

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
  } catch (error: any) {
    console.error('Error updating project:', error)

    // PostgreSQL error codes
    const pgError = error as { code?: string; detail?: string; constraint?: string }

    let errorMessage = 'Fehler beim Aktualisieren des Projekts'
    let errorDetails = error.message || String(error)

    // Handle common PostgreSQL errors
    if (pgError.code === '23502') {
      // Not-null constraint violation
      errorMessage = 'Pflichtfeld fehlt'
      errorDetails = pgError.detail || 'Ein erforderliches Feld ist leer'
    } else if (pgError.code === '23514') {
      // Check constraint violation
      errorMessage = 'Ungültiger Wert'
      errorDetails = pgError.detail || 'Ein Wert entspricht nicht den Anforderungen'
    } else if (pgError.code === '22P02') {
      // Invalid text representation (e.g., date format)
      errorMessage = 'Datumsformat ungültig'
      errorDetails = 'Das Datum muss im Format YYYY-MM-DD vorliegen'
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
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
