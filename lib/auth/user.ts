import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function getCurrentUser() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return null
  }

  const data = await db.select().from(users).where(eq(users.clerkId, clerkId))

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

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (existing.length) {
    return existing[0]
  }

  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null

  const [created] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      name,
      avatarUrl: clerkUser.imageUrl,
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning()

  if (created) {
    return created
  }

  const retry = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  return retry[0] ?? null
}
