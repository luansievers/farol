/**
 * Storage module
 * Provides cloud storage abstraction for document storage
 */

export type {
  StorageProvider,
  StorageConfig,
  UploadOptions,
  SignedUrlOptions,
  UploadResult,
  DownloadResult,
  StorageError,
  StorageErrorCode,
} from "./types/index.js";

export { S3StorageProvider } from "./providers/index.js";

export { getStorageConfig, isStorageConfigured } from "./config.js";

// Re-export a factory function for convenience
import { S3StorageProvider } from "./providers/index.js";
import { getStorageConfig } from "./config.js";
import type { StorageProvider } from "./types/index.js";

/**
 * Create a storage provider instance from environment configuration
 */
export function createStorageProvider(): StorageProvider {
  const config = getStorageConfig();
  return new S3StorageProvider(config);
}

// Singleton instance (lazy initialization)
let storageInstance: StorageProvider | null = null;

/**
 * Get the singleton storage provider instance
 * @throws Error if storage is not configured
 */
export function getStorage(): StorageProvider {
  storageInstance ??= createStorageProvider();
  return storageInstance;
}
