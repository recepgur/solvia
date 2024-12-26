// Mock Web Crypto API for tests
interface MockCryptoKey {
  type: string;
  algorithm: any;
  extractable: boolean;
  usages: string[];
  raw?: Uint8Array;
}

const cryptoMock = {
  getRandomValues: (array: Uint8Array) => {
    // Deterministic "random" values for testing
    const seed = process.env.NODE_ENV === 'test' ? 12345 : Date.now();
    for (let i = 0; i < array.length; i++) {
      array[i] = (seed + i * 17 + 23) % 256;
    }
    return array;
  },
  subtle: {
    generateKey: async (algorithm: any, extractable: boolean, keyUsages: string[]) => {
      // Use algorithm params and timestamp to determine key type and generate appropriate key data
      const keyType = algorithm.name === 'ECDH' ? 'ECDH' : 'AES-GCM';
      
      // Generate deterministic but unique key data
      const uniqueCounter = (global as any).mockKeyCounter = ((global as any).mockKeyCounter || 0) + 1;
      const timestamp = process.env.NODE_ENV === 'test' ? 1234567890 : Date.now();
      const uniqueId = `${timestamp}-${uniqueCounter}`;
      
      if (keyType === 'ECDH') {
        try {
          // Generate deterministic but valid key pair for testing
          const seedData = new TextEncoder().encode(`${timestamp}-${uniqueCounter}-${JSON.stringify(algorithm)}`);
          
          // Generate private key using SHA-256 of seed
          const privateKeyData = new Uint8Array(32);
          const hashBuffer = await cryptoMock.subtle.digest('SHA-256', seedData);
          const hashArray = new Uint8Array(hashBuffer);
          privateKeyData.set(hashArray);
          
          // Ensure private key is not all zeros and is in valid range
          let isValid = false;
          for (let i = 0; i < 32; i++) {
            if (privateKeyData[i] !== 0) {
              isValid = true;
              break;
            }
          }
          if (!isValid) {
            privateKeyData[0] = 1; // Ensure at least one non-zero byte
          }
          
          // Generate deterministic but valid public key components
          const xCoord = new Uint8Array(32);
          const yCoord = new Uint8Array(32);
          
          // Use SHA-256 of private key for x coordinate
          const xHashBuffer = await cryptoMock.subtle.digest('SHA-256', privateKeyData);
          const xHashArray = new Uint8Array(xHashBuffer);
          xCoord.set(xHashArray);
          
          // Use different hash for y coordinate
          const yInput = new Uint8Array(privateKeyData.length + 1);
          yInput.set(privateKeyData);
          yInput[yInput.length - 1] = 1; // Add extra byte to make it different
          const yHashBuffer = await cryptoMock.subtle.digest('SHA-256', yInput);
          const yHashArray = new Uint8Array(yHashBuffer);
          yCoord.set(yHashArray);
          
          // Create properly formatted uncompressed public key (65 bytes: 0x04 || x || y)
          const publicKeyData = new Uint8Array(65);
          publicKeyData[0] = 0x04; // Uncompressed point format
          publicKeyData.set(xCoord, 1);
          publicKeyData.set(yCoord, 33);
          
          const keyPair = {
            publicKey: await cryptoMock.subtle.importKey(
              'raw',
              publicKeyData,
              { name: 'ECDH', namedCurve: algorithm.namedCurve || 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            ),
            privateKey: await cryptoMock.subtle.importKey(
              'raw',
              privateKeyData,
              { name: 'ECDH', namedCurve: algorithm.namedCurve || 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            )
          };
          return keyPair;
        } catch (error) {
          console.error('Error generating ECDH key pair:', error);
          throw new Error('Failed to generate valid ECDH key pair');
        }
      } else {
        try {
          // For AES-GCM, generate a single key
          const seedData = new TextEncoder().encode(uniqueId + JSON.stringify(algorithm));
          const keyData = new Uint8Array(16);
          for (let i = 0; i < keyData.length; i++) {
            keyData[i] = seedData[i % seedData.length] ^ ((i * uniqueCounter + timestamp) % 256);
          }
          
          return await cryptoMock.subtle.importKey(
            'raw',
            keyData,
            algorithm,
            extractable,
            keyUsages
          );
        } catch (error) {
          console.error('Error generating AES-GCM key:', error);
          throw new Error('Failed to generate valid AES-GCM key');
        }
      }
    },
    importKey: async (format: string, keyData: Uint8Array | ArrayBufferView | number[] | Record<string, number>, algorithm: any, extractable: boolean, keyUsages: string[]): Promise<MockCryptoKey> => {
      // Validate key data
      let validatedKeyData: Uint8Array;
      if (keyData instanceof Uint8Array) {
        validatedKeyData = keyData;
      } else if (ArrayBuffer.isView(keyData)) {
        validatedKeyData = new Uint8Array((keyData as ArrayBufferView).buffer);
      } else if (Array.isArray(keyData)) {
        validatedKeyData = new Uint8Array(keyData);
      } else if (typeof keyData === 'object') {
        validatedKeyData = new Uint8Array(Object.values(keyData as Record<string, number>));
      } else {
        throw new Error('Invalid key data format');
      }

      // For ECDH keys, enforce proper lengths and format
      if (algorithm.name === 'ECDH') {
        // Handle public keys (raw format, 65 bytes with 0x04 prefix)
        if (format === 'raw' && keyUsages.includes('deriveKey')) {
          // Create a copy of the key data to avoid mutations
          const keyArray = new Uint8Array(validatedKeyData);
          
          // If key is not 65 bytes, pad it to 65 bytes
          if (keyArray.length < 65) {
            const paddedArray = new Uint8Array(65);
            paddedArray[0] = 0x04; // Set uncompressed point format
            paddedArray.set(keyArray.slice(0, 32), 1); // x coordinate
            if (keyArray.length > 32) {
              paddedArray.set(keyArray.slice(32), 33); // y coordinate if available
            }
            validatedKeyData = paddedArray;
          }
          
          // Ensure proper format
          if (validatedKeyData[0] !== 0x04) {
            validatedKeyData[0] = 0x04;
          }
        }
        // Handle private keys (raw or pkcs8 format, 32 bytes)
        else if (format === 'raw' || format === 'pkcs8') {
          let keyArray = validatedKeyData;

          // For PKCS8 format, extract the actual key data
          if (format === 'pkcs8' && keyArray.length > 32) {
            keyArray = keyArray.slice(keyArray.length - 32);
          }
            
          // If key is not 32 bytes, adjust it
          if (keyArray.length !== 32) {
            const adjustedArray = new Uint8Array(32);
            adjustedArray.set(keyArray.slice(0, 32));
            keyArray = adjustedArray;
          }

          // Ensure the key is not all zeros
          const isAllZeros = keyArray.every(byte => byte === 0);
          if (isAllZeros) {
            keyArray[0] = 1; // Set first byte to 1 if all zeros
          }
          
          validatedKeyData = keyArray;
        }
      }

      // Create a proper mock CryptoKey with deterministic key data
      const mockKey: MockCryptoKey = {
        type: format === 'raw' ? 'public' : 'private',
        algorithm: {
          ...algorithm,
          name: algorithm.name || 'ECDH',
          namedCurve: algorithm.namedCurve || 'P-256'
        },
        extractable: extractable,
        usages: keyUsages,
        raw: new Uint8Array(validatedKeyData) // Create a copy to prevent mutations
      };
      return mockKey;
    },
    exportKey: async (format: string, key: MockCryptoKey) => {
      // Use format to determine how to export the key
      if (format === 'raw' && key.raw) {
        return key.raw;
      } else if (format === 'pkcs8' && key.raw) {
        // Add PKCS#8 wrapper around raw key
        const wrapper = new Uint8Array(key.raw.length + 16);
        wrapper.set(key.raw, 16);
        return wrapper;
      }
      return new Uint8Array(32);
    },
    deriveKey: async (algorithm: any, baseKey: MockCryptoKey, derivedKeyAlgorithm: any, extractable: boolean, keyUsages: string[]) => {
      // Use algorithm and baseKey to derive deterministic key material
      const derivedBits = await cryptoMock.subtle.deriveBits(
        algorithm,
        baseKey,
        256
      );
      return await cryptoMock.subtle.importKey(
        'raw',
        derivedBits,
        derivedKeyAlgorithm,
        extractable,
        keyUsages
      );
    },
    deriveBits: async (algorithm: any, baseKey: MockCryptoKey, length: number) => {
      // Generate deterministic bits based on algorithm and baseKey
      const seed = new TextEncoder().encode(
        JSON.stringify(algorithm) + 
        (baseKey.raw ? Array.from(baseKey.raw).join(',') : '')
      );
      const result = new Uint8Array(length / 8);
      for (let i = 0; i < result.length; i++) {
        result[i] = seed[i % seed.length];
      }
      return result;
    },
    encrypt: async (algorithm: any, key: MockCryptoKey, data: ArrayBuffer) => {
      // Use algorithm and key to generate deterministic IV
      const ivSeed = new TextEncoder().encode(
        JSON.stringify(algorithm) + 
        (key.raw ? Array.from(key.raw).join(',') : '')
      );
      const iv = new Uint8Array(12);
      for (let i = 0; i < iv.length; i++) {
        iv[i] = ivSeed[i % ivSeed.length];
      }
      
      const inputData = new Uint8Array(data);
      const encryptedData = new Uint8Array(inputData.length);
      
      // Simple XOR encryption with key and IV
      for (let i = 0; i < inputData.length; i++) {
        encryptedData[i] = inputData[i] ^ 
          (key.raw ? key.raw[i % key.raw.length] : 0) ^ 
          iv[i % iv.length];
      }
      
      const result = new Uint8Array(iv.length + encryptedData.length);
      result.set(iv);
      result.set(encryptedData, iv.length);
      return result;
    },
    decrypt: async (algorithm: any, key: MockCryptoKey, data: ArrayBuffer) => {
      // Use algorithm and key for verification before decrypting
      const dataArray = new Uint8Array(data);
      if (!algorithm || !key || dataArray.length <= 12) {
        throw new Error('Invalid decryption parameters');
      }

      // Validate key format and length
      if (!key.raw || !(key.raw instanceof Uint8Array)) {
        throw new Error('Invalid key format');
      }

      // Ensure key is 32 bytes
      let keyData = key.raw;
      if (keyData.length !== 32) {
        const adjustedKey = new Uint8Array(32);
        adjustedKey.set(keyData.slice(0, Math.min(keyData.length, 32)));
        if (adjustedKey.every(byte => byte === 0)) {
          adjustedKey[0] = 1;
        }
        keyData = adjustedKey;
      }
      
      const iv = dataArray.slice(0, 12);
      const encryptedContent = dataArray.slice(12);
      const decryptedData = new Uint8Array(encryptedContent.length);
      
      // Simple XOR decryption (same as encryption due to XOR properties)
      for (let i = 0; i < encryptedContent.length; i++) {
        decryptedData[i] = encryptedContent[i] ^ 
          keyData[i % keyData.length] ^ 
          iv[i % iv.length];
      }
      
      return decryptedData;
    },
    digest: async (algorithm: string, data: ArrayBuffer) => {
      // Create deterministic hash based on algorithm and input data
      const input = new Uint8Array(data);
      const algorithmBytes = new TextEncoder().encode(algorithm);
      const hash = new Uint8Array(32);
      
      for (let i = 0; i < hash.length; i++) {
        hash[i] = input[i % input.length] ^ algorithmBytes[i % algorithmBytes.length];
      }
      return hash;
    }
  }
};

export default cryptoMock;
