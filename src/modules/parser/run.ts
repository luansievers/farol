/**
 * PDF Parser CLI entry point
 * Usage:
 *   pnpm parser        - Process all contracts ready for extraction
 *   pnpm parser:batch  - Process a batch of contracts
 *   pnpm parser:stats  - Show extraction statistics
 *   pnpm parser:reset  - Reset failed extractions for retry
 */

import "dotenv/config";
import { createParserService } from "./service.js";

async function main() {
  const command = process.argv[2] ?? "all";
  const parser = createParserService();

  switch (command) {
    case "all": {
      console.log(
        "[Parser] Processing all contracts ready for extraction...\n"
      );
      const result = await parser.processAll();

      if (!result.success) {
        console.error("\n[Parser] Processing failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Parser] Done!");
      break;
    }

    case "batch": {
      console.log("[Parser] Processing a batch of contracts...\n");
      const result = await parser.processBatch();

      if (!result.success) {
        console.error("\n[Parser] Batch failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Parser] Batch done!");
      break;
    }

    case "stats": {
      console.log("[Parser] Extraction Statistics\n");
      const stats = await parser.getStats();

      console.log(`  Ready for extraction: ${String(stats.ready)}`);
      console.log(`  Successfully extracted: ${String(stats.extracted)}`);
      console.log(`  Failed extractions: ${String(stats.failed)}`);
      console.log(`  Total: ${String(stats.total)}`);
      break;
    }

    case "reset": {
      console.log("[Parser] Resetting failed extractions...\n");
      const count = await parser.resetFailed();
      console.log(`[Parser] Reset ${String(count)} contracts for retry`);
      break;
    }

    default:
      console.log("Usage: pnpm parser [all|batch|stats|reset]");
      console.log("  all   - Process all contracts (default)");
      console.log("  batch - Process a batch of contracts");
      console.log("  stats - Show extraction statistics");
      console.log("  reset - Reset failed extractions");
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("[Parser] Fatal error:", err);
  process.exit(1);
});
