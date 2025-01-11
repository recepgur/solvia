import { PublicKey } from '@solana/web3.js';
import { getRedisClient } from './redis';

export async function verifyMessage(publicKey: string, message: string, signatureBase64: string): Promise<boolean> {
  try {
    const key = new PublicKey(publicKey);
    const encodedMessage = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signatureBase64, 'base64');
    const signatureUint8 = Uint8Array.from(signatureBytes);
    
    return PublicKey.isOnCurve(signatureUint8);
  } catch (error) {
    console.error('Error verifying message:', error);
    return false;
  }
}

export async function storeUserSession(publicKey: string, socketId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`session:${publicKey}`, socketId);
  await redis.set(`user:${publicKey}:status`, 'online');
}

export async function removeUserSession(publicKey: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`session:${publicKey}`);
  await redis.set(`user:${publicKey}:status`, 'offline');
}
