declare module 'tweetnacl' {
  export interface SignDetached {
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  }
  
  export interface Sign {
    detached: SignDetached;
  }
  
  export const sign: Sign;
}
