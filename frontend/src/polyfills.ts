import { Buffer } from 'buffer';
import streamBrowserify from 'stream-browserify';

// Show initialization state in DOM before any React code
function showLoadingState() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#1a1b23;color:#fff;">
        <div style="text-align:center;">
          <h1 style="color:#00a884;font-size:24px;margin-bottom:16px;">Loading Solvio...</h1>
          <p style="color:#aaa;font-size:14px;">Initializing secure environment</p>
        </div>
      </div>
    `;
  }
}

function showInitializationError(error: Error) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#1a1b23;color:#fff;padding:20px;">
        <div style="text-align:center;max-width:600px;">
          <h1 style="color:#ff4444;font-size:24px;margin-bottom:16px;">Initialization Error</h1>
          <p style="color:#aaa;font-size:14px;margin-bottom:20px;">The application failed to initialize properly. Please refresh the page or contact support.</p>
          <pre style="background:#2d2e3d;padding:15px;border-radius:5px;text-align:left;overflow-x:auto;font-size:12px;">${error.message}</pre>
        </div>
      </div>
    `;
  }
}

// Initialize polyfills before any React code
try {
  console.log('[polyfills] Starting initialization...');
  showLoadingState();

  // Initialize Buffer
  if (typeof window !== 'undefined') {
    if (!window.Buffer) {
      window.Buffer = Buffer;
      window.global = window;
      console.log('[polyfills] Buffer initialized globally');
    }

    // Initialize stream
    if (!window.stream) {
      const stream = streamBrowserify;
      if (!stream?.Readable?.prototype) {
        throw new Error('Invalid stream object structure');
      }
      window.stream = stream;
      console.log('[polyfills] Stream initialized globally');
    }

    // Initialize process
    if (!window.process) {
      const processEnv: ProcessEnv = {
        NODE_ENV: process.env.NODE_ENV || 'production',
        VITE_MOCK_DATA: process.env.VITE_MOCK_DATA || 'false',
        VITE_SOLANA_NETWORK: process.env.VITE_SOLANA_NETWORK || 'devnet'
      };

      const proc: Process = {
        env: processEnv,
        stdout: null,
        stderr: null,
        stdin: null,
        argv: [],
        version: '',
        versions: {},
        platform: 'browser',
        browser: true,
        title: 'browser',
        nextTick: (fn: Function) => setTimeout(fn, 0),
        cwd: () => '/',
        exit: () => {},
        kill: () => {},
        umask: () => 0,
        uptime: () => 0,
        hrtime: () => [0, 0],
        memoryUsage: () => ({
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          rss: 0,
          arrayBuffers: 0
        })
      };

      (window as any).process = proc;
      console.log('[polyfills] Process initialized with env:', processEnv);
    }

    // Verify initialization
    if (!window.Buffer || !window.stream?.Readable || !window.process?.env) {
      throw new Error('Critical polyfills not properly initialized');
    }

    console.log('[polyfills] All polyfills initialized successfully');
  } else {
    throw new Error('Window object not available');
  }
} catch (error) {
  console.error('[polyfills] Critical initialization error:', error);
  showInitializationError(error instanceof Error ? error : new Error(String(error)));
  throw error;
}

// Type declarations for global objects
declare global {
  var Buffer: typeof Buffer;
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    stream: typeof import('stream-browserify');
    process: {
      env: {
        NODE_ENV: string;
        VITE_MOCK_DATA: string;
        VITE_SOLANA_NETWORK: string;
      };
      stdout: null;
      stderr: null;
      stdin: null;
      argv: string[];
      version: string;
      versions: Record<string, string>;
      platform: string;
      browser: boolean;
      title: string;
      nextTick: (fn: Function) => void;
      cwd: () => string;
      exit: () => void;
      kill: () => void;
      umask: () => number;
      uptime: () => number;
      hrtime: () => [number, number];
      memoryUsage: () => {
        heapTotal: number;
        heapUsed: number;
        external: number;
        rss: number;
        arrayBuffers: number;
      };
    };
  }
}

