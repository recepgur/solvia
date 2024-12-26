import '@testing-library/jest-dom';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { expect } from '@jest/globals';

// Extend Jest matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  },
  toHaveTextContent(received, expected) {
    const pass = received.textContent === expected;
    return {
      message: () => `expected ${received} to have text content "${expected}"`,
      pass,
    };
  },
});

// Configure test environment
(global as any).React = React;
(global as any).ReactDOM = ReactDOM;
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock window.solana
Object.defineProperty(window, 'solana', {
  value: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  writable: true,
  configurable: true
});

// Increase timeout for async operations
jest.setTimeout(10000);
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

// Configure testing-library
import { configure } from '@testing-library/react';

configure({
  asyncUtilTimeout: 5000,
  testIdAttribute: 'data-testid',
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock FileReader
class MockFileReader {
  DONE = FileReader.DONE;
  EMPTY = FileReader.EMPTY;
  LOADING = FileReader.LOADING;
  readyState = FileReader.EMPTY;
  error: Error | null = null;
  result: string | ArrayBuffer | null = null;
  abort = jest.fn();
  addEventListener = jest.fn();
  dispatchEvent = jest.fn();
  onabort = null;
  onerror = null;
  onload = null;
  onloadend = null;
  onloadprogress = null;
  onloadstart = null;
  onprogress = null;
  readAsArrayBuffer = jest.fn();
  readAsBinaryString = jest.fn();
  readAsDataURL = jest.fn().mockImplementation(function(this: any) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock-base64';
      if (this.onloadend) {
        this.onloadend({ target: this });
      }
    }, 0);
  });
  readAsText = jest.fn();
  removeEventListener = jest.fn();
}

Object.defineProperty(window, 'FileReader', {
  writable: true,
  configurable: true,
  value: MockFileReader
});

// Set test timeout
jest.setTimeout(10000);
