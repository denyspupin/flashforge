import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { AppShellNavItem } from "@/components/garn/app-shell"

describe("AppShellNavItem asChild rail label", () => {
  it("keeps the label span inside the link and the rail-hide rule on it", () => {
    const html = renderToString(
      <AppShellNavItem asChild active icon={<span>i</span>}>
        <a href="/dashboard">
          <span data-slot="button-label" className="min-w-0 truncate">
            Dashboard
          </span>
        </a>
      </AppShellNavItem>
    )
    expect(html).toContain('data-slot="button-label"')
    expect(html).toContain("group-data-[state=collapsed]/app-shell:[&amp;_[data-slot=button-label]]:hidden")
    expect(html).toContain('data-slot="button-leading"')
    expect(html).toContain('aria-current="page"')
  })
})