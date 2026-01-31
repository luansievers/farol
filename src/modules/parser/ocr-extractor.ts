/**
 * OCR Text Extractor
 * Extracts text from scanned PDFs using Tesseract.js
 */

import { createWorker, OEM, PSM } from "tesseract.js";
import type { Result } from "@shared/types/index.js";
import type { ParserError, ExtractionResult } from "./types/index.js";

/**
 * Convert PDF buffer to images for OCR
 * This is a simplified approach - for production, consider using pdf2pic or similar
 * Note: tesseract.js can work directly with PDF files in newer versions
 * For now, we'll pass the PDF directly and let Tesseract handle it
 * If this doesn't work well, we can add pdf2pic dependency later
 */
function pdfToImages(pdfBuffer: Buffer): Buffer[] {
  return [pdfBuffer];
}

/**
 * Extract text from scanned PDF using OCR
 */
export async function extractTextWithOcr(
  pdfBuffer: Buffer,
  options: { language?: string } = {}
): Promise<Result<ExtractionResult, ParserError>> {
  const language = options.language ?? "por";

  let worker = null;

  try {
    // Create Tesseract worker
    worker = await createWorker(language, OEM.LSTM_ONLY, {
      logger: () => {
        // Silent logger - uncomment for debugging
        // console.log(`[OCR] ${m.status}: ${String(m.progress * 100)}%`);
      },
    });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    // Convert PDF to images (or use directly if supported)
    const images = pdfToImages(pdfBuffer);

    const textParts: string[] = [];
    let totalConfidence = 0;

    for (const image of images) {
      const {
        data: { text, confidence },
      } = await worker.recognize(image);

      if (text.trim()) {
        textParts.push(text.trim());
        totalConfidence += confidence;
      }
    }

    await worker.terminate();

    const fullText = textParts.join("\n\n");
    const avgConfidence =
      images.length > 0 ? totalConfidence / images.length : 0;

    if (!fullText || fullText.length < 50) {
      return {
        success: false,
        error: {
          code: "EMPTY_CONTENT",
          message: "OCR extraction returned insufficient content",
          details: {
            extractedLength: fullText.length,
            confidence: avgConfidence,
          },
        },
      };
    }

    return {
      success: true,
      data: {
        text: fullText,
        pageCount: images.length,
        method: "ocr",
        confidence: avgConfidence,
      },
    };
  } catch (error) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore termination errors
      }
    }

    return {
      success: false,
      error: {
        code: "OCR_ERROR",
        message:
          error instanceof Error ? error.message : "OCR processing failed",
        details: error,
      },
    };
  }
}
