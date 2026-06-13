import type { Language } from "@/types/deck"

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: "US",
  de: "DE",
  es: "ES",
  fr: "FR",
  it: "IT",
  pt: "BR",
  nl: "NL",
  pl: "PL",
  ru: "RU",
  ja: "JP",
  ko: "KR",
  zh: "CN",
  ar: "SA",
  hi: "IN",
  tr: "TR",
  uk: "UA",
  cs: "CZ",
  sv: "SE",
  da: "DK",
  fi: "FI",
  no: "NO",
  el: "GR",
  he: "IL",
  th: "TH",
  vi: "VN",
  id: "ID",
  ro: "RO",
  hu: "HU",
  bg: "BG",
  ca: "ES",
  hr: "HR",
  sk: "SK",
  sl: "SI",
  et: "EE",
  lv: "LV",
  lt: "LT",
  sr: "RS",
  mk: "MK",
  sq: "AL",
  bs: "BA",
  is: "IS",
  ga: "IE",
  cy: "GB",
  mt: "MT",
  eu: "ES",
  gl: "ES",
  sw: "KE",
  af: "ZA",
  zu: "ZA",
  am: "ET",
  hy: "AM",
  az: "AZ",
  ka: "GE",
  kk: "KZ",
  ky: "KG",
  uz: "UZ",
  mn: "MN",
  my: "MM",
  km: "KH",
  lo: "LA",
  ne: "NP",
  si: "LK",
  ta: "IN",
  te: "IN",
  bn: "BD",
  mr: "IN",
  gu: "IN",
  pa: "IN",
  ml: "IN",
  kn: "IN",
  ur: "PK",
  fa: "IR",
  ps: "AF",
  ku: "TR",
}

function countryToFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return ""
  return [...code]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("")
}

export function getLanguageFlag(code: string | null | undefined): string {
  if (!code || typeof code !== "string") return ""
  const countryCode = LANGUAGE_TO_COUNTRY[code.toLowerCase()]
  if (!countryCode) return ""
  return countryToFlag(countryCode)
}

export function enrichLanguage<T extends Pick<Language, "code">>(
  lang: T,
): T & { flag: string } {
  return { ...lang, flag: getLanguageFlag(lang.code) }
}

export function enrichLanguages<T extends Pick<Language, "code">>(
  langs: T[],
): (T & { flag: string })[] {
  return langs.map(enrichLanguage)
}
