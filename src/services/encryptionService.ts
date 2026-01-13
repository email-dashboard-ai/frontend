/**
 * Client-side encryption service for IndexedDB
 * Uses Web Crypto API with AES-GCM encryption
 */

class EncryptionService {
  private key: CryptoKey | null = null;
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Initialize encryption key from user-specific data
   * Uses JWT token or user email as key derivation material
   */
  async initialize(userIdentifier: string): Promise<void> {
    if (this.key) return;

    try {
      // Derive key from user identifier using PBKDF2
      const encoder = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(userIdentifier),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Use fixed salt (in production, should be stored per-user)
      const salt = encoder.encode('email-client-salt-2026');

      this.key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt<T>(data: T): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption key not initialized. Call initialize() first.');
    }

    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Encrypt
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        this.key,
        dataBuffer
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt<T>(encryptedData: string): Promise<T> {
    if (!this.key) {
      throw new Error('Encryption key not initialized. Call initialize() first.');
    }

    try {
      // Decode from base64
      const combined = this.base64ToArrayBuffer(encryptedData);

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encryptedBuffer = combined.slice(this.IV_LENGTH);

      // Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        this.key,
        encryptedBuffer
      );

      // Convert back to JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedBuffer);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * Uses loop to avoid stack overflow with large arrays
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Clear encryption key (on logout)
   */
  clear(): void {
    this.key = null;
  }
}

export const encryptionService = new EncryptionService();
