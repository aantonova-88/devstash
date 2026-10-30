import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The shadcn registry ships components importing `cn` from the npm package
  // "cn"; this project's helper lives in @/lib/utils. No components.json
  // setting rewrites it, so fail lint on every freshly generated file instead.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "cn",
              message: 'Import { cn } from "@/lib/utils" instead of the "cn" package.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Monaco's minified distribution, copied in by scripts/copy-monaco.mjs.
    "public/monaco/**",
  ]),
]);

export default eslintConfig;
