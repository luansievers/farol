/**
 * Classification CLI entry point
 * Usage:
 *   pnpm classify        - Classify all pending contracts
 *   pnpm classify:batch  - Process a batch of contracts
 *   pnpm classify:stats  - Show classification statistics
 *   pnpm classify:reset  - Reset non-manual classifications
 *   pnpm classify:set <id> <category> - Manually set category
 *   pnpm classify:reclassify <id> - Reclassify a specific contract
 */

import "dotenv/config";
import type { ContractCategory } from "@/generated/prisma/client.js";
import { createClassificationService } from "./service.js";

const VALID_CATEGORIES: ContractCategory[] = [
  "OBRAS",
  "TI",
  "SAUDE",
  "EDUCACAO",
  "SERVICOS",
  "OUTROS",
];

async function main() {
  const command = process.argv[2] ?? "all";
  const classification = createClassificationService();

  switch (command) {
    case "all": {
      console.log("[Classification] Classifying all pending contracts...\n");
      const result = await classification.processAll();

      if (!result.success) {
        console.error(
          "\n[Classification] Processing failed:",
          result.error.message
        );
        process.exit(1);
      }

      console.log("\n[Classification] Done!");
      printCategoryBreakdown(result.data.byCategory);
      break;
    }

    case "batch": {
      console.log("[Classification] Processing a batch of contracts...\n");
      const result = await classification.processBatch();

      if (!result.success) {
        console.error("\n[Classification] Batch failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Classification] Batch done!");
      printCategoryBreakdown(result.data.byCategory);
      break;
    }

    case "stats": {
      console.log("[Classification] Statistics\n");
      const stats = await classification.getStats();

      console.log(`  Pending classification: ${String(stats.pending)}`);
      console.log(`  Classified (non-OUTROS): ${String(stats.classified)}`);
      console.log(`  Manually classified: ${String(stats.manual)}`);
      console.log(`  Total: ${String(stats.total)}`);
      console.log("\n  By category:");
      printCategoryBreakdown(stats.byCategory);
      break;
    }

    case "reset": {
      console.log("[Classification] Resetting classifications...\n");
      const count = await classification.resetClassifications();
      console.log(
        `[Classification] Reset ${String(count)} contracts for re-classification`
      );
      break;
    }

    case "set": {
      const contractId = process.argv[3];
      const category = process.argv[4]?.toUpperCase() as
        | ContractCategory
        | undefined;

      if (!contractId || !category) {
        console.error(
          "[Classification] Error: Contract ID and category required"
        );
        console.log("Usage: pnpm classify:set <contract-id> <category>");
        console.log(`Valid categories: ${VALID_CATEGORIES.join(", ")}`);
        process.exit(1);
      }

      if (!VALID_CATEGORIES.includes(category)) {
        console.error(`[Classification] Error: Invalid category "${category}"`);
        console.log(`Valid categories: ${VALID_CATEGORIES.join(", ")}`);
        process.exit(1);
      }

      console.log(
        `[Classification] Setting category for contract ${contractId} to ${category}...\n`
      );

      const result = await classification.setManualCategory(
        contractId,
        category
      );

      if (!result.success) {
        console.error("\n[Classification] Failed:", result.error.message);
        process.exit(1);
      }

      console.log("\n[Classification] Category set successfully!");
      console.log(`  Category: ${result.data.category}`);
      console.log(`  Source: ${result.data.source}`);
      break;
    }

    case "reclassify": {
      const contractId = process.argv[3];

      if (!contractId) {
        console.error("[Classification] Error: Contract ID required");
        console.log("Usage: pnpm classify:reclassify <contract-id>");
        process.exit(1);
      }

      console.log(`[Classification] Reclassifying contract ${contractId}...\n`);

      const result = await classification.reclassify(contractId);

      if (!result.success) {
        console.error(
          "\n[Classification] Reclassification failed:",
          result.error.message
        );
        process.exit(1);
      }

      console.log("\n[Classification] Reclassified successfully!");
      console.log(`  Category: ${result.data.category}`);
      console.log(`  Source: ${result.data.source}`);
      console.log(`  Confidence: ${result.data.confidence}`);
      console.log(`  Reason: ${result.data.reason}`);
      break;
    }

    default:
      console.log(
        "Usage: pnpm classify [all|batch|stats|reset|set|reclassify]"
      );
      console.log(
        "  all                     - Classify all pending contracts (default)"
      );
      console.log("  batch                   - Process a batch of contracts");
      console.log("  stats                   - Show classification statistics");
      console.log(
        "  reset                   - Reset non-manual classifications"
      );
      console.log("  set <id> <category>     - Manually set category");
      console.log("  reclassify <id>         - Reclassify a specific contract");
      console.log(`\nValid categories: ${VALID_CATEGORIES.join(", ")}`);
      process.exit(1);
  }
}

function printCategoryBreakdown(byCategory: Record<ContractCategory, number>) {
  const total = Object.values(byCategory).reduce(
    (sum, count) => sum + count,
    0
  );

  for (const [category, count] of Object.entries(byCategory)) {
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
    console.log(`    ${category}: ${String(count)} (${percentage}%)`);
  }
}

main().catch((err: unknown) => {
  console.error("[Classification] Fatal error:", err);
  process.exit(1);
});
