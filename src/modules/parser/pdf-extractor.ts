/**
 * PDF Text Extractor
 * Extracts text from PDF documents using pdf-parse
 */

import { PDFParse } from "pdf-parse";
import type { Result } from "@shared/types/index.js";
import type { ParserError, ExtractionResult } from "./types/index.js";

/**
 * Minimum text length to consider extraction successful
 * PDFs with less text will be sent to OCR
 */
const MIN_TEXT_LENGTH = 50;

/**
 * Clean extracted text by removing excessive whitespace
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Check if extracted text is meaningful
 * Some PDFs return garbage characters or very short text
 */
function isTextMeaningful(text: string, minLength: number): boolean {
  if (text.length < minLength) return false;

  // Check if text has reasonable character distribution
  const alphanumericCount = (
    text.match(/[a-zA-Z0-9áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/g) ?? []
  ).length;
  const ratio = alphanumericCount / text.length;

  // At least 30% should be alphanumeric characters
  return ratio >= 0.3;
}

/**
 * Extract text from PDF buffer using pdf-parse
 */
export async function extractTextFromPdf(
  pdfBuffer: Buffer,
  options: { minTextLength?: number } = {}
): Promise<Result<ExtractionResult, ParserError>> {
  const minTextLength = options.minTextLength ?? MIN_TEXT_LENGTH;

  let parser: PDFParse | null = null;

  try {
    parser = new PDFParse({ data: pdfBuffer });

    const textResult = await parser.getText();

    const cleanedText = cleanText(textResult.text);
    const pageCount = textResult.pages.length;

    await parser.destroy();

    if (!isTextMeaningful(cleanedText, minTextLength)) {
      return {
        success: false,
        error: {
          code: "EMPTY_CONTENT",
          message:
            "PDF text extraction returned insufficient or meaningless content",
          details: {
            extractedLength: cleanedText.length,
            pageCount,
          },
        },
      };
    }

    return {
      success: true,
      data: {
        text: cleanedText,
        pageCount,
        method: "pdf-parse",
      },
    };
  } catch (error) {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Ignore destroy errors
      }
    }

    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: error instanceof Error ? error.message : "Failed to parse PDF",
        details: error,
      },
    };
  }
}
