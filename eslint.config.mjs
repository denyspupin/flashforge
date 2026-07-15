import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "*.tsbuildinfo"],
  },
]

export default eslintConfig
