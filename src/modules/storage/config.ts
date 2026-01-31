/**
 * Storage module configuration
 * Loads from environment variables
 */

import type { StorageConfig } from "./types/index.js";

/**
 * Get storage configuration from environment variables
 * @throws Error if required variables are missing
 */
export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const region =
    process.env.STORAGE_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const accessKeyId =
    process.env.STORAGE_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.STORAGE_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.STORAGE_BUCKET;
  const forcePathStyle = process.env.STORAGE_FORCE_PATH_STYLE === "true";

  if (!accessKeyId) {
    throw new Error(
      "Storage access key is required. Set STORAGE_ACCESS_KEY or AWS_ACCESS_KEY_ID"
    );
  }

  if (!secretAccessKey) {
    throw new Error(
      "Storage secret key is required. Set STORAGE_SECRET_KEY or AWS_SECRET_ACCESS_KEY"
    );
  }

  if (!bucket) {
    throw new Error("Storage bucket is required. Set STORAGE_BUCKET");
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    forcePathStyle,
  };
}

/**
 * Check if storage is configured (all required env vars present)
 */
export function isStorageConfigured(): boolean {
  const accessKeyId =
    process.env.STORAGE_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.STORAGE_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.STORAGE_BUCKET;

  return !!(accessKeyId && secretAccessKey && bucket);
}
