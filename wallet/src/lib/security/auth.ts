import { Buffer } from 'buffer';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  expiresAt: number | null;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'wallet_auth_token';
  private static readonly IV_LENGTH = 16;
  private static readonly ENCRYPTION_KEY: Promise<CryptoKey> = (async () => {
    const key = new Uint8Array(32);
    window.crypto.getRandomValues(key);
    return await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  })();

  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    token: null,
    expiresAt: null
  };

  private constructor() {
    this.loadAuthState().catch(error => {
      console.error('Failed to load auth state:', error);
      this.logout();
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async loadAuthState(): Promise<void> {
    const storedToken = localStorage.getItem(AuthService.TOKEN_KEY);
    if (storedToken) {
      try {
        const decrypted = await this.decrypt(storedToken);
        const { token, expiresAt } = JSON.parse(decrypted);
        if (expiresAt && expiresAt > Date.now()) {
          this.authState = {
            isAuthenticated: true,
            token,
            expiresAt
          };
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        this.logout();
      }
    }
  }

  public async login(password: string): Promise<boolean> {
    try {
      // Hash password before sending to server
      const hashedPassword = await this.hashPassword(password);
      
      // TODO: Implement actual server authentication
      // For now, using a mock authentication
      const mockAuth = this.mockAuthenticate(hashedPassword);
      
      if (mockAuth.success) {
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        const authData = {
          token: mockAuth.token,
          expiresAt
        };
        
        const encrypted = await this.encrypt(JSON.stringify(authData));
        localStorage.setItem(AuthService.TOKEN_KEY, encrypted);
        
        this.authState = {
          isAuthenticated: true,
          token: mockAuth.token,
          expiresAt
        };
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  public logout(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    this.authState = {
      isAuthenticated: false,
      token: null,
      expiresAt: null
    };
  }

  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated && 
           !!this.authState.expiresAt && 
           this.authState.expiresAt > Date.now();
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hash).toString('hex');
  }

  private async encrypt(text: string): Promise<string> {
    const iv = new Uint8Array(AuthService.IV_LENGTH);
    window.crypto.getRandomValues(iv);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = await AuthService.ENCRYPTION_KEY;
    
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
    
    return Buffer.from(iv).toString('hex') + ':' + 
           Buffer.from(ciphertext).toString('hex') + ':' + 
           Buffer.from(authTag).toString('hex');
  }

  private async decrypt(text: string): Promise<string> {
    const [ivHex, encryptedHex, authTagHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Combine ciphertext and auth tag as expected by subtle.decrypt
    const data = new Uint8Array([...encrypted, ...authTag]);
    const key = await AuthService.ENCRYPTION_KEY;
    
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
  }

  private mockAuthenticate(hashedPassword: string): { success: boolean; token: string } {
    // TODO: Replace with actual server authentication
    // For now, simulate password validation by checking if hash is valid hex
    const isValidHash = /^[a-f0-9]{64}$/i.test(hashedPassword);
    return {
      success: isValidHash,
      token: isValidHash ? (() => {
        const tokenBytes = new Uint8Array(32);
        window.crypto.getRandomValues(tokenBytes);
        return Buffer.from(tokenBytes).toString('hex');
      })() : ''
    };
  }
}

export const authService = AuthService.getInstance();
