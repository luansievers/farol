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

    // Amendment score commands (US-011)
    case "amendment": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for amendment score...\n");
          const result = await service.processAllAmendments();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log("Processing batch of contracts for amendment score...\n");
          const result = await service.processAmendmentBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting amendment scores...\n");
          const count = await service.resetAmendmentScores();
          console.log(`Reset amendment scores for ${String(count)} contracts`);
          break;
        }

        default: {
          // Treat as contract ID for single calculation
          console.log(
            `Calculating amendment score for contract ${subCommand}...\n`
          );
          const result = await service.calculateAmendmentScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Category: ${result.data.stats.category}`);
              console.log(
                `  Category Mean Amendments: ${result.data.stats.mean.toFixed(1)}`
              );
              console.log(
                `  Category Std Dev: ${result.data.stats.standardDeviation.toFixed(1)}`
              );
              console.log(
                `  Contracts in Category: ${String(result.data.stats.contractCount)}`
              );
              console.log(
                `  This Contract Amendments: ${String(result.data.stats.amendmentCount)}`
              );
              console.log(
                `  Total Amendment Value: R$ ${result.data.stats.totalAmendmentValue.toFixed(2)}`
              );
              console.log(
                `  Original Contract Value: R$ ${result.data.stats.originalContractValue.toFixed(2)}`
              );
              console.log(
                `  Value Change Ratio: ${(result.data.stats.valueIncreaseRatio * 100).toFixed(1)}%`
              );
              console.log(
                `  Deviations from Mean: ${result.data.stats.deviationsFromMean.toFixed(2)}`
              );
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    case "amendment:recalculate": {
      if (!arg1) {
        console.error("Error: Contract ID required");
        console.log("Usage: pnpm anomaly amendment:recalculate <contractId>");
        process.exit(1);
      }
      console.log(`Recalculating amendment score for contract ${arg1}...\n`);
      const result = await service.recalculateAmendmentScore(arg1);
      if (result.success) {
        console.log(
          `Amendment Score: ${String(result.data.amendmentScore)}/25`
        );
        console.log(`Reason: ${result.data.amendmentReason}`);
      } else {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    // Concentration score commands (US-012)
    case "concentration": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for concentration score...\n");
          const result = await service.processAllConcentrations();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log(
            "Processing batch of contracts for concentration score...\n"
          );
          const result = await service.processConcentrationBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting concentration scores...\n");
          const count = await service.resetConcentrationScores();
          console.log(
            `Reset concentration scores for ${String(count)} contracts`
          );
          break;
        }

        default: {
          // Treat as contract ID for single calculation
          console.log(
            `Calculating concentration score for contract ${subCommand}...\n`
          );
          const result = await service.calculateConcentrationScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Agency: ${result.data.stats.agencyName}`);
              console.log(`  Supplier: ${result.data.stats.supplierName}`);
              console.log(
                `  Contracts from Supplier: ${String(result.data.stats.contractCount)}`
              );
              console.log(
                `  Total Agency Contracts: ${String(result.data.stats.totalAgencyContracts)}`
              );
              console.log(
                `  Contract %: ${(result.data.stats.contractPercentage * 100).toFixed(1)}%`
              );
              console.log(
                `  Supplier Value: R$ ${result.data.stats.supplierValue.toFixed(2)}`
              );
              console.log(
                `  Total Agency Value: R$ ${result.data.stats.totalAgencyValue.toFixed(2)}`
              );
              console.log(
                `  Value %: ${(result.data.stats.valuePercentage * 100).toFixed(1)}%`
              );
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    case "concentration:recalculate": {
      if (!arg1) {
        console.error("Error: Contract ID required");
        console.log(
          "Usage: pnpm anomaly concentration:recalculate <contractId>"
        );
        process.exit(1);
      }
      console.log(
        `Recalculating concentration score for contract ${arg1}...\n`
      );
      const result = await service.recalculateConcentrationScore(arg1);
      if (result.success) {
        console.log(
          `Concentration Score: ${String(result.data.concentrationScore)}/25`
        );
        console.log(`Reason: ${result.data.concentrationReason}`);
      } else {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    // Duration score commands (US-013)
    case "duration": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for duration score...\n");
          const result = await service.processAllDurations();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log("Processing batch of contracts for duration score...\n");
          const result = await service.processDurationBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting duration scores...\n");
          const count = await service.resetDurationScores();
          console.log(`Reset duration scores for ${String(count)} contracts`);
          break;
        }

        default: {
          // Treat as contract ID for single calculation
          console.log(
            `Calculating duration score for contract ${subCommand}...\n`
          );
          const result = await service.calculateDurationScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Category: ${result.data.stats.category}`);
              console.log(
                `  Category Mean Duration: ${result.data.stats.mean.toFixed(1)} days`
              );
              console.log(
                `  Category Std Dev: ${result.data.stats.standardDeviation.toFixed(1)} days`
              );
              console.log(
                `  Contracts in Category: ${String(result.data.stats.contractCount)}`
              );
              console.log(
                `  This Contract Duration: ${String(result.data.stats.contractDuration)} days`
              );
              console.log(
                `  Deviations from Mean: ${result.data.stats.deviationsFromMean.toFixed(2)}`
              );
              console.log(
                `  Too Short: ${String(result.data.stats.isTooShort)}`
              );
              console.log(`  Too Long: ${String(result.data.stats.isTooLong)}`);
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    case "duration:recalculate": {
      if (!arg1) {
        console.error("Error: Contract ID required");
        console.log("Usage: pnpm anomaly duration:recalculate <contractId>");
        process.exit(1);
      }
      console.log(`Recalculating duration score for contract ${arg1}...\n`);
      const result = await service.recalculateDurationScore(arg1);
      if (result.success) {
        console.log(`Duration Score: ${String(result.data.durationScore)}/25`);
        console.log(`Reason: ${result.data.durationReason}`);
      } else {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    // Consolidated score commands (US-014)
    case "consolidate": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Consolidating all anomaly scores...\n");
          const result = await service.consolidateAll();
          if (result.success) {
            console.log(`Processed: ${String(result.data.processed)}`);
            console.log(`Updated: ${String(result.data.updated)}`);
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "stats": {
          console.log("Consolidated Score Statistics:\n");
          const stats = await service.getConsolidatedStats();
          console.log(`Total Contracts: ${String(stats.total)}`);
          console.log(
            `Average Score: ${stats.averageTotalScore.toFixed(2)}/200`
          );
          console.log(`With Anomalies: ${String(stats.withAnomalies)}`);
          console.log("\nBy Category:");
          console.log(`  LOW (0-50): ${String(stats.byCategory.LOW)}`);
          console.log(`  MEDIUM (51-100): ${String(stats.byCategory.MEDIUM)}`);
          console.log(`  HIGH (101-200): ${String(stats.byCategory.HIGH)}`);
          console.log("\nBy Criterion (contracts with score > 0):");
          console.log(`  Value: ${String(stats.byCriterion.value)}`);
          console.log(`  Amendment: ${String(stats.byCriterion.amendment)}`);
          console.log(
            `  Concentration: ${String(stats.byCriterion.concentration)}`
          );
          console.log(`  Duration: ${String(stats.byCriterion.duration)}`);
          console.log(`  Timing: ${String(stats.byCriterion.timing)}`);
          console.log(`  Round Number: ${String(stats.byCriterion.roundNumber)}`);
          console.log(`  Fragmentation: ${String(stats.byCriterion.fragmentation)}`);
          console.log(`  Description: ${String(stats.byCriterion.description)}`);
          break;
        }

        case "list": {
          const pageArg = process.argv[4];
          const page = pageArg ? parseInt(pageArg, 10) : 1;
          console.log(`Contracts by Score (Page ${String(page)}):\n`);
          const result = await service.getContractsByScore({
            page,
            pageSize: 20,
            orderBy: "score",
            order: "desc",
          });
          if (result.success) {
            const { contracts, total, totalPages } = result.data;
            console.log(
              `Total: ${String(total)} | Page ${String(page)}/${String(totalPages)}\n`
            );
            for (const contract of contracts) {
              const criteria =
                contract.contributingCriteria.length > 0
                  ? ` [${contract.contributingCriteria.join(", ")}]`
                  : "";
              console.log(
                `${contract.externalId}: ${String(contract.totalScore)}/100 (${contract.scoreCategory})${criteria}`
              );
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "high": {
          console.log("HIGH Risk Contracts:\n");
          const result = await service.getContractsByScore({
            category: "HIGH",
            orderBy: "score",
            order: "desc",
            pageSize: 50,
          });
          if (result.success) {
            const { contracts, total } = result.data;
            console.log(`Total HIGH risk: ${String(total)}\n`);
            for (const contract of contracts) {
              const criteria = contract.contributingCriteria.join(", ");
              console.log(
                `${contract.externalId}: ${String(contract.totalScore)}/100 [${criteria}]`
              );
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        default: {
          // Treat as contract ID for single lookup
          console.log(`Consolidated score for contract ${subCommand}:\n`);
          const result = await service.getConsolidatedScore(subCommand);
          if (result.success) {
            const { totalScore, category, breakdown, contributingCriteria } =
              result.data;
            console.log(`Total Score: ${String(totalScore)}/100`);
            console.log(`Category: ${category}`);
            console.log("\nBreakdown:");
            for (const item of breakdown) {
              const marker = item.isContributing ? "✓" : " ";
              console.log(
                `  [${marker}] ${item.criterion}: ${String(item.score)}/25`
              );
              if (item.reason) {
                console.log(`      ${item.reason}`);
              }
            }
            if (contributingCriteria.length > 0) {
              console.log(
                `\nContributing Criteria: ${contributingCriteria.join(", ")}`
              );
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    case "consolidate:save": {
      if (!arg1) {
        console.error("Error: Contract ID required");
        console.log("Usage: pnpm anomaly consolidate:save <contractId>");
        process.exit(1);
      }
      console.log(`Consolidating and saving score for ${arg1}...\n`);
      const result = await service.consolidateAndSave(arg1);
      if (result.success) {
        console.log(`Total Score: ${String(result.data.totalScore)}/100`);
        console.log(`Category: ${result.data.category}`);
        console.log(
          `Contributing: ${result.data.contributingCriteria.join(", ") || "none"}`
        );
      } else {
        console.error("Error:", result.error.message);
        process.exit(1);
      }
      break;
    }

    // Round Number score commands
    case "roundnumber": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for round number score...\n");
          const result = await service.processAllRoundNumbers();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log("Processing batch of contracts for round number score...\n");
          const result = await service.processRoundNumberBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting round number scores...\n");
          const count = await service.resetRoundNumberScores();
          console.log(`Reset round number scores for ${String(count)} contracts`);
          break;
        }

        default: {
          console.log(`Calculating round number score for contract ${subCommand}...\n`);
          const result = await service.calculateRoundNumberScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Value: R$ ${result.data.stats.value.toLocaleString("pt-BR")}`);
              console.log(`  Multiple of 100k: ${String(result.data.stats.isMultipleOf100k)}`);
              console.log(`  Multiple of 10k: ${String(result.data.stats.isMultipleOf10k)}`);
              console.log(`  Multiple of 1k: ${String(result.data.stats.isMultipleOf1k)}`);
              console.log(`  Has No Cents: ${String(result.data.stats.hasNoCents)}`);
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    // Timing score commands
    case "timing": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for timing score...\n");
          const result = await service.processAllTimings();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log("Processing batch of contracts for timing score...\n");
          const result = await service.processTimingBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting timing scores...\n");
          const count = await service.resetTimingScores();
          console.log(`Reset timing scores for ${String(count)} contracts`);
          break;
        }

        default: {
          console.log(`Calculating timing score for contract ${subCommand}...\n`);
          const result = await service.calculateTimingScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Signature Date: ${result.data.stats.signatureDate?.toISOString() ?? "N/A"}`);
              console.log(`  Publication Date: ${result.data.stats.publicationDate?.toISOString() ?? "N/A"}`);
              console.log(`  Is December: ${String(result.data.stats.isDecember)}`);
              console.log(`  Last Week of December: ${String(result.data.stats.isLastWeekOfDecember)}`);
              console.log(`  Is Weekend: ${String(result.data.stats.isWeekend)}`);
              console.log(`  Days from Pub to Sig: ${result.data.stats.daysFromPublicationToSignature ?? "N/A"}`);
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    // Fragmentation score commands
    case "fragmentation": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for fragmentation score...\n");
          const result = await service.processAllFragmentations();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log("Processing batch of contracts for fragmentation score...\n");
          const result = await service.processFragmentationBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting fragmentation scores...\n");
          const count = await service.resetFragmentationScores();
          console.log(`Reset fragmentation scores for ${String(count)} contracts`);
          break;
        }

        default: {
          console.log(`Calculating fragmentation score for contract ${subCommand}...\n`);
          const result = await service.calculateFragmentationScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Contracts in 30 days: ${String(result.data.stats.contractsIn30Days)}`);
              console.log(`  Near Dispensa Limit: ${String(result.data.stats.isNearDispensaLimit)}`);
              console.log(`  Similar Contracts: ${String(result.data.stats.similarContracts)}`);
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    // Description score commands
    case "description": {
      const subCommand = arg1 ?? "all";

      switch (subCommand) {
        case "all": {
          console.log("Processing all contracts for description score...\n");
          const result = await service.processAllDescriptions();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "batch": {
          console.log("Processing batch of contracts for description score...\n");
          const result = await service.processDescriptionBatch();
          if (!result.success) {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
          break;
        }

        case "reset": {
          console.log("Resetting description scores...\n");
          const count = await service.resetDescriptionScores();
          console.log(`Reset description scores for ${String(count)} contracts`);
          break;
        }

        default: {
          console.log(`Calculating description score for contract ${subCommand}...\n`);
          const result = await service.calculateDescriptionScore(subCommand);
          if (result.success) {
            console.log(`Score: ${String(result.data.score)}/25`);
            console.log(`Is Anomaly: ${String(result.data.isAnomaly)}`);
            console.log(`Reason: ${result.data.reason}`);
            if (result.data.stats) {
              console.log("\nStatistics:");
              console.log(`  Object Length: ${String(result.data.stats.objectLength)} chars`);
              console.log(`  Is Too Generic: ${String(result.data.stats.isTooGeneric)}`);
              console.log(`  Has Specific Brand: ${String(result.data.stats.hasSpecificBrand)}`);
              console.log(`  Has Vague Terms: ${String(result.data.stats.hasVagueTerms)}`);
              console.log(`  Is Overly Specific: ${String(result.data.stats.isOverlySpecific)}`);
            }
          } else {
            console.error("Error:", result.error.message);
            process.exit(1);
          }
        }
      }
      break;
    }

    default:
      console.log("Anomaly Score Commands:");
      console.log("\nValue Score (US-010):");
      console.log(
        "  all              - Process all pending contracts for value score"
      );
      console.log(
        "  batch            - Process a batch of contracts for value score"
      );
      console.log("  stats            - Show anomaly score statistics");
      console.log(
        "  reset            - Reset value scores (or 'reset all' for all scores)"
      );
      console.log(
        "  recalculate <id> - Recalculate and save value score for a contract"
      );
      console.log(
        "  single <id>      - Calculate value score for a contract (no save)"
      );
      console.log("\nAmendment Score (US-011):");
      console.log(
        "  amendment all    - Process all contracts for amendment score"
      );
      console.log("  amendment batch  - Process a batch for amendment score");
      console.log("  amendment reset  - Reset amendment scores");
      console.log(
        "  amendment <id>   - Calculate amendment score for a contract (no save)"
      );
      console.log(
        "  amendment:recalculate <id> - Recalculate and save amendment score"
      );
      console.log("\nConcentration Score (US-012):");
      console.log(
        "  concentration all    - Process all contracts for concentration score"
      );
      console.log(
        "  concentration batch  - Process a batch for concentration score"
      );
      console.log("  concentration reset  - Reset concentration scores");
      console.log(
        "  concentration <id>   - Calculate concentration score (no save)"
      );
      console.log(
        "  concentration:recalculate <id> - Recalculate and save concentration score"
      );
      console.log("\nDuration Score (US-013):");
      console.log(
        "  duration all         - Process all contracts for duration score"
      );
      console.log(
        "  duration batch       - Process a batch for duration score"
      );
      console.log("  duration reset       - Reset duration scores");
      console.log(
        "  duration <id>        - Calculate duration score (no save)"
      );
      console.log(
        "  duration:recalculate <id> - Recalculate and save duration score"
      );
      console.log("\nRound Number Score:");
      console.log(
        "  roundnumber all      - Process all contracts for round number score"
      );
      console.log(
        "  roundnumber batch    - Process a batch for round number score"
      );
      console.log("  roundnumber reset    - Reset round number scores");
      console.log(
        "  roundnumber <id>     - Calculate round number score (no save)"
      );
      console.log("\nTiming Score:");
      console.log(
        "  timing all           - Process all contracts for timing score"
      );
      console.log(
        "  timing batch         - Process a batch for timing score"
      );
      console.log("  timing reset         - Reset timing scores");
      console.log(
        "  timing <id>          - Calculate timing score (no save)"
      );
      console.log("\nFragmentation Score:");
      console.log(
        "  fragmentation all    - Process all contracts for fragmentation score"
      );
      console.log(
        "  fragmentation batch  - Process a batch for fragmentation score"
      );
      console.log("  fragmentation reset  - Reset fragmentation scores");
      console.log(
        "  fragmentation <id>   - Calculate fragmentation score (no save)"
      );
      console.log("\nDescription Score:");
      console.log(
        "  description all      - Process all contracts for description score"
      );
      console.log(
        "  description batch    - Process a batch for description score"
      );
      console.log("  description reset    - Reset description scores");
      console.log(
        "  description <id>     - Calculate description score (no save)"
      );
      console.log("\nConsolidated Score (US-014):");
      console.log(
        "  consolidate all      - Recalculate all totalScore and category"
      );
      console.log("  consolidate stats    - Show consolidated statistics");
      console.log(
        "  consolidate list [page] - List contracts by score (paginated)"
      );
      console.log("  consolidate high     - List HIGH risk contracts");
      console.log(
        "  consolidate <id>     - Show consolidated score for a contract"
      );
      console.log(
        "  consolidate:save <id> - Consolidate and save score for a contract"
      );
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
