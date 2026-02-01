/**
 * Application configuration
 */

export const config = {
  env: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;
