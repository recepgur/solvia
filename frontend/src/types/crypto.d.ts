declare module 'tweetnacl' {
  export interface SignDetached {
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  }
  
  export interface Sign {
    detached: SignDetached;
  }
  
  export const sign: Sign;
}

declare module '../utils/crypto' {
  export interface EncryptedData {
    content: string;  // Base64 encoded encrypted content
    key: string;     // Base64 encoded encrypted AES key
    iv: string;      // Base64 encoded initialization vector
  }

  export type CryptoKey = globalThis.CryptoKey;
}
