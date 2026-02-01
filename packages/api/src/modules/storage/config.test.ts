/**
 * Storage Config Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getStorageConfig, isStorageConfigured } from "./config.js";

describe("Storage Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getStorageConfig", () => {
    it("should return config from STORAGE_* env vars", () => {
      process.env.STORAGE_ENDPOINT = "http://localhost:9000";
      process.env.STORAGE_REGION = "us-west-2";
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_SECRET_KEY = "secret-key";
      process.env.STORAGE_BUCKET = "test-bucket";
      process.env.STORAGE_FORCE_PATH_STYLE = "true";

      const config = getStorageConfig();

      expect(config.endpoint).toBe("http://localhost:9000");
      expect(config.region).toBe("us-west-2");
      expect(config.accessKeyId).toBe("access-key");
      expect(config.secretAccessKey).toBe("secret-key");
      expect(config.bucket).toBe("test-bucket");
      expect(config.forcePathStyle).toBe(true);
    });

    it("should fallback to AWS_* env vars", () => {
      process.env.AWS_REGION = "eu-west-1";
      process.env.AWS_ACCESS_KEY_ID = "aws-access";
      process.env.AWS_SECRET_ACCESS_KEY = "aws-secret";
      process.env.STORAGE_BUCKET = "aws-bucket";

      const config = getStorageConfig();

      expect(config.region).toBe("eu-west-1");
      expect(config.accessKeyId).toBe("aws-access");
      expect(config.secretAccessKey).toBe("aws-secret");
    });

    it("should use default region", () => {
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_SECRET_KEY = "secret-key";
      process.env.STORAGE_BUCKET = "bucket";

      const config = getStorageConfig();

      expect(config.region).toBe("us-east-1");
    });

    it("should throw when access key is missing", () => {
      process.env.STORAGE_SECRET_KEY = "secret-key";
      process.env.STORAGE_BUCKET = "bucket";

      expect(() => getStorageConfig()).toThrow(
        "Storage access key is required"
      );
    });

    it("should throw when secret key is missing", () => {
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_BUCKET = "bucket";

      expect(() => getStorageConfig()).toThrow(
        "Storage secret key is required"
      );
    });

    it("should throw when bucket is missing", () => {
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_SECRET_KEY = "secret-key";

      expect(() => getStorageConfig()).toThrow("Storage bucket is required");
    });
  });

  describe("isStorageConfigured", () => {
    it("should return true when all required vars are set", () => {
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_SECRET_KEY = "secret-key";
      process.env.STORAGE_BUCKET = "bucket";

      expect(isStorageConfigured()).toBe(true);
    });

    it("should return true with AWS_* vars", () => {
      process.env.AWS_ACCESS_KEY_ID = "access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "secret-key";
      process.env.STORAGE_BUCKET = "bucket";

      expect(isStorageConfigured()).toBe(true);
    });

    it("should return false when access key is missing", () => {
      process.env.STORAGE_SECRET_KEY = "secret-key";
      process.env.STORAGE_BUCKET = "bucket";

      expect(isStorageConfigured()).toBe(false);
    });

    it("should return false when secret key is missing", () => {
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_BUCKET = "bucket";

      expect(isStorageConfigured()).toBe(false);
    });

    it("should return false when bucket is missing", () => {
      process.env.STORAGE_ACCESS_KEY = "access-key";
      process.env.STORAGE_SECRET_KEY = "secret-key";

      expect(isStorageConfigured()).toBe(false);
    });
  });
});
