import { db } from "../lib/db/client"
import { languages, topics } from "../lib/db/schema"

async function seed() {
  console.log("Seeding database...")

  await db
    .insert(languages)
    .values([
      { name: "English", code: "en" },
      { name: "Spanish", code: "es" },
      { name: "German", code: "de" },
      { name: "French", code: "fr" },
      { name: "Italian", code: "it" },
      { name: "Portuguese", code: "pt" },
      { name: "Russian", code: "ru" },
      { name: "Japanese", code: "ja" },
      { name: "Chinese", code: "zh" },
    ])
    .onConflictDoNothing({ target: languages.code })

  await db
    .insert(topics)
    .values([
      { name: "Food", slug: "food" },
      { name: "Animals", slug: "animals" },
      { name: "Household", slug: "household" },
      { name: "Work Meeting", slug: "work-meeting" },
      { name: "Doctor Visit", slug: "doctor-visit" },
      { name: "Travel", slug: "travel" },
      { name: "Shopping", slug: "shopping" },
    ])
    .onConflictDoNothing({ target: topics.slug })

  console.log("Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
