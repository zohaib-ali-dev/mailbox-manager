import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

// Colours live only in src/styles (see docs/reference/COLOR_SYSTEM.md).
// Flags hex (3, 4, 6, 8 digits), rgb(, rgba(, hsl( and hsla( inside string and template literals.
const COLOUR_PATTERN =
  '(^|[^&\\w])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b|\\b(rgba?|hsla?)\\(';
const COLOUR_MESSAGE =
  'Hard-coded colour. Add a token to src/styles/themeColors.json and read it with tokens(theme).';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    ignores: ['src/styles/**', 'src/generated/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${COLOUR_PATTERN}/]`, message: COLOUR_MESSAGE },
        { selector: `TemplateElement[value.raw=/${COLOUR_PATTERN}/]`, message: COLOUR_MESSAGE },
      ],
    },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'src/generated/**',
  ]),
]);

export default eslintConfig;
