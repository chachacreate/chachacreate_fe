// eslint.config.js
import globals from 'globals';

export default [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    // JS/TS 파서와 전역 설정
    languageOptions: {
      parser: '@typescript-eslint/parser', // TS용 파서
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    // 플러그인 등록
    plugins: {
      react: 'eslint-plugin-react',
      'react-hooks': 'eslint-plugin-react-hooks',
      '@typescript-eslint': '@typescript-eslint/eslint-plugin',
      'jsx-a11y': 'eslint-plugin-jsx-a11y',
      prettier: 'eslint-plugin-prettier',
      import: 'eslint-plugin-import',
    },

    // 플러그인/해석 설정
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json', // TS 경로 alias 참조
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'], // Node 파일 확장자 지원
        },
      },
    },

    // 규칙 적용
    rules: {
      // Prettier 관련
      'prettier/prettier': 'warn',

      // React 17+ JSX Transform 적용
      'react/react-in-jsx-scope': 'off',

      // TS: 사용하지 않는 변수 _로 시작하면 허용
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },

    // recommended 규칙 세트 확장
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
      'plugin:@typescript-eslint/recommended',
      'plugin:jsx-a11y/recommended',
      'plugin:prettier/recommended', // Prettier와 충돌 방지
    ],
  },
];
