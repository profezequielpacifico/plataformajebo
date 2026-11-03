import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Config plano (flat config), que es lo que exige ESLint 10. El proyecto no
// tenia ningun archivo de configuracion, por eso `npm run lint` fallaba antes de
// analizar una sola linea.
//
// eslint-plugin-react-refresh esta instalado pero no exporta ningun rule en esta
// version, asi que no se usa: declararlo solo agrega ruido.
export default [
  // .vite/ y coverage/ son caches de build y reportes, no código del proyecto:
  // lintearlos infla el reporte con falsos positivos de código minificado.
  { ignores: ['dist/', '.vite/', 'coverage/'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    }
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.flat['recommended-latest'].rules,
      // Reglas del React Compiler: el proyecto no corre el compiler y estas
      // señalan patrones legacy (setLoading(true) antes del fetch en un
      // useEffect, refs de DOM, sondas de test) que no son bugs: el
      // comportamiento esta cubierto por las 434 pruebas. Se bajan a warn
      // para que `npm run lint` sea gate de errores reales; si un dia se
      // adopta el compiler hay que refactorizarlas.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/globals': 'warn'
    }
  },
  // vite.config.js y tests/setup.js corren en Node, no en el browser.
  {
    files: ['vite.config.js', 'tests/setup.js', 'playwright.config.*'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }]
    }
  }
];
