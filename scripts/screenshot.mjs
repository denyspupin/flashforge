import { chromium } from "playwright"

const SHOTS_DIR = "docs/screenshots"
const BASE = "http://localhost:3000"

const HIDE_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay],
  [class^="cl-"], [data-clerk-component], iframe[src*="clerk"],
  .tsqd-open-btn-container, [class*="tsqd-"] { display: none !important; }
`

async function shot(page, path, opts = {}) {
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {})
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS_DIR}/${path}`, ...opts })
  console.log("✓", path)
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  await context.addInitScript((css) => {
    const s = document.createElement("style")
    s.textContent = css
    if (document.head) document.head.appendChild(s)
    else
      document.addEventListener("DOMContentLoaded", () =>
        document.head.appendChild(s),
      )
  }, HIDE_CSS)

  const page = await context.newPage()

  // 1. Landing — hero
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1200)
  await shot(page, "01-landing-hero.png", { fullPage: false })

  // 2. Landing — full page
  await shot(page, "02-landing-full.png", { fullPage: true })

  // 3. Explore (community decks)
  await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)
  await shot(page, "03-explore.png", { fullPage: false })

  // 4. Public deck detail
  const curatedDeckId = "3ffb5e7c-14fb-467f-af2e-a526b9d900b9"
  await page.goto(`${BASE}/explore/decks/${curatedDeckId}`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(1500)
  await shot(page, "04-deck-detail.png", { fullPage: false })

  // 5. Guest study (front)
  await page.goto(`${BASE}/explore/decks/${curatedDeckId}/study`, {
    waitUntil: "networkidle",
  })
  await page.waitForTimeout(1500)
  await shot(page, "05-study-front.png", { fullPage: false })

  // 6. Click the card to reveal the back
  const revealBtn = page.getByRole("button", { name: /reveal/i }).first()
  if ((await revealBtn.count()) > 0) {
    await revealBtn.click().catch(() => {})
  } else {
    await page.mouse.click(720, 360)
  }
  await page.waitForTimeout(800)
  await shot(page, "06-study-back.png", { fullPage: false })

  // 7. Mobile landing
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  await mobile.addInitScript((css) => {
    const s = document.createElement("style")
    s.textContent = css
    if (document.head) document.head.appendChild(s)
  }, HIDE_CSS)
  const m = await mobile.newPage()
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" })
  await m.waitForTimeout(1500)
  await m.addStyleTag({ content: HIDE_CSS })
  await m.waitForTimeout(400)
  await m.screenshot({ path: `${SHOTS_DIR}/07-landing-mobile.png` })
  console.log("✓ 07-landing-mobile.png")

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
