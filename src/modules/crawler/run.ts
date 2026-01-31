/**
 * CLI script to run the crawler
 *
 * Usage:
 *   pnpm tsx src/modules/crawler/run.ts [days]
 *
 * Arguments:
 *   days - Number of days to crawl (default: 7)
 *
 * Examples:
 *   pnpm tsx src/modules/crawler/run.ts        # Last 7 days
 *   pnpm tsx src/modules/crawler/run.ts 30     # Last 30 days
 */

import "dotenv/config";
import { createCrawlerService } from "./service.js";

async function main() {
  const days = parseInt(process.argv[2] ?? "7", 10);

  if (isNaN(days) || days <= 0) {
    console.error("Invalid number of days. Please provide a positive number.");
    process.exit(1);
  }

  console.log(`\n=== Farol Crawler ===`);
  console.log(`Crawling contracts from the last ${String(days)} days\n`);

  const crawler = createCrawlerService({
    rateLimitMs: 1000, // 1 request per second
    pageSize: 500,
    maxRetries: 3,
    timeout: 30000,
  });

  const result = await crawler.crawlLastDays(days);

  if (!result.success) {
    console.error(`\nCrawler failed: ${result.error.message}`);
    process.exit(1);
  }

  const { data: stats } = result;
  const duration = stats.finishedAt
    ? Math.round(
        (stats.finishedAt.getTime() - stats.startedAt.getTime()) / 1000
      )
    : 0;

  console.log(`\n=== Crawler Summary ===`);
  console.log(`Duration: ${String(duration)}s`);
  console.log(`Pages processed: ${String(stats.pages)}`);
  console.log(`Total contracts found: ${String(stats.totalFound)}`);
  console.log(`New contracts saved: ${String(stats.newContracts)}`);
  console.log(`Contracts updated: ${String(stats.updatedContracts)}`);
  console.log(`Errors: ${String(stats.errors)}`);

  if (stats.lastError) {
    console.log(`Last error: ${stats.lastError}`);
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
