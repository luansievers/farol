/**
 * PDF Parser module
 * Extracts text from contract PDFs for AI analysis
 */

export type {
  ParserError,
  ParserErrorCode,
  ParserConfig,
  ParserStats,
  ExtractionResult,
} from "./types/index.js";

export { extractTextFromPdf } from "./pdf-extractor.js";
export { extractTextWithOcr } from "./ocr-extractor.js";
export { createParserService, type ParserService } from "./service.js";
