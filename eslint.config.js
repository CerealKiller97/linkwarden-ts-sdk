import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: { allowDefaultProject: ["eslint.config.js"] }, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Object shapes are declared with `type`, never `interface`.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": "error",
      // Class members always state their access: `public` or `private`, never ES `#private`.
      "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit" }],
      // A field that only stores a constructor argument is declared in the constructor.
      "@typescript-eslint/parameter-properties": ["error", { prefer: "parameter-property" }],
      "no-restricted-syntax":["error", { selector: "PrivateIdentifier", message: "Use the `private` modifier instead of `#private`." }],
      "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      // The decode helpers take the expected response type as a parameter on purpose.
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["test/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
