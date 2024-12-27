declare module 'stream-browserify' {
  interface StreamBuffer extends Uint8Array {
    slice(start?: number, end?: number): StreamBuffer;
    toString(encoding?: string): string;
  }

  interface ReadableStream {
    on(event: 'data', callback: (chunk: StreamBuffer) => void): this;
    on(event: 'end' | 'error', callback: () => void): this;
    once(event: string, callback: (chunk: StreamBuffer | void) => void): this;
    emit(event: string, ...args: any[]): boolean;
    pipe<T extends WritableStream>(destination: T, options?: { end?: boolean }): T;
    read(size?: number): StreamBuffer | null;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
  }

  interface WritableStream {
    write(chunk: StreamBuffer | string): boolean;
    end(): void;
  }

  interface ReadableConstructor {
    new(): ReadableStream;
    prototype: ReadableStream;
  }

  interface WritableConstructor {
    new(): WritableStream;
    prototype: WritableStream;
  }

  const streamBrowserify: {
    Readable: ReadableConstructor;
    Writable: WritableConstructor;
  };

  export = streamBrowserify;
}
