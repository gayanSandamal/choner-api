module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "object-curly-spacing": ["error", "never"], // Adjust to "never" if needed
    "quotes": ["error", "double"], // Use "single" for single quotes
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "max-len": ["error", {"code": 130}], // Set max line length to 100, change as desired
    "no-extra-semi": "error",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
