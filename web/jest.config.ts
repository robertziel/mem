import type { Config } from 'jest';

const config: Config = {
  maxWorkers: '100%',
  rootDir: '.',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
        },
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    // Swap React Native for its web shim (runs in jsdom)
    '^react-native$': 'react-native-web',
    // Stub expo packages we don't exercise
    '^expo-status-bar$': '<rootDir>/__tests__/__mocks__/expo-status-bar.ts',
    '^expo-sqlite$': '<rootDir>/__tests__/__mocks__/expo-sqlite.ts',
    '^react-native-markdown-display$': '<rootDir>/__tests__/__mocks__/markdown-display.tsx',
    // highlight.js CSS import is a noop in jsdom
    '\\.(css)$': '<rootDir>/__tests__/__mocks__/style.ts',
    // Real markdown stack is ESM-only; swap for a lightweight shim in unit tests
    '^react-markdown$': '<rootDir>/__tests__/__mocks__/react-markdown.tsx',
    '^remark-gfm$': '<rootDir>/__tests__/__mocks__/noop.ts',
    '^rehype-highlight$': '<rootDir>/__tests__/__mocks__/noop.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-markdown|remark-gfm|rehype-highlight|highlight\\.js|' +
      'vfile|vfile-message|unified|bail|is-plain-obj|trough|' +
      'remark-.*|mdast-.*|micromark.*|decode-named-character-reference|' +
      'character-entities.*|property-information|hast-util-.*|' +
      'space-separated-tokens|comma-separated-tokens|unist-.*|' +
      'html-url-attributes|markdown-table|zwitch|html-void-elements|' +
      'ccount|escape-string-regexp|devlop|trim-lines|stringify-entities' +
    ')/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  modulePathIgnorePatterns: ['/.claude/'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.expo/', '/ios/', '/android/', '/dist/'],
};

export default config;
