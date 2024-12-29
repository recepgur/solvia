declare module 'buffer' {
  export const Buffer: {
    from(data: string): {
      slice(start: number, end?: number): Buffer;
    };
    isBuffer(obj: any): boolean;
  };
}
