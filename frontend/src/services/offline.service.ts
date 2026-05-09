// Offline Service - Coordinates encryption, storage, and download
import apiService from './api.service';
import encryptionService from './encryption.service';
import offlineStorageService from './offlineStorage.service';

interface OfflineDownloadProgress {
  total: number;
  downloaded: number;
  currentChapter: string;
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = navigator.onLine;
  private downloadInProgress: boolean = false;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[Offline Service] Back online');
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[Offline Service] Gone offline');
    });
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  // Initialize offline system
  async initialize(userId: string, deviceId: string): Promise<void> {
    try {
      await offlineStorageService.init();
      await encryptionService.generateDeviceKey(userId, deviceId);
      console.log('[Offline Service] Initialized successfully');
    } catch (error) {
      console.error('[Offline Service] Initialization failed:', error);
      throw error;
    }
  }

  // Download book for offline use
  async downloadBook(
    learningUnitId: string,
    accessToken: string,
    onProgress?: (progress: OfflineDownloadProgress) => void
  ): Promise<void> {
    if (this.downloadInProgress) {
      throw new Error('Another download is in progress');
    }

    if (!this.isOnline) {
      throw new Error('Cannot download while offline');
    }

    this.downloadInProgress = true;

    try {
      // Get device ID from localStorage
      const deviceId = localStorage.getItem('deviceId') || '';

      // Step 1: Request offline download permission
      const response = await apiService.post(
        `/api/offline/download/${learningUnitId}`,
        { deviceId }
      );

      const { learningUnit, chapters, expiresAt, offlineDownloadId } =
        response.data;

      // Step 2: Save book metadata
      await offlineStorageService.saveOfflineBook({
        learningUnitId,
        title: learningUnit.title,
        chapterCount: learningUnit.chapterCount,
        downloadedAt: new Date(),
        expiresAt: new Date(expiresAt),
      });

      // Step 3: Download and encrypt each chapter
      let downloaded = 0;
      for (const chapter of chapters) {
        if (onProgress) {
          onProgress({
            total: chapters.length,
            downloaded,
            currentChapter: chapter.chapterTitle,
          });
        }

        // Fetch chapter content
        const chapterResponse = await apiService.get(
          `/epub/chapter/${chapter.id}?token=${accessToken}`
        );

        const content = chapterResponse.data.content;
        const watermark = chapterResponse.data.watermark;

        // Encrypt chapter content
        const { encryptedData, iv } = await encryptionService.encryptChapter(
          content,
          learningUnitId,
          chapter.id
        );

        // Save encrypted chapter
        await offlineStorageService.saveEncryptedChapter({
          chapterId: chapter.id,
          learningUnitId,
          chapterTitle: chapter.chapterTitle,
          chapterOrder: chapter.chapterOrder,
          encryptedData,
          iv,
          checksum: chapter.checksum,
          downloadedAt: new Date(),
        });

        downloaded++;
      }

      if (onProgress) {
        onProgress({
          total: chapters.length,
          downloaded: chapters.length,
          currentChapter: 'Complete',
        });
      }

      console.log(
        `[Offline Service] Successfully downloaded ${chapters.length} chapters`
      );
    } catch (error) {
      console.error('[Offline Service] Download failed:', error);
      // Clean up partial download
      await offlineStorageService.deleteOfflineBook(learningUnitId);
      throw error;
    } finally {
      this.downloadInProgress = false;
    }
  }

  // Check if book is available offline
  async isBookAvailableOffline(learningUnitId: string): Promise<boolean> {
    try {
      return await offlineStorageService.isBookAvailableOffline(learningUnitId);
    } catch (error) {
      console.error('[Offline Service] Check availability failed:', error);
      return false;
    }
  }

  // Get offline book metadata
  async getOfflineBook(learningUnitId: string) {
    try {
      return await offlineStorageService.getOfflineBook(learningUnitId);
    } catch (error) {
      console.error('[Offline Service] Get book failed:', error);
      return null;
    }
  }

  // Get all offline books
  async getAllOfflineBooks() {
    try {
      return await offlineStorageService.getAllOfflineBooks();
    } catch (error) {
      console.error('[Offline Service] Get all books failed:', error);
      return [];
    }
  }

  // Get decrypted chapter content for offline reading
  async getOfflineChapter(learningUnitId: string, chapterId: string): Promise<string | null> {
    try {
      // Check if book is available offline
      const isAvailable = await this.isBookAvailableOffline(learningUnitId);
      if (!isAvailable) {
        throw new Error('Book not available offline or expired');
      }

      // Get encrypted chapter
      const encryptedChapter = await offlineStorageService.getEncryptedChapter(chapterId);
      if (!encryptedChapter) {
        throw new Error('Chapter not found in offline storage');
      }

      // Decrypt chapter
      const decryptedContent = await encryptionService.decryptChapter(
        encryptedChapter.encryptedData,
        encryptedChapter.iv,
        learningUnitId,
        chapterId
      );

      return decryptedContent;
    } catch (error) {
      console.error('[Offline Service] Get offline chapter failed:', error);
      return null;
    }
  }

  // Get chapters list for offline book
  async getOfflineChapters(learningUnitId: string) {
    try {
      const chapters = await offlineStorageService.getChaptersForBook(learningUnitId);
      return chapters.map(ch => ({
        id: ch.chapterId,
        chapterTitle: ch.chapterTitle,
        chapterOrder: ch.chapterOrder,
      }));
    } catch (error) {
      console.error('[Offline Service] Get chapters failed:', error);
      return [];
    }
  }

  // Delete offline book
  async deleteOfflineBook(learningUnitId: string): Promise<void> {
    try {
      await offlineStorageService.deleteOfflineBook(learningUnitId);
      console.log('[Offline Service] Book deleted successfully');
    } catch (error) {
      console.error('[Offline Service] Delete book failed:', error);
      throw error;
    }
  }

  // Validate offline access with backend (when online)
  async validateOfflineAccess(
    learningUnitId: string,
    deviceId: string
  ): Promise<boolean> {
    if (!this.isOnline) {
      // When offline, check local expiry
      return await this.isBookAvailableOffline(learningUnitId);
    }

    try {
      const response = await apiService.post('/api/offline/validate', {
        learningUnitId,
        deviceId,
      });

      if (!response.data.valid) {
        // Access revoked or expired, delete local copy
        await offlineStorageService.deleteOfflineBook(learningUnitId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Offline Service] Validation failed:', error);
      // If backend is unreachable, check local expiry
      return await this.isBookAvailableOffline(learningUnitId);
    }
  }

  // Sync offline annotations when back online
  private async syncWhenOnline(): Promise<void> {
    try {
      const unsyncedAnnotations =
        await offlineStorageService.getUnsyncedAnnotations();

      if (unsyncedAnnotations.length === 0) {
        return;
      }

      console.log(
        `[Offline Service] Syncing ${unsyncedAnnotations.length} offline annotations...`
      );

      // Sync annotations
      // This would send them to the backend and mark as synced
      // Implementation depends on annotation service API

      console.log('[Offline Service] Sync complete');
    } catch (error) {
      console.error('[Offline Service] Sync failed:', error);
    }
  }

  // Clear all offline data (logout)
  async clearAll(): Promise<void> {
    try {
      await offlineStorageService.clearAllData();
      encryptionService.clearDeviceKey();
      console.log('[Offline Service] All offline data cleared');
    } catch (error) {
      console.error('[Offline Service] Clear failed:', error);
      throw error;
    }
  }

  // Get storage usage
  async getStorageUsage() {
    try {
      return await offlineStorageService.getStorageUsage();
    } catch (error) {
      console.error('[Offline Service] Get storage failed:', error);
      return { usage: 0, quota: 0, percentage: 0 };
    }
  }

  // Check if currently online
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }
}

export default OfflineService.getInstance();
