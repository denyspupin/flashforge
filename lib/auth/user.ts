import { auth } from "@clerk/nextjs/server"
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
