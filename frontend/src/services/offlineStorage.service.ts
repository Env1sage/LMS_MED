// IndexedDB Storage Service for Offline EPUB Content
// Stores encrypted chapters and metadata

interface OfflineBook {
  learningUnitId: string;
  title: string;
  chapterCount: number;
  downloadedAt: Date;
  expiresAt: Date;
  watermarkData?: any;
}

interface EncryptedChapter {
  chapterId: string;
  learningUnitId: string;
  chapterTitle: string;
  chapterOrder: number;
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  checksum: string;
  downloadedAt: Date;
}

class OfflineStorageService {
  private static instance: OfflineStorageService;
  private dbName = 'BitflowLMS';
  private version = 1;
  private db: IDBDatabase | null = null;

  private constructor() {}

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('offline_books')) {
          const bookStore = db.createObjectStore('offline_books', {
            keyPath: 'learningUnitId',
          });
          bookStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('encrypted_chapters')) {
          const chapterStore = db.createObjectStore('encrypted_chapters', {
            keyPath: 'chapterId',
          });
          chapterStore.createIndex('learningUnitId', 'learningUnitId', {
            unique: false,
          });
          chapterStore.createIndex('chapterOrder', 'chapterOrder', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('offline_annotations')) {
          const annotationStore = db.createObjectStore('offline_annotations', {
            keyPath: 'id',
            autoIncrement: true,
          });
          annotationStore.createIndex('learningUnitId', 'learningUnitId', {
            unique: false,
          });
          annotationStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  // Save offline book metadata
  async saveOfflineBook(book: OfflineBook): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_books'], 'readwrite');
      const store = transaction.objectStore('offline_books');
      const request = store.put(book);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline book metadata
  async getOfflineBook(learningUnitId: string): Promise<OfflineBook | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_books'], 'readonly');
      const store = transaction.objectStore('offline_books');
      const request = store.get(learningUnitId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all offline books
  async getAllOfflineBooks(): Promise<OfflineBook[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_books'], 'readonly');
      const store = transaction.objectStore('offline_books');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Save encrypted chapter
  async saveEncryptedChapter(chapter: EncryptedChapter): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['encrypted_chapters'],
        'readwrite'
      );
      const store = transaction.objectStore('encrypted_chapters');
      const request = store.put(chapter);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get encrypted chapter
  async getEncryptedChapter(
    chapterId: string
  ): Promise<EncryptedChapter | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['encrypted_chapters'],
        'readonly'
      );
      const store = transaction.objectStore('encrypted_chapters');
      const request = store.get(chapterId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all chapters for a learning unit
  async getChaptersForBook(
    learningUnitId: string
  ): Promise<EncryptedChapter[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['encrypted_chapters'],
        'readonly'
      );
      const store = transaction.objectStore('encrypted_chapters');
      const index = store.index('learningUnitId');
      const request = index.getAll(learningUnitId);

      request.onsuccess = () => {
        const chapters = request.result || [];
        // Sort by chapter order
        chapters.sort((a, b) => a.chapterOrder - b.chapterOrder);
        resolve(chapters);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Delete offline book and all its chapters
  async deleteOfflineBook(learningUnitId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise(async (resolve, reject) => {
      try {
        // Delete book metadata
        const bookTransaction = this.db!.transaction(
          ['offline_books'],
          'readwrite'
        );
        const bookStore = bookTransaction.objectStore('offline_books');
        await new Promise<void>((res, rej) => {
          const req = bookStore.delete(learningUnitId);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        });

        // Delete all chapters
        const chapters = await this.getChaptersForBook(learningUnitId);
        const chapterTransaction = this.db!.transaction(
          ['encrypted_chapters'],
          'readwrite'
        );
        const chapterStore = chapterTransaction.objectStore('encrypted_chapters');

        for (const chapter of chapters) {
          await new Promise<void>((res, rej) => {
            const req = chapterStore.delete(chapter.chapterId);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
          });
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Check if book is available offline
  async isBookAvailableOffline(learningUnitId: string): Promise<boolean> {
    const book = await this.getOfflineBook(learningUnitId);
    if (!book) return false;

    // Check if not expired
    const now = new Date();
    if (book.expiresAt && new Date(book.expiresAt) < now) {
      // Expired, delete it
      await this.deleteOfflineBook(learningUnitId);
      return false;
    }

    return true;
  }

  // Save offline annotation (for sync later)
  async saveOfflineAnnotation(annotation: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['offline_annotations'],
        'readwrite'
      );
      const store = transaction.objectStore('offline_annotations');
      const request = store.add({ ...annotation, synced: false });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get unsynced annotations
  async getUnsyncedAnnotations(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['offline_annotations'],
        'readonly'
      );
      const store = transaction.objectStore('offline_annotations');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all offline data (logout)
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['offline_books', 'encrypted_chapters', 'offline_annotations'],
        'readwrite'
      );

      const bookStore = transaction.objectStore('offline_books');
      const chapterStore = transaction.objectStore('encrypted_chapters');
      const annotationStore = transaction.objectStore('offline_annotations');

      Promise.all([
        new Promise<void>((res, rej) => {
          const req = bookStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = chapterStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = annotationStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
      ])
        .then(() => resolve())
        .catch(reject);
    });
  }

  // Get storage usage
  async getStorageUsage(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        usage,
        quota,
        percentage,
      };
    }

    return { usage: 0, quota: 0, percentage: 0 };
  }
}

export default OfflineStorageService.getInstance();
