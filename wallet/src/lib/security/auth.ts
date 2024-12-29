import { Buffer } from 'buffer';
import * as crypto from 'crypto';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  expiresAt: number | null;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'wallet_auth_token';
  private static readonly ENCRYPTION_KEY = crypto.randomBytes(32);
  private static readonly IV_LENGTH = 16;

  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    token: null,
    expiresAt: null
  };

  private constructor() {
    this.loadAuthState();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadAuthState(): void {
    const storedToken = localStorage.getItem(AuthService.TOKEN_KEY);
    if (storedToken) {
      try {
        const decrypted = this.decrypt(storedToken);
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
        
        const encrypted = this.encrypt(JSON.stringify(authData));
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

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(AuthService.IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', AuthService.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  }

  private decrypt(text: string): string {
    const [ivHex, encrypted, authTagHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', AuthService.ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private mockAuthenticate(hashedPassword: string): { success: boolean; token: string } {
    // TODO: Replace with actual server authentication
    // For now, simulate password validation by checking if hash is valid hex
    const isValidHash = /^[a-f0-9]{64}$/i.test(hashedPassword);
    return {
      success: isValidHash,
      token: isValidHash ? crypto.randomBytes(32).toString('hex') : ''
    };
  }
}

export const authService = AuthService.getInstance();
