/**
 * Anomaly Score CLI Runner
 * Commands for calculating and managing anomaly scores
 */

import { createAnomalyService } from "./service.js";

async function main() {
  const command = process.argv[2] ?? "all";
  const arg1 = process.argv[3];

  const service = createAnomalyService();

  switch (command) {
    case "all": {
      console.log("Processing all contracts for value score...\n");
      const result = await service.processAll();
      if (!result.success) {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    case "batch": {
      console.log("Processing batch of contracts for value score...\n");
      const result = await service.processBatch();
      if (!result.success) {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    case "stats": {
      console.log("Anomaly Score Statistics:\n");
      const stats = await service.getStats();
      console.log(`  Pending: ${String(stats.pending)}`);
      console.log(`  Calculated: ${String(stats.calculated)}`);
      console.log(`  Total: ${String(stats.total)}`);
      console.log(
        `  Average Value Score: ${stats.averageValueScore.toFixed(2)}`
      );
      console.log("\n  By Category:");
      console.log(`    LOW: ${String(stats.byCategory.LOW)}`);
      console.log(`    MEDIUM: ${String(stats.byCategory.MEDIUM)}`);
      console.log(`    HIGH: ${String(stats.byCategory.HIGH)}`);
      break;
    }

    case "reset": {
      const resetType = arg1 ?? "value";
      if (resetType === "all") {
        console.log("Resetting all anomaly scores...\n");
        const count = await service.resetAllScores();
        console.log(`Reset ${String(count)} anomaly score records`);
      } else {
        console.log("Resetting value scores...\n");
        const count = await service.resetValueScores();
        console.log(`Reset value scores for ${String(count)} contracts`);
      }
      break;
    }

    case "recalculate": {
      if (!arg1) {
        console.error("Error: Contract ID required");
        console.log("Usage: pnpm anomaly:recalculate <contractId>");
        process.exit(1);
      }
      console.log(`Recalculating value score for contract ${arg1}...\n`);
      const result = await service.recalculateValueScore(arg1);
      if (result.success) {
        console.log(`Value Score: ${String(result.data.valueScore)}/25`);
        console.log(`Reason: ${result.data.valueReason}`);
      } else {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    case "single": {
      if (!arg1) {
        console.error("Error: Contract ID required");
        console.log("Usage: pnpm anomaly:single <contractId>");
        process.exit(1);
      }
      console.log(`Calculating value score for contract ${arg1}...\n`);
      const result = await service.calculateValueScore(arg1);
      if (result.success) {
        console.log(`Score: ${String(result.data.score)}/25`);
        console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
        console.log(`Reason: ${result.data.reason}`);
        if (result.data.stats) {
          console.log("\nStatistics:");
          console.log(`  Category: ${result.data.stats.category}`);
          console.log(
            `  Year: ${result.data.stats.year ? String(result.data.stats.year) : "All time"}`
          );
          console.log(`  Mean: R$ ${result.data.stats.mean.toFixed(2)}`);
          console.log(
            `  Std Dev: R$ ${result.data.stats.standardDeviation.toFixed(2)}`
          );
          console.log(
            `  Contract Count: ${String(result.data.stats.contractCount)}`
          );
          console.log(
            `  Contract Value: R$ ${result.data.stats.contractValue.toFixed(2)}`
          );
          console.log(
            `  Deviations from Mean: ${result.data.stats.deviationsFromMean.toFixed(2)}`
          );
          console.log(
            `  % Above Mean: ${result.data.stats.percentageAboveMean.toFixed(2)}%`
          );
        }
      } else {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    default:
      console.log("Anomaly Score Commands:");
      console.log("  all          - Process all pending contracts");
      console.log("  batch        - Process a batch of contracts");
      console.log("  stats        - Show anomaly score statistics");
      console.log(
        "  reset        - Reset value scores (or 'reset all' for all scores)"
      );
      console.log(
        "  recalculate  - Recalculate and save value score for a contract"
      );
      console.log(
        "  single       - Calculate value score for a contract (no save)"
      );
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
