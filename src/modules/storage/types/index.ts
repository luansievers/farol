/**
 * Storage module types
 */

import type { Result } from "@shared/types/index.js";

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  /** S3-compatible endpoint URL (e.g., MinIO, GCS) */
  endpoint?: string | undefined;
  /** AWS region */
  region: string;
  /** Access key ID */
  accessKeyId: string;
  /** Secret access key */
  secretAccessKey: string;
  /** Bucket name */
  bucket: string;
  /** Force path-style URLs (required for MinIO) */
  forcePathStyle?: boolean | undefined;
}

/**
 * Options for upload operations
 */
export interface UploadOptions {
  /** Content type (MIME type) */
  contentType?: string;
  /** Additional metadata */
  metadata?: Record<string, string>;
}

/**
 * Options for signed URL generation
 */
export interface SignedUrlOptions {
  /** URL expiration time in seconds (default: 3600) */
  expiresIn?: number;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  /** Storage path/key */
  key: string;
  /** Full URL to the object */
  url: string;
  /** ETag of the uploaded object */
  etag?: string | undefined;
}

/**
 * Result of a download operation
 */
export interface DownloadResult {
  /** File content as Buffer */
  content: Buffer;
  /** Content type (MIME type) */
  contentType?: string | undefined;
  /** Content length in bytes */
  contentLength?: number | undefined;
}

/**
 * Storage error types
 */
export type StorageErrorCode =
  | "NOT_FOUND"
  | "ACCESS_DENIED"
  | "INVALID_CONFIG"
  | "UPLOAD_FAILED"
  | "DOWNLOAD_FAILED"
  | "SIGNED_URL_FAILED"
  | "UNKNOWN";

/**
 * Storage error
 */
export interface StorageError {
  code: StorageErrorCode;
  message: string;
  cause?: Error;
}

/**
 * Abstract storage provider interface
 * Supports S3, GCS, MinIO, and other S3-compatible services
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param key - Storage path/key for the file
   * @param content - File content as Buffer or string
   * @param options - Upload options
   */
  upload(
    key: string,
    content: Buffer | string,
    options?: UploadOptions
  ): Promise<Result<UploadResult, StorageError>>;

  /**
   * Download a file from storage
   * @param key - Storage path/key of the file
   */
  download(key: string): Promise<Result<DownloadResult, StorageError>>;

  /**
   * Generate a signed URL for temporary access
   * @param key - Storage path/key of the file
   * @param options - Signed URL options
   */
  getSignedUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<Result<string, StorageError>>;

  /**
   * Check if a file exists in storage
   * @param key - Storage path/key of the file
   */
  exists(key: string): Promise<Result<boolean, StorageError>>;

  /**
   * Delete a file from storage
   * @param key - Storage path/key of the file
   */
  delete(key: string): Promise<Result<void, StorageError>>;
}
