#!/usr/bin/env node
/**
 * CLI runner for detail processor
 * Processes pending contracts: fetches details, downloads PDFs, saves amendments
 *
 * Usage:
 *   pnpm detail           # Process all pending contracts
 *   pnpm detail:batch     # Process one batch only
 *   pnpm detail:stats     # Show processing statistics
 *   pnpm detail:reset     # Reset failed contracts to pending
 */

import "dotenv/config";
import { createDetailProcessor } from "./detail-processor.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "all";

  const processor = createDetailProcessor({
    batchSize: 10,
    downloadPdfs: true,
    uploadToStorage: true,
  });

  switch (command) {
    case "all": {
      console.log("=== Contract Detail Processor ===\n");
      const result = await processor.processAll();

      if (!result.success) {
        console.error(`\nFailed: ${result.error.message}`);
        process.exit(1);
      }

      const stats = result.data;
      const finishedAt = stats.finishedAt ?? new Date();
      console.log("\n=== Summary ===");
      console.log(
        `Duration: ${String(Math.round((finishedAt.getTime() - stats.startedAt.getTime()) / 1000))}s`
      );
      console.log(`Processed: ${String(stats.processed)}`);
      console.log(`Errors: ${String(stats.errors)}`);
      break;
    }

    case "batch": {
      console.log("=== Processing Single Batch ===\n");
      const result = await processor.processBatch();

      if (!result.success) {
        console.error(`\nFailed: ${result.error.message}`);
        process.exit(1);
      }

      const stats = result.data;
      console.log("\n=== Batch Summary ===");
      console.log(`Processed: ${String(stats.processed)}`);
      console.log(`Errors: ${String(stats.errors)}`);
      break;
    }

    case "stats": {
      console.log("=== Processing Statistics ===\n");
      const stats = await processor.getStats();
      console.log(`Pending: ${String(stats.pending)}`);
      console.log(`Completed: ${String(stats.completed)}`);
      console.log(`Failed: ${String(stats.failed)}`);
      console.log(`Total: ${String(stats.total)}`);
      break;
    }

    case "reset": {
      console.log("=== Resetting Failed Contracts ===\n");
      const count = await processor.resetFailed();
      console.log(`Reset ${String(count)} contracts to pending status`);
      break;
    }

    default:
      console.log("Usage:");
      console.log("  pnpm detail           # Process all pending contracts");
      console.log("  pnpm detail:batch     # Process one batch only");
      console.log("  pnpm detail:stats     # Show processing statistics");
      console.log(
        "  pnpm detail:reset     # Reset failed contracts to pending"
      );
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
