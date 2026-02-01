/**
 * Summary Generator CLI entry point
 * Usage:
 *   pnpm summary        - Generate summaries for all ready contracts
 *   pnpm summary:batch  - Process a batch of contracts
 *   pnpm summary:stats  - Show generation statistics
 *   pnpm summary:reset  - Reset failed generations for retry
 *   pnpm summary:regen <id> - Regenerate summary for a specific contract
 */

import "dotenv/config";
import { createSummaryService } from "./service.js";

async function main() {
  const command = process.argv[2] ?? "all";
  const summary = createSummaryService();

  switch (command) {
    case "all": {
      console.log(
        "[Summary] Generating summaries for all ready contracts...\n"
      );
      const result = await summary.processAll();

      if (!result.success) {
        console.error("\n[Summary] Processing failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Summary] Done!");
      break;
    }

    case "batch": {
      console.log("[Summary] Processing a batch of contracts...\n");
      const result = await summary.processBatch();

      if (!result.success) {
        console.error("\n[Summary] Batch failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Summary] Batch done!");
      break;
    }

    case "stats": {
      console.log("[Summary] Generation Statistics\n");
      const stats = await summary.getStats();

      console.log(`  Ready for generation: ${String(stats.ready)}`);
      console.log(`  Successfully generated: ${String(stats.generated)}`);
      console.log(`  Failed generations: ${String(stats.failed)}`);
      console.log(`  Total: ${String(stats.total)}`);
      break;
    }

    case "reset": {
      console.log("[Summary] Resetting failed generations...\n");
      const count = await summary.resetFailed();
      console.log(`[Summary] Reset ${String(count)} contracts for retry`);
      break;
    }

    case "regen": {
      const contractId = process.argv[3];
      if (!contractId) {
        console.error("[Summary] Error: Contract ID required");
        console.log("Usage: pnpm summary:regen <contract-id>");
        process.exit(1);
      }

      console.log(
        `[Summary] Regenerating summary for contract ${contractId}...\n`
      );
      const result = await summary.regenerateSummary(contractId);

      if (!result.success) {
        console.error("\n[Summary] Regeneration failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Summary] Summary regenerated successfully!");
      console.log("\nSummary:");
      console.log(JSON.stringify(result.data, null, 2));
      break;
    }

    default:
      console.log("Usage: pnpm summary [all|batch|stats|reset|regen]");
      console.log("  all         - Generate all summaries (default)");
      console.log("  batch       - Process a batch of contracts");
      console.log("  stats       - Show generation statistics");
      console.log("  reset       - Reset failed generations");
      console.log("  regen <id>  - Regenerate summary for a contract");
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("[Summary] Fatal error:", err);
  process.exit(1);
});
