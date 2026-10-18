import { randomBytes } from "node:crypto"

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function generateShareToken(): string {
  return randomBytes(18).toString("base64url")
}

export function isValidShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value)
}
