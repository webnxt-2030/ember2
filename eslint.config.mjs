import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-import-type-side-effects": "error",
      // Conflicts with no-non-null-assertion: one rule forbids !, the other requires it
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
  },
  {
    ignores: [
      "node_modules/",
      ".next/",
      "**/.next/",
      "dist/",
      "**/dist/",
      "build/",
      "**/build/",
      "coverage/",
      "contracts/",
      "**/*.config.{js,mjs,cjs}",
    ],
  },
);
