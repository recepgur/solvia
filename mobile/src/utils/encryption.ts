import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

class EncryptionManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly KEY_LENGTH = 32;

  static generateKey(): Buffer {
    return randomBytes(this.KEY_LENGTH);
  }

  static async encrypt(data: string, key: Buffer): Promise<{ encrypted: Buffer; iv: Buffer; authTag: Buffer }> {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv, { authTagLength: 16 });
    
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final()
    ]);

    return {
      encrypted,
      iv,
      authTag: cipher.getAuthTag()
    };
  }

  static async decrypt(encrypted: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Promise<string> {
    const decipher = createDecipheriv(this.ALGORITHM, key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString();
  }

  static async encryptMessage(message: string, key: Buffer): Promise<string> {
    const { encrypted, iv, authTag } = await this.encrypt(message, key);
    
    // Format: base64(iv):base64(authTag):base64(encrypted)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  static async decryptMessage(encryptedMessage: string, key: Buffer): Promise<string> {
    const [ivBase64, authTagBase64, encryptedBase64] = encryptedMessage.split(':');
    
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    return this.decrypt(encrypted, key, iv, authTag);
  }
}

export default EncryptionManager;
