import * as crypto from 'crypto';
import { Buffer } from 'buffer';

export class WalletEncryption {
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;
  private static readonly ITERATIONS = 100000;


  public static async encryptWallet(walletData: string, password: string): Promise<string> {
    try {
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const key = await this.deriveKey(password, salt);
      
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(walletData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: salt:iv:authTag:encrypted
      return Buffer.from(salt).toString('hex') + ':' +
             Buffer.from(iv).toString('hex') + ':' +
             Buffer.from(authTag).toString('hex') + ':' +
             encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt wallet');
    }
  }

  public static async decryptWallet(encryptedData: string, password: string): Promise<string> {
    try {
      const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const key = await this.deriveKey(password, salt);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt wallet');
    }
  }

  private static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        'sha512',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }
}
