import { auth, currentUser } from "@clerk/nextjs/server"
import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"

export type AppRole = "user" | "curator" | "admin"
export type DbUser = typeof users.$inferSelect

const VALID_ROLES: readonly AppRole[] = ["user", "curator", "admin"]

function parseRole(value: unknown): AppRole {
  if (typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value)) {
    return value as AppRole
  }
  return "user"
}

function readRoleFromClerkMetadata(metadata: unknown): AppRole {
  if (!metadata || typeof metadata !== "object") return "user"
  const role = (metadata as { role?: unknown }).role
  return parseRole(role)
}

export async function getCurrentUser() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return null
  }

  const data = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (!data.length) {
    return null
  }

  return data[0]
}

export async function requireCurrentUser() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return null
  }

  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const clerkRole = readRoleFromClerkMetadata(clerkUser.publicMetadata)
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (!existing.length) {
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
    const [created] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        name,
        avatarUrl: clerkUser.imageUrl,
        role: clerkRole,
      })
      .onConflictDoNothing({ target: users.clerkId })
      .returning()
    if (created) return created
  }

  if (existing.length && existing[0].role !== clerkRole) {
    const [updated] = await db
      .update(users)
      .set({ role: clerkRole, updatedAt: sql`now()` })
      .where(eq(users.id, existing[0].id))
      .returning()
    if (updated) return updated
  }

  if (existing.length) return existing[0]

  const retry = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  return retry[0] ?? null
}

export function isAdmin(
  user: Pick<DbUser, "role"> | null | undefined
): boolean {
  return user?.role === "admin"
}

export function isCuratorOrAdmin(
  user: Pick<DbUser, "role"> | null | undefined
): boolean {
  return user?.role === "admin" || user?.role === "curator"
}

export async function requireAdmin(): Promise<DbUser | null> {
  const user = await requireCurrentUser()
  if (!user) return null
  if (user.isBanned) return null
  if (user.deletedAt) return null
  if (!isAdmin(user)) return null
  return user
}

export async function requireCuratorOrAdmin(): Promise<DbUser | null> {
  const user = await requireCurrentUser()
  if (!user) return null
  if (user.isBanned) return null
  if (user.deletedAt) return null
  if (!isCuratorOrAdmin(user)) return null
  return user
}
