import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "coverage/**"],
  },
  {
    // jsx-a11y is included via next/core-web-vitals; explicit override ensures keyboard and aria rules are enforced
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/no-autofocus": "warn",
    },
  },
];

export default eslintConfig;
