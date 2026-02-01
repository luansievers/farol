/**
 * PDF Parser module types
 */

/**
 * Parser error codes
 */
export type ParserErrorCode =
  | "STORAGE_ERROR"
  | "DOWNLOAD_FAILED"
  | "PARSE_ERROR"
  | "OCR_ERROR"
  | "EMPTY_CONTENT"
  | "DATABASE_ERROR"
  | "TIMEOUT";

/**
 * Parser error
 */
export interface ParserError {
  code: ParserErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Result of PDF text extraction
 */
export interface ExtractionResult {
  text: string;
  pageCount: number;
  method: "pdf-parse" | "ocr";
  confidence?: number;
}

/**
 * Parser processor configuration
 */
export interface ParserConfig {
  batchSize: number;
  ocrEnabled: boolean;
  ocrLanguage: string;
  minTextLength: number;
  maxRetries: number;
}

/**
 * Parser processor statistics
 */
export interface ParserStats {
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  extracted: number;
  ocrUsed: number;
  errors: number;
  lastError: string | null;
}
