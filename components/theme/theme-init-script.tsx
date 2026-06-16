import type { Theme } from "@/lib/constants"

type ThemeInitScriptProps = {
  initialTheme: Theme
}

export function ThemeInitScript({ initialTheme }: ThemeInitScriptProps) {
  const script = `
(function () {
  try {
    var pref = ${JSON.stringify(initialTheme)};
    var stored = null;
    try { stored = localStorage.getItem("ff-theme"); } catch (e) {}
    if (stored === "light" || stored === "dark" || stored === "system") {
      pref = stored;
    }
    var resolved = pref === "dark" ? "dark" : (pref === "light" ? "light" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    var root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`
  return (
    <script dangerouslySetInnerHTML={{ __html: script }} />
  )
}
