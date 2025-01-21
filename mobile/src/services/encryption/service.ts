import EncryptionManager from '../../utils/encryption';

class EncryptionService {
  private encryptionManager: EncryptionManager;

  constructor() {
    this.encryptionManager = new EncryptionManager();
  }

  async encryptMessage(message: string): Promise<{ encrypted: string; key: string }> {
    try {
      const key = EncryptionManager.generateKey();
      const encrypted = await EncryptionManager.encryptMessage(message, key);
      return {
        encrypted,
        key: key.toString('base64')
      };
    } catch (error) {
      console.error('Message encryption error:', error);
      throw error;
    }
  }

  async decryptMessage(encryptedMessage: string, key: string): Promise<string> {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      return await EncryptionManager.decryptMessage(encryptedMessage, keyBuffer);
    } catch (error) {
      console.error('Message decryption error:', error);
      throw error;
    }
  }
}

export default new EncryptionService();
