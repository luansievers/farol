/**
 * API Server
 *
 * Main entry point for the REST API
 */

import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { contractsRouter } from "./contracts/index.js";
import { suppliersRouter } from "./suppliers/index.js";
import { agenciesRouter } from "./agencies/index.js";
import { searchRouter } from "./search/index.js";
import "dotenv/config";

// Create app with OpenAPI support
const app = new OpenAPIHono();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount API routers
app.route("/api/contracts", contractsRouter);
app.route("/api/suppliers", suppliersRouter);
app.route("/api/agencies", agenciesRouter);
app.route("/api/search", searchRouter);

// OpenAPI documentation endpoint
app.doc("/api/docs/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Farol - Radar de Contratos API",
    version: "1.0.0",
    description: `
## Overview

Farol API provides access to Brazilian public contract data with AI-powered analysis including automated summaries and anomaly detection scores.

## Features

- **Contracts**: Browse and search public contracts with filtering, pagination, and sorting
- **Suppliers**: View supplier profiles with aggregated metrics and contract history
- **Agencies**: Explore government agencies and their contracting patterns
- **Search**: Global search across contracts, suppliers, and agencies
- **AI Analysis**: AI-generated contract summaries and anomaly scores

## Authentication

Currently, the API is open and does not require authentication.

## Rate Limiting

No rate limiting is currently enforced.

## Pagination

All list endpoints support pagination with \`page\` and \`pageSize\` query parameters:
- \`page\`: Page number (1-indexed, default: 1)
- \`pageSize\`: Items per page (max: 100, default: 20)

## Sorting

List endpoints support sorting with \`sortBy\` and \`order\` parameters.

## Error Handling

Errors follow a consistent format:
\`\`\`json
{
  "code": "NOT_FOUND | INVALID_PARAMS | DATABASE_ERROR | INTERNAL_ERROR",
  "message": "Human-readable error description",
  "details": {} // Only in development mode
}
\`\`\`

## Anomaly Scores

Contracts are analyzed for potential anomalies across 4 criteria (0-25 points each):
- **value**: Unusual contract value compared to similar contracts
- **amendment**: Excessive amendments/modifications
- **concentration**: Supplier concentration risk
- **duration**: Unusual contract duration

Total score ranges from 0-100, categorized as LOW (0-33), MEDIUM (34-66), or HIGH (67-100).
    `.trim(),
    contact: {
      name: "Farol Team",
      url: "https://github.com/farol-radar",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Contracts",
      description: "Public contract data with AI summaries and anomaly scores",
    },
    {
      name: "Suppliers",
      description: "Supplier/contractor profiles and metrics",
    },
    {
      name: "Agencies",
      description: "Government agency profiles and metrics",
    },
    {
      name: "Search",
      description: "Global search across all entities",
    },
  ],
});

// Swagger UI endpoint
app.get("/api/docs", swaggerUI({ url: "/api/docs/openapi.json" }));

// Error handler
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json(
    {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      code: "NOT_FOUND",
      message: `Route ${c.req.path} not found`,
    },
    404
  );
});

// Export app for testing
export { app };

// Start server
const port = parseInt(process.env.API_PORT ?? "3000", 10);

console.log(`Starting Farol API server on port ${String(port)}...`);
console.log(
  `Swagger UI available at http://localhost:${String(port)}/api/docs`
);

serve({
  fetch: app.fetch,
  port,
});
