import dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { DEMO_PROJECTS, DEMO_IT_COSTS, DEMO_VDBS_BUDGET } from '../src/data/demoData'

// Load .env.local file
dotenv.config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable not set. Make sure .env.local exists.')
}

const sql = neon(DATABASE_URL)

async function seed() {
  console.log('🌱 Seeding Neon database...\n')

  try {
    // 1. Clear existing data
    console.log('🗑️  Clearing existing data...')
    await sql`DELETE FROM vdbs_budget`
    await sql`DELETE FROM it_costs`
    await sql`DELETE FROM projects`
    await sql`DELETE FROM year_budgets`
    console.log('✓ Cleared\n')

    // 2. Seed Year Budgets
    console.log('📅 Seeding year budgets...')
    const yearBudgets = [
      { year: 2024, budget: 450000 },
      { year: 2025, budget: 500000 },
      { year: 2026, budget: 550000 },
    ]

    for (const yb of yearBudgets) {
      await sql`
        INSERT INTO year_budgets (year, budget)
        VALUES (${yb.year}, ${yb.budget})
      `
    }
    console.log(`✓ Inserted ${yearBudgets.length} year budgets\n`)

    // 3. Seed Projects
    console.log('📁 Seeding projects...')
    let projectCount = 0
    for (const p of DEMO_PROJECTS) {
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
          ${p.id},
          ${p.projectNumberInternal},
          ${p.projectNumberExternal || null},
          ${p.classification},
          ${p.title},
          ${p.owner},
          ${p.description || ''},
          ${p.status},
          ${p.start}::date,
          ${p.end}::date,
          ${p.progress},
          ${p.budgetPlanned},
          ${p.costToDate},
          ${p.org || 'Nicht zugeordnet'},
          ${p.requiresAT82Check || false},
          ${p.at82Completed || false}
        )
      `
      projectCount++
    }
    console.log(`✓ Inserted ${projectCount} projects\n`)

    // 4. Seed IT Costs
    console.log('💻 Seeding IT costs...')
    let itCostCount = 0
    for (const cost of DEMO_IT_COSTS) {
      await sql`
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
          ${cost.description},
          ${cost.category},
          ${cost.provider || ''},
          ${cost.amount},
          ${cost.frequency},
          ${cost.costCenter || ''},
          ${cost.notes || ''},
          ${cost.year}
        )
      `
      itCostCount++
    }
    console.log(`✓ Inserted ${itCostCount} IT costs\n`)

    // 5. Seed VDB-S Budget
    console.log('💰 Seeding VDB-S budget...')
    let vdbsCount = 0
    for (const item of DEMO_VDBS_BUDGET) {
      await sql`
        INSERT INTO vdbs_budget (
          project_number,
          project_name,
          category,
          budget_2026,
          year
        ) VALUES (
          ${item.projectNumber},
          ${item.projectName},
          ${item.category},
          ${item.budget2026},
          ${item.year}
        )
      `
      vdbsCount++
    }
    console.log(`✓ Inserted ${vdbsCount} VDB-S budget items\n`)

    console.log('✅ Seeding complete!\n')
    console.log('Summary:')
    console.log(`  - ${yearBudgets.length} year budgets`)
    console.log(`  - ${projectCount} projects`)
    console.log(`  - ${itCostCount} IT costs`)
    console.log(`  - ${vdbsCount} VDB-S budget items`)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
