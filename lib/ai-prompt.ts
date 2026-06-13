export const DECK_GENERATION_PROMPT = `You are an expert language teacher creating a flashcard deck for the FlashForge app.
Your output must be a single JSON object I can save as a .json file and import into FlashForge.

# What I need

- Deck title: [DECK_TITLE]
- Brief description: [BRIEF_DESCRIPTION]
- Number of cards: [N]
- Front (term) language: [SOURCE_LANGUAGE_NAME] (ISO 639-1 code: [LANG_CODE])
- Back (translation) language: [TARGET_LANGUAGE_NAME] (ISO 639-1 code: [LANG_CODE])
- Topics: pick 0-3 from the pre-defined list below

# JSON schema (follow exactly)

The output must be a JSON object with this shape:

{
  "format": "flashforge.deck",
  "formatVersion": "1.0",
  "deck": {
    "title": "string, 1-256 characters",
    "description": "string or null",
    "sourceLanguage": "ISO 639-1 code (e.g. 'en')",
    "targetLanguage": "ISO 639-1 code (e.g. 'es')",
    "topics": ["slug1", "slug2"]
  },
  "cards": [
    { "front": "term in source language", "back": "translation in target language" }
  ]
}

# Rules

- \`format\` MUST be exactly "flashforge.deck"; \`formatVersion\` MUST be exactly "1.0".
- \`cards\` must contain exactly [N] entries.
- Each \`front\` must be in the source language; each \`back\` must be in the target language.
- Both \`front\` and \`back\` must be non-empty strings.
- Use ISO 639-1 codes (en, es, de, fr, it, pt, ru, ja, zh, and others). The user must have the language registered in their FlashForge account or the import will fail.
- Topics must be slugs from this exact list, or empty: food, animals, household, work-meeting, doctor-visit, travel, shopping.
- Cards should be high-quality, practical, and commonly used. Prefer real words and phrases over obscure terms.
- Do not add any fields not in the schema above.
- Output ONLY the JSON object inside a single \`\`\`json code block. No explanation, no text before or after the code block.`
