import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "*.tsbuildinfo",
      "components/garn/**",
      "lib/use-announce.ts",
      "lib/use-isomorphic-layout-effect.ts",
      "lib/frame.ts",
      "lib/inset.ts",
      "lib/field-variants.ts",
      "lib/field-surface.tsx",
      "lib/use-resize-observer.ts",
      "lib/use-clipboard.ts",
      "lib/use-controllable-state.ts",
      "lib/use-merged-ref.ts",
      "lib/use-event-listener.ts",
      "lib/drag-gesture.ts",
      "lib/cmdk.tsx",
      "lib/use-debounced-value.ts",
      "lib/use-local-storage.ts",
      "lib/use-prefers-reduced-motion.ts",
      "lib/use-media-query.ts",
    ],
  },
]

export default eslintConfig
