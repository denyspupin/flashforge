import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { Pool } from "pg"

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "drizzle")
const APPLY = process.argv.includes("--apply")

const journal = JSON.parse(
  readFileSync(join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
) as { entries: Array<{ idx: number; when: number; tag: string }> }

const probes: Array<() => string> = [
  () => `select 1 from information_schema.tables where table_schema='public' and table_name='users'`,
  () => columnProbe("users", "role"),
  () => `select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='is_curator'`,
  () => tableProbe("prompt_templates"),
  () => columnProbe("study_sessions", "xp_awarded"),
  () => columnProbe("users", "theme"),
  () => tableProbe("collections"),
  () => columnProbe("collections", "is_curated"),
  () => columnProbe("users", "onboarded_at"),
  () => tableProbe("favorite_decks"),
  () => tableProbe("followed_collections"),
  () => columnProbe("study_sessions", "duration_ms"),
  () => columnProbe("decks", "is_curated"),
]

function tableProbe(tableName: string) {
  return `select 1 from information_schema.tables where table_schema='public' and table_name='${tableName}'`
}

function columnProbe(tableName: string, columnName: string) {
  return `select 1 from information_schema.columns where table_schema='public' and table_name='${tableName}' and column_name='${columnName}'`
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL is not set. Point it at the target database first.")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url, max: 1 })

  try {
    await pool.query(
      `create schema if not exists drizzle;
       create table if not exists drizzle.__drizzle_migrations (
         id serial primary key,
         hash text not null,
         created_at bigint
       )`,
    )

    const { rows: dbRows } = await pool.query<{ created_at: string }>(
      "select coalesce(max(created_at), 0) as max from drizzle.__drizzle_migrations",
    )
    const dbMax = Number(dbRows[0].max)

    const results = []
    for (const entry of journal.entries) {
      const probeSql = probes[entry.idx]
      const { rows: probeRows } = await pool.query(probeSql())
      const probePast = probeRows.length > 0
      const negated = entry.idx === 2 || entry.idx === 12
      const applied = negated ? !probePast : probePast
      const sqlContent = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8")
      const hash = createHash("sha256").update(sqlContent).digest("hex")
      results.push({ ...entry, applied, hash })
    }

    const applied = results.filter((r) => r.applied)
    const watermark = applied.length ? Math.max(...applied.map((r) => r.when)) : 0
    const pending = results.filter((r) => !r.applied && r.when > watermark)

    console.log(`${"idx".padEnd(4)} ${"when".padEnd(16)} ${"applied".padEnd(8)} tag`)
    for (const r of results) {
      console.log(
        `${String(r.idx).padEnd(4)} ${String(r.when).padEnd(16)} ${String(r.applied).padEnd(8)} ${r.tag}`,
      )
    }

    console.log(`\nnewest db journal row: ${dbMax}`)
    console.log(`schema watermark:      ${watermark}`)
    console.log(
      `pending for db:migrate: ${pending.length ? pending.map((p) => p.tag).join(", ") : "(none)"}`,
    )

    if (dbMax > watermark) {
      console.error(
        "\nWARNING: db journal is newer than the detected schema. Verify manually before proceeding.",
      )
    }
    if (dbMax >= watermark) {
      console.log("\nBookkeeping is already in sync. Nothing to insert.")
      return
    }

    const watermarkEntry = applied.find((r) => r.when === watermark) ?? null
    if (!watermarkEntry) {
      console.log("\nNo applied migrations detected. Nothing to insert.")
      return
    }

    console.log(
      `\nWould insert journal row: hash=${watermarkEntry.hash.slice(0, 16)}… created_at=${watermarkEntry.when} (${watermarkEntry.tag})`,
    )
    if (!APPLY) {
      console.log("\nDry run. Re-run with --apply to insert the row.")
      return
    }

    await pool.query(
      `insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)`,
      [watermarkEntry.hash, String(watermarkEntry.when)],
    )
    console.log("Inserted. You can now run `pnpm db:migrate` for the remaining migrations.")
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
