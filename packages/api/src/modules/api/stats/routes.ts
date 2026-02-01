/**
 * Stats API Routes with OpenAPI Documentation
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDashboardStats } from "./service.js";

export const statsRouter = new OpenAPIHono();

// Schema for dashboard stats response
const DashboardStatsSchema = z
  .object({
    totalContracts: z.number().int().nonnegative().openapi({
      description: "Total number of contracts in the system",
      example: 1500,
    }),
    contractsWithAnomalies: z.number().int().nonnegative().openapi({
      description: "Number of contracts with HIGH anomaly score",
      example: 45,
    }),
    totalSuppliers: z.number().int().nonnegative().openapi({
      description: "Total number of suppliers",
      example: 320,
    }),
    totalAgencies: z.number().int().nonnegative().openapi({
      description: "Total number of government agencies",
      example: 25,
    }),
  })
  .openapi({ description: "Dashboard statistics summary" });

// Error response schema
const ErrorResponseSchema = z
  .object({
    code: z.enum(["DATABASE_ERROR", "INTERNAL_ERROR"]).openapi({
      description: "Error code for programmatic handling",
      example: "INTERNAL_ERROR",
    }),
    message: z.string().openapi({
      description: "Human-readable error message",
      example: "An error occurred while fetching statistics",
    }),
  })
  .openapi({ description: "Standard error response" });

// Route: GET /api/stats
const getStatsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Stats"],
  summary: "Get dashboard statistics",
  description:
    "Returns aggregated statistics for the dashboard including total counts and anomaly metrics",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: DashboardStatsSchema,
        },
      },
      description: "Successful response with dashboard statistics",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

statsRouter.openapi(getStatsRoute, async (c) => {
  try {
    const stats = await getDashboardStats();
    return c.json(stats, 200);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return c.json(
      {
        code: "INTERNAL_ERROR" as const,
        message: "An error occurred while fetching statistics",
      },
      500
    );
  }
});
