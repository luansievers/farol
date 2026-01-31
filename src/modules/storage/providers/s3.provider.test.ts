/**
 * S3 Storage Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StorageConfig } from "../types/index.js";

// Mock modules before imports
const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class MockS3Client {
      send = mockSend;
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(public params: unknown) {}
    },
    GetObjectCommand: class MockGetObjectCommand {
      constructor(public params: unknown) {}
    },
    HeadObjectCommand: class MockHeadObjectCommand {
      constructor(public params: unknown) {}
    },
    DeleteObjectCommand: class MockDeleteObjectCommand {
      constructor(public params: unknown) {}
    },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) =>
    mockGetSignedUrl(...args) as Promise<string>,
}));

// Import after mocks
const { S3StorageProvider } = await import("./s3.provider.js");

const mockConfig: StorageConfig = {
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  bucket: "test-bucket",
  forcePathStyle: true,
};

describe("S3StorageProvider", () => {
  let provider: InstanceType<typeof S3StorageProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com");
    provider = new S3StorageProvider(mockConfig);
  });

  describe("constructor", () => {
    it("should create provider with config", () => {
      expect(provider).toBeInstanceOf(S3StorageProvider);
    });
  });

  describe("upload", () => {
    it("should upload buffer successfully", async () => {
      mockSend.mockResolvedValueOnce({ ETag: '"abc123"' });

      const result = await provider.upload(
        "contracts/test.pdf",
        Buffer.from("test content"),
        { contentType: "application/pdf" }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe("contracts/test.pdf");
        expect(result.data.etag).toBe("abc123");
        expect(result.data.url).toContain("test-bucket");
      }
    });

    it("should upload string successfully", async () => {
      mockSend.mockResolvedValueOnce({ ETag: '"def456"' });

      const result = await provider.upload("text/test.txt", "test string");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe("text/test.txt");
      }
    });

    it("should handle upload errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Upload failed"));

      const result = await provider.upload("test.pdf", Buffer.from("test"));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UPLOAD_FAILED");
      }
    });
  });

  describe("download", () => {
    it("should download file successfully", async () => {
      const mockStream = {
        *[Symbol.asyncIterator]() {
          yield Buffer.from("test content");
        },
      };

      mockSend.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: "application/pdf",
        ContentLength: 12,
      });

      const result = await provider.download("contracts/test.pdf");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content.toString()).toBe("test content");
        expect(result.data.contentType).toBe("application/pdf");
        expect(result.data.contentLength).toBe(12);
      }
    });

    it("should handle not found error", async () => {
      const error = new Error("Not found");
      error.name = "NoSuchKey";
      mockSend.mockRejectedValueOnce(error);

      const result = await provider.download("nonexistent.pdf");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should handle empty body", async () => {
      mockSend.mockResolvedValueOnce({ Body: null });

      const result = await provider.download("empty.pdf");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DOWNLOAD_FAILED");
        expect(result.error.message).toBe("Empty response body");
      }
    });
  });

  describe("getSignedUrl", () => {
    it("should generate signed URL successfully", async () => {
      const result = await provider.getSignedUrl("contracts/test.pdf");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("https://signed-url.example.com");
      }
    });

    it("should use custom expiration", async () => {
      await provider.getSignedUrl("test.pdf", { expiresIn: 7200 });

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 }
      );
    });

    it("should handle errors", async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error("Failed to sign"));

      const result = await provider.getSignedUrl("test.pdf");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SIGNED_URL_FAILED");
      }
    });
  });

  describe("exists", () => {
    it("should return true when object exists", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await provider.exists("contracts/test.pdf");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("should return false when object does not exist", async () => {
      const error = new Error("Not found");
      error.name = "NotFound";
      mockSend.mockRejectedValueOnce(error);

      const result = await provider.exists("nonexistent.pdf");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it("should handle other errors", async () => {
      const error = new Error("Access denied");
      error.name = "AccessDenied";
      mockSend.mockRejectedValueOnce(error);

      const result = await provider.exists("restricted.pdf");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ACCESS_DENIED");
      }
    });
  });

  describe("delete", () => {
    it("should delete object successfully", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await provider.delete("contracts/test.pdf");

      expect(result.success).toBe(true);
    });

    it("should handle delete errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Delete failed"));

      const result = await provider.delete("test.pdf");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNKNOWN");
      }
    });
  });
});