function initializeBuffer() {
  if (typeof window === 'undefined') return;

  try {
    // Set up Buffer globally first
    window.Buffer = Buffer;
    window.global = window;
    (window.global as any).Buffer = Buffer;

    // Initialize Buffer with proper TypedArray inheritance
    if (typeof Buffer === 'undefined' || !Buffer.from) {
      console.log('[polyfills] Initializing Buffer with TypedArray inheritance...');
      interface BufferConstructor {
        new (arg: number | ArrayBuffer | Array<any>): Uint8Array;
        (arg: number | ArrayBuffer | Array<any>): Uint8Array;
        from(value: string | ArrayBuffer | Array<any>): Uint8Array;
        alloc(size: number): Uint8Array;
        allocUnsafe(size: number): Uint8Array;
        isBuffer(obj: any): boolean;
        prototype: Uint8Array;
      }
      
      const BufferImpl = function(this: Uint8Array | void, arg: number | ArrayBuffer | Array<any>) {
        if (!(this instanceof BufferImpl)) {
          return new (BufferImpl as unknown as BufferConstructor)(arg);
        }
        if (typeof arg === 'number') {
          return new Uint8Array(new ArrayBuffer(arg));
        }
        return new Uint8Array(arg);
      } as unknown as BufferConstructor;

      // Ensure Buffer inherits from Uint8Array
      Object.setPrototypeOf(BufferImpl.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(BufferImpl, Uint8Array);

      // Add static methods
      BufferImpl.from = function(value: string | ArrayBuffer | Array<any>) {
        if (typeof value === 'string') {
          const encoder = new TextEncoder();
          return new Uint8Array(encoder.encode(value));
        }
        return new Uint8Array(value);
      };

      BufferImpl.alloc = function(size: number) {
        return new Uint8Array(new ArrayBuffer(size));
      };

      BufferImpl.allocUnsafe = BufferImpl.alloc;
      BufferImpl.isBuffer = function(obj: any) {
        return obj instanceof Uint8Array;
      };

      (window as any).Buffer = BufferImpl;
      console.log('[polyfills] Buffer initialized with TypedArray inheritance');
    }

    // Verify Buffer functionality
    try {
      const testBuffer = Buffer.alloc(10);
      const sliced = testBuffer.slice(0, 5);
      if (!(sliced instanceof Uint8Array)) {
        throw new Error('Buffer slice did not return Uint8Array');
      }
      console.log('[polyfills] Buffer verification successful');
    } catch (error) {
      console.error('[polyfills] Buffer verification failed:', error);
      throw error;
    }

    // Ensure Buffer prototype properly extends Uint8Array and has required methods
    if (!(Buffer.prototype instanceof Uint8Array)) {
      console.log('[polyfills] Setting up Buffer prototype chain...');
      Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
    }

    // Ensure slice method is properly bound and returns Buffer instances
    const originalSlice = Buffer.prototype.slice;
    Buffer.prototype.slice = function(start?: number, end?: number): Uint8Array {
      const slice = originalSlice.call(this, start, end);
      Object.setPrototypeOf(slice, Buffer.prototype);
      return slice;
    };

    // Ensure all required prototype methods are available and bound
    const requiredProtoMethods = ['slice', 'toString', 'equals', 'copy', 'write', 'fill'];
    requiredProtoMethods.forEach(method => {
      if (typeof Buffer.prototype[method] !== 'function') {
        console.error(`[polyfills] Missing prototype method: ${method}`);
        throw new Error(`Missing required Buffer.prototype.${method} method`);
      }
      
      // Ensure method is bound
      const originalMethod = Buffer.prototype[method];
      Buffer.prototype[method] = function(...args: any[]) {
        return originalMethod.apply(this, args);
      };
    });

    // Verify Buffer functionality
    console.log('[polyfills] Verifying Buffer functionality...');
    const testBuf = Buffer.from('test');
    if (!(testBuf instanceof Uint8Array)) {
      throw new Error('Buffer is not instanceof Uint8Array');
    }

    // Test required methods
    const sliced = testBuf.slice(0);
    if (sliced.length !== 4 || !sliced.equals(testBuf)) {
      throw new Error('Buffer methods not working correctly');
    }

    console.log('[polyfills] Buffer initialized and verified successfully');
  } catch (error) {
    console.error('[polyfills] Buffer initialization error:', error);
    throw error;
  }
}

function initializeProcess() {
  if (typeof window === 'undefined') return;

  if (!window.process) {
    window.process = {
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        VITE_MOCK_DATA: process.env.VITE_MOCK_DATA || 'false',
        VITE_SOLANA_NETWORK: process.env.VITE_SOLANA_NETWORK || 'devnet'
      },
      stdout: null,
      stderr: null,
      stdin: null,
      argv: [],
      version: '',
      versions: {},
      platform: 'browser',
      browser: true,
      title: 'browser',
      nextTick: (fn: Function) => setTimeout(fn, 0),
      cwd: () => '/',
      exit: () => {},
      kill: () => {},
      umask: () => 0,
      uptime: () => 0,
      hrtime: () => [0, 0],
      memoryUsage: () => ({
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0
      })
    } as any;
    
    console.log('[polyfills] Process initialized with env:', window.process.env);
  } else {
    console.log('[polyfills] Process already initialized');
  }
}

// Initialize in order
initializeBuffer();
initializeProcess();

export {};
