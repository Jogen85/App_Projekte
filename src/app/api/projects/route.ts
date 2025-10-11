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

    // Validate required fields
    if (!body.id || !body.title || !body.owner || !body.start || !body.end) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.id && 'id',
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
  } catch (error: any) {
    console.error('Error creating project:', error)

    // PostgreSQL error codes
    const pgError = error as { code?: string; detail?: string; constraint?: string }

    let errorMessage = 'Fehler beim Erstellen des Projekts'
    let errorDetails = error.message || String(error)

    // Handle common PostgreSQL errors
    if (pgError.code === '23505') {
      // Unique constraint violation
      errorMessage = 'Projekt existiert bereits'
      errorDetails = `Projekt-ID "${error.constraint}" ist bereits vergeben`
    } else if (pgError.code === '23502') {
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

// PATCH /api/projects (UPSERT for CSV import)
export async function PATCH(request: Request) {
  try {
    const body: Project = await request.json()

    // Validate required fields
    if (!body.id || !body.title || !body.owner || !body.start || !body.end) {
      return NextResponse.json(
        {
          error: 'Validierungsfehler',
          details: 'Pflichtfelder fehlen: ' + [
            !body.id && 'id',
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

    // UPSERT: Insert or Update on conflict
    const result = await sql`
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
      ON CONFLICT (id) DO UPDATE SET
        project_number_internal = EXCLUDED.project_number_internal,
        project_number_external = EXCLUDED.project_number_external,
        classification = EXCLUDED.classification,
        title = EXCLUDED.title,
        owner = EXCLUDED.owner,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        progress = EXCLUDED.progress,
        budget_planned = EXCLUDED.budget_planned,
        cost_to_date = EXCLUDED.cost_to_date,
        org = EXCLUDED.org,
        requires_at82_check = EXCLUDED.requires_at82_check,
        at82_completed = EXCLUDED.at82_completed,
        updated_at = NOW()
    `

    return NextResponse.json({ success: true, upserted: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error upserting project:', error)

    // PostgreSQL error codes
    const pgError = error as { code?: string; detail?: string; constraint?: string }

    let errorMessage = 'Fehler beim Speichern des Projekts'
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

// PUT /api/projects/:id (handled via dynamic route)
// DELETE /api/projects/:id (handled via dynamic route)
