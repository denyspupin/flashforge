import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, PoolClient } from "pg"
import * as schema from "@/lib/db/schema"
import { testDb } from "./global"

type Schema = typeof schema
type TxDb = ReturnType<typeof drizzle<Schema>> & { $client: PoolClient }
export type TestDb = ReturnType<typeof drizzle<Schema>>

let pool: Pool | null = null

export async function setupTestPool(): Promise<void> {
  if (pool) return
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Create tests/.env.test (see .env.test.example) or export it before running pnpm test.",
    )
  }
  pool = new Pool({ connectionString: url, max: 4 })
  await pool.query("select 1")
}

export async function teardownTestPool(): Promise<void> {
  if (!pool) return
  await pool.end()
  pool = null
}

export async function withTx<T>(
  fn: (db: TestDb) => Promise<T>,
): Promise<T> {
  if (!pool) {
    throw new Error("Test pool not initialised. Call setupTestPool() in beforeAll.")
  }
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const db = drizzle(client, { schema }) as TxDb
    testDb.set(db)
    const result = await fn(db)
    await client.query("ROLLBACK")
    return result
  } catch (err) {
    try {
      await client.query("ROLLBACK")
    } catch {
      // ignore
    }
    throw err
  } finally {
    testDb.set(null)
    client.release()
  }
}

export function getCurrentTestDb(): TestDb {
  const db = testDb.get()
  if (!db) {
    throw new Error("No active test transaction. Wrap test logic in withTx().")
  }
  return db as TestDb
}
