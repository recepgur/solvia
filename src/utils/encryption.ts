import { box, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

export const generateKeyPair = () => {
  const keyPair = box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  };
};

export const generateSharedKey = (mySecretKey: string, theirPublicKey: string) => {
  const sharedKey = box.before(
    decodeBase64(theirPublicKey),
    decodeBase64(mySecretKey)
  );
  return encodeBase64(sharedKey);
};

export const encryptMessage = async (message: string, sharedKey: string = '') => {
  const nonce = randomBytes(box.nonceLength);
  const encoder = new globalThis.TextEncoder();
  const messageUint8 = encoder.encode(message);
  const encrypted = box.after(
    messageUint8,
    nonce,
    decodeBase64(sharedKey)
  );

  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);

  return encodeBase64(fullMessage);
};

export const decryptMessage = async (encryptedMessage: string, sharedKey: string = '') => {
  const messageWithNonceAsUint8 = decodeBase64(encryptedMessage);
  const nonce = messageWithNonceAsUint8.slice(0, box.nonceLength);
  const message = messageWithNonceAsUint8.slice(
    box.nonceLength,
    messageWithNonceAsUint8.length
  );

  const decrypted = box.after(
    message,
    nonce,
    decodeBase64(sharedKey)
  );

  const decoder = new globalThis.TextDecoder();
  return decoder.decode(decrypted);
};

export const generateNonce = () => {
  return encodeBase64(randomBytes(box.nonceLength));
};
