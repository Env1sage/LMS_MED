// Encryption Service for Offline EPUB Storage
// AES-256-GCM encryption with device-bound keys

class EncryptionService {
  private static instance: EncryptionService;
  private deviceKey: CryptoKey | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Generate device-bound key
  async generateDeviceKey(userId: string, deviceId: string): Promise<void> {
    try {
      // Combine userId + deviceId + secret to create key material
      const keyMaterial = await this.getKeyMaterial(userId, deviceId);
      
      // Derive AES key from key material
      this.deviceKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('bitflow-lms-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to generate device key:', error);
      throw error;
    }
  }

  private async getKeyMaterial(userId: string, deviceId: string): Promise<CryptoKey> {
    const password = `${userId}-${deviceId}-bitflow-secret-2026`;
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
  }

  // Encrypt chapter content
  async encryptChapter(
    content: string,
    learningUnitId: string,
    chapterId: string
  ): Promise<{
    encryptedData: ArrayBuffer;
    iv: ArrayBuffer;
  }> {
    if (!this.deviceKey) {
      throw new Error('Device key not initialized');
    }

    try {
      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encode content
      const encoder = new TextEncoder();
      const data = encoder.encode(content);

      // Encrypt
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: new TextEncoder().encode(`${learningUnitId}-${chapterId}`),
        },
        this.deviceKey,
        data
      );

      return {
        encryptedData,
        iv: iv.buffer,
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  // Decrypt chapter content
  async decryptChapter(
    encryptedData: ArrayBuffer,
    iv: ArrayBuffer,
    learningUnitId: string,
    chapterId: string
  ): Promise<string> {
    if (!this.deviceKey) {
      throw new Error('Device key not initialized');
    }

    try {
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv),
          additionalData: new TextEncoder().encode(`${learningUnitId}-${chapterId}`),
        },
        this.deviceKey,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  // Clear device key (logout)
  clearDeviceKey(): void {
    this.deviceKey = null;
  }
}

export default EncryptionService.getInstance();
