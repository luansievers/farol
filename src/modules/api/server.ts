/**
 * API Server
 *
 * Main entry point for the REST API
 */

import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { contractsRouter } from "./contracts/index.js";
import "dotenv/config";

// Create app with OpenAPI support
const app = new OpenAPIHono();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount contracts router
app.route("/api/contracts", contractsRouter);

// OpenAPI documentation endpoint
app.doc("/api/docs/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Farol - Radar de Contratos API",
    version: "1.0.0",
    description:
      "API for accessing public contract data with AI-generated summaries and anomaly scores",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
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
