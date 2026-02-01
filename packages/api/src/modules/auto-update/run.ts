/**
 * CLI script to run the auto-update job
 *
 * Usage:
 *   pnpm tsx src/modules/auto-update/run.ts [command]
 *
 * Commands:
 *   run       - Run the auto-update job once (default)
 *   start     - Start the scheduler (runs daily at configured time)
 *   stats     - Show current stats
 *
 * Examples:
 *   pnpm tsx src/modules/auto-update/run.ts         # Run once
 *   pnpm tsx src/modules/auto-update/run.ts run     # Run once
 *   pnpm tsx src/modules/auto-update/run.ts start   # Start scheduler
 *   pnpm tsx src/modules/auto-update/run.ts stats   # Show stats
 */

import "dotenv/config";
import { createAutoUpdateService } from "./service.js";
import { createScheduler } from "./scheduler.js";

const COMMANDS = ["run", "start", "stats"] as const;
type Command = (typeof COMMANDS)[number];

function printUsage(): void {
  console.log(`
Usage: pnpm tsx src/modules/auto-update/run.ts [command]

Commands:
  run       Run the auto-update job once (default)
  start     Start the scheduler daemon (runs daily at configured time)
  stats     Show current stats and last execution info

Options:
  --immediate   With 'start' command, run immediately before scheduling

Examples:
  pnpm auto-update              # Run once
  pnpm auto-update run          # Run once
  pnpm auto-update start        # Start scheduler (3 AM daily)
  pnpm auto-update stats        # Show stats
  `);
}

async function runOnce(): Promise<void> {
  console.log("\n=== Farol Auto-Update Job ===\n");

  const service = createAutoUpdateService();
  const result = await service.runWithRetry();

  if (!result.success) {
    console.error(`\nJob failed: ${result.error.message}`);
    process.exit(1);
  }

  const { data: log } = result;
  const exitCode = log.status === "success" ? 0 : 1;

  console.log(`\nFinal status: ${log.status}`);
  process.exit(exitCode);
}

async function startScheduler(runImmediately: boolean): Promise<void> {
  console.log("\n=== Farol Auto-Update Scheduler ===\n");

  const scheduler = createScheduler({
    runImmediately,
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("\nReceived shutdown signal...");
    scheduler.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await scheduler.start();

  console.log("\nScheduler is running. Press Ctrl+C to stop.\n");

  // Keep the process alive
  await new Promise(() => {
    // Never resolves - keeps process running
  });
}

async function showStats(): Promise<void> {
  console.log("\n=== Farol Auto-Update Stats ===\n");

  const service = createAutoUpdateService();
  const stats = await service.getStats();

  console.log(`Configuration:`);
  console.log(`  Cron expression: ${service.config.cronExpression}`);
  console.log(`  Lookback days: ${String(service.config.lookbackDays)}`);
  console.log(`  Alerting enabled: ${String(service.config.alertingEnabled)}`);
  console.log(`  Max retries: ${String(service.config.maxRetries)}`);

  console.log(`\nDatabase Stats:`);
  console.log(`  Total contracts: ${String(stats.totalContracts)}`);
  console.log(`  Contracts with scores: ${String(stats.contractsWithScores)}`);
  console.log(
    `  Contracts pending scores: ${String(stats.contractsPendingScores)}`
  );

  console.log(`\nLast Execution:`);
  if (stats.lastFetchedAt) {
    console.log(`  Last fetch: ${stats.lastFetchedAt.toISOString()}`);
    const hoursSince = Math.round(
      (Date.now() - stats.lastFetchedAt.getTime()) / (1000 * 60 * 60)
    );
    console.log(`  Hours since: ${String(hoursSince)}`);
  } else {
    console.log(`  No previous execution found`);
  }

  console.log("");
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = (args[0] ?? "run") as Command;
  const runImmediately = args.includes("--immediate");

  if (!COMMANDS.includes(command)) {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case "run":
      await runOnce();
      break;
    case "start":
      await startScheduler(runImmediately);
      break;
    case "stats":
      await showStats();
      break;
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
