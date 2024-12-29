import { Buffer } from 'buffer';

// Ensure Buffer is available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// Verify Buffer is properly initialized before allowing slice operations
const verifyBuffer = () => {
  return new Promise<void>((resolve, reject) => {
    try {
      if (!window.Buffer) {
        reject(new Error('Buffer is not initialized'));
      }
      // Test Buffer functionality
      const testBuffer = Buffer.from('test');
      testBuffer.slice(0, 2);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const initializePolyfills = async () => {
  await verifyBuffer();
};
