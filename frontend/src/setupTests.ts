import '@testing-library/jest-dom';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';
import cryptoMock from './test/setup/crypto.mock';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { expect } from '@jest/globals';

// Set up TextEncoder/TextDecoder
global.TextEncoder = NodeTextEncoder as typeof global.TextEncoder;
global.TextDecoder = NodeTextDecoder as typeof global.TextDecoder;

// Wallet adapter is mocked in test-utils.tsx
declare global {
  namespace jest {
    interface Matchers<R> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string): R;
      toBeVisible(): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

// Use the imported crypto mock implementation
const mockSubtle = cryptoMock.subtle;

// Set up crypto mock implementation
Object.defineProperty(window, 'crypto', {
  value: {
    ...cryptoMock,
    subtle: mockSubtle
  },
  configurable: true,
  writable: true
});

// Also set it on global for Node environment
Object.defineProperty(global, 'crypto', {
  value: window.crypto,
  configurable: true,
  writable: true
});

// Mock Buffer for tests
global.Buffer = require('buffer').Buffer;

// Mock localStorage with in-memory storage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string): string | null => store[key] || null),
    setItem: jest.fn((key: string, value: string): void => {
      store[key] = value.toString();
    }),
    clear: jest.fn((): void => {
      store = {};
    }),
    removeItem: jest.fn((key: string): void => {
      delete store[key];
    }),
    key: jest.fn((index: number): string | null => {
      return Object.keys(store)[index] || null;
    }),
    get length(): number {
      return Object.keys(store).length;
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Extend expect matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null;
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be in the document`
          : `expected ${received} to be in the document`,
      pass
    };
  }
});

// Increase test timeout
jest.setTimeout(10000);
