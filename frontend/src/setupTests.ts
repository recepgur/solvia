import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import cryptoMock from './test/setup/crypto.mock';

// Set up TextEncoder/Decoder for Node environment
Object.defineProperty(global, 'TextEncoder', {
  value: TextEncoder,
  writable: true
});

Object.defineProperty(global, 'TextDecoder', {
  value: TextDecoder,
  writable: true
});

// Import jest-dom for type augmentation
import '@testing-library/jest-dom';

// Set up globals
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

Object.assign(global, {
  TextEncoder: function() { return textEncoder; },
  TextDecoder: function() { return textDecoder; },
  Buffer: require('buffer').Buffer
});

// Mock crypto for tests
const mockCrypto = {
  getRandomValues: (buffer: Uint8Array) => {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },
  subtle: cryptoMock.subtle
};

// Set up crypto mock on both window and global
[window, global].forEach(target => {
  Object.defineProperty(target, 'crypto', {
    value: mockCrypto,
    configurable: true,
    writable: true
  });
});

// Mock localStorage with in-memory storage
const store = new Map<string, string>();
const mockStorage = {
  getItem: jest.fn((key: string) => store.get(key) || null),
  setItem: jest.fn((key: string, value: string) => store.set(key, value)),
  clear: jest.fn(() => store.clear()),
  removeItem: jest.fn((key: string) => store.delete(key)),
  key: jest.fn((index: number) => Array.from(store.keys())[index] || null),
  get length() { return store.size; }
};

Object.defineProperty(window, 'localStorage', { 
  value: mockStorage,
  configurable: true,
  writable: true
});

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Set test timeout
