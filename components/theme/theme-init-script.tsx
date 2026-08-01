import type { Theme } from "@/lib/constants"
import { THEME_STORAGE_KEY } from "@/lib/theme"

type ThemeInitScriptProps = {
  initialTheme: Theme
}

export function ThemeInitScript({ initialTheme }: ThemeInitScriptProps) {
  const script = `
(function () {
  try {
    var path = window.location.pathname;
    var alwaysLight = path === "/" || path.indexOf("/login") === 0 || path.indexOf("/register") === 0;
    if (alwaysLight) {
      var root = document.documentElement;
      root.classList.remove("dark");
      root.style.colorScheme = "light";
      return;
    }
    var pref = ${JSON.stringify(initialTheme)};
    var stored = null;
    try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {}
    if (stored === "light" || stored === "dark" || stored === "system") {
      pref = stored;
    }
    var resolved = pref === "dark" ? "dark" : (pref === "light" ? "light" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`
  return (
    <script dangerouslySetInnerHTML={{ __html: script }} />
  )
}
