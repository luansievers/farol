/**
 * S3-compatible storage provider
 * Works with AWS S3, MinIO, GCS, and other S3-compatible services
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Result } from "@shared/types/index.js";
import type {
  StorageProvider,
  StorageConfig,
  UploadOptions,
  SignedUrlOptions,
  UploadResult,
  DownloadResult,
  StorageError,
} from "../types/index.js";

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/**
 * Map AWS SDK errors to StorageError
 */
function mapError(
  error: unknown,
  defaultCode: StorageError["code"]
): StorageError {
  if (error instanceof Error) {
    const name = error.name;

    if (name === "NoSuchKey" || name === "NotFound") {
      return {
        code: "NOT_FOUND",
        message: "Object not found in storage",
        cause: error,
      };
    }

    if (name === "AccessDenied" || name === "Forbidden") {
      return {
        code: "ACCESS_DENIED",
        message: "Access denied to storage object",
        cause: error,
      };
    }

    return {
      code: defaultCode,
      message: error.message,
      cause: error,
    };
  }

  return {
    code: "UNKNOWN",
    message: "Unknown storage error",
  };
}

/**
 * S3-compatible storage provider implementation
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string | undefined;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;

    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint && { endpoint: config.endpoint }),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? !!config.endpoint,
    });
  }

  async upload(
    key: string,
    content: Buffer | string,
    options?: UploadOptions
  ): Promise<Result<UploadResult, StorageError>> {
    try {
      const body = typeof content === "string" ? Buffer.from(content) : content;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType ?? "application/octet-stream",
        Metadata: options?.metadata,
      });

      const response = await this.client.send(command);

      const url = this.endpoint
        ? `${this.endpoint}/${this.bucket}/${key}`
        : `https://${this.bucket}.s3.amazonaws.com/${key}`;

      return {
        success: true,
        data: {
          key,
          url,
          etag: response.ETag?.replace(/"/g, ""),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: mapError(error, "UPLOAD_FAILED"),
      };
    }
  }

  async download(key: string): Promise<Result<DownloadResult, StorageError>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return {
          success: false,
          error: {
            code: "DOWNLOAD_FAILED",
            message: "Empty response body",
          },
        };
      }

      const content = await streamToBuffer(
        response.Body as NodeJS.ReadableStream
      );

      return {
        success: true,
        data: {
          content,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: mapError(error, "DOWNLOAD_FAILED"),
      };
    }
  }

  async getSignedUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<Result<string, StorageError>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const expiresIn = options?.expiresIn ?? 3600;
      const url = await getS3SignedUrl(this.client, command, { expiresIn });

      return {
        success: true,
        data: url,
      };
    } catch (error) {
      return {
        success: false,
        error: mapError(error, "SIGNED_URL_FAILED"),
      };
    }
  }

  async exists(key: string): Promise<Result<boolean, StorageError>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "NotFound") {
        return {
          success: true,
          data: false,
        };
      }

      return {
        success: false,
        error: mapError(error, "UNKNOWN"),
      };
    }
  }

  async delete(key: string): Promise<Result<void, StorageError>> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: mapError(error, "UNKNOWN"),
      };
    }
  }
}
