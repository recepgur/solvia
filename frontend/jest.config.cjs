module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': require.resolve('uuid')
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: {
        ignoreCodes: [1343]
      },
      jsx: 'react'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@solana|@project-serum|@metaplex-foundation)/)'
  ],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 10000,
  moduleDirectories: ['node_modules', 'src'],
  roots: ['<rootDir>/src']
};
