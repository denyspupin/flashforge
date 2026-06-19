import { revalidateTag as nextRevalidateTag } from "next/cache"

export function revalidateCache(tag: string): void {
  nextRevalidateTag(tag, {})
}
