import { Buffer } from 'buffer';

export class WalletEncryption {
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 16;
  private static readonly ITERATIONS = 100000;


  public static async encryptWallet(walletData: string, password: string): Promise<string> {
    try {
      const salt = new Uint8Array(this.SALT_LENGTH);
      const iv = new Uint8Array(this.IV_LENGTH);
      window.crypto.getRandomValues(salt);
      window.crypto.getRandomValues(iv);
      
      const key = await this.deriveKey(password, salt);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(walletData);
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );
      
      // In AES-GCM, the auth tag is appended to the ciphertext
      const encryptedArray = new Uint8Array(encrypted);
      const authTag = encryptedArray.slice(-16); // Last 16 bytes are the auth tag
      const ciphertext = encryptedArray.slice(0, -16);
      
      // Format: salt:iv:authTag:encrypted
      return Buffer.from(salt).toString('hex') + ':' +
             Buffer.from(iv).toString('hex') + ':' +
             Buffer.from(authTag).toString('hex') + ':' +
             Buffer.from(ciphertext).toString('hex');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt wallet');
    }
  }

  public static async decryptWallet(encryptedData: string, password: string): Promise<string> {
    try {
      const [saltHex, ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
      
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      const key = await this.deriveKey(password, salt);
      
      // Combine ciphertext and auth tag as expected by subtle.decrypt
      const data = new Uint8Array([...encrypted, ...authTag]);
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt wallet');
    }
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-512'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
