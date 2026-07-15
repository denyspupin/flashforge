import { testClerk } from "./global"

export type MockClerkOptions = {
  clerkId: string
  role?: "user" | "curator" | "admin"
  firstName?: string
  lastName?: string
  imageUrl?: string | null
}

export function mockClerk(options: MockClerkOptions): void {
  testClerk.set(options)
}

export function clearClerk(): void {
  testClerk.set(null)
}
