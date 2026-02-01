/**
 * Tests for the PNCP client
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPncpClient } from "./client.js";

describe("createPncpClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("configuration", () => {
    it("should use default config when none provided", () => {
      const client = createPncpClient();

      expect(client.config.baseUrl).toBe("https://pncp.gov.br/api/consulta/v1");
      expect(client.config.rateLimitMs).toBe(1000);
      expect(client.config.maxRetries).toBe(3);
      expect(client.config.pageSize).toBe(500);
      expect(client.config.timeout).toBe(30000);
    });

    it("should merge custom config with defaults", () => {
      const client = createPncpClient({
        rateLimitMs: 2000,
        pageSize: 100,
      });

      expect(client.config.rateLimitMs).toBe(2000);
      expect(client.config.pageSize).toBe(100);
      expect(client.config.baseUrl).toBe("https://pncp.gov.br/api/consulta/v1");
    });
  });

  describe("fetchContracts", () => {
    it("should build correct URL with search params", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = createPncpClient({ rateLimitMs: 0 });
      await client.fetchContracts({
        dataInicial: "20240101",
        dataFinal: "20240115",
        codigoMunicipio: "3550308",
        pagina: 1,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("dataInicial=20240101"),
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("dataFinal=20240115"),
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("codigoMunicipio=3550308"),
        expect.any(Object)
      );
    });

    it("should return success with data on 200 response", async () => {
      const mockData = [{ numeroControlePNCP: "test-123" }];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        })
      );

      const client = createPncpClient({ rateLimitMs: 0 });
      const result = await client.fetchContracts({
        dataInicial: "20240101",
        dataFinal: "20240115",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual(mockData);
      }
    });

    it("should handle API returning wrapped data object", async () => {
      const mockData = { data: [{ numeroControlePNCP: "test-456" }] };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        })
      );

      const client = createPncpClient({ rateLimitMs: 0 });
      const result = await client.fetchContracts({
        dataInicial: "20240101",
        dataFinal: "20240115",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual(mockData.data);
      }
    });

    it("should return error on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        })
      );

      const client = createPncpClient({ rateLimitMs: 0, maxRetries: 1 });
      const result = await client.fetchContracts({
        dataInicial: "20240101",
        dataFinal: "20240115",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("API_ERROR");
        expect(result.error.message).toContain("500");
      }
    });

    it("should return network error on fetch failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      const client = createPncpClient({ rateLimitMs: 0, maxRetries: 1 });
      const result = await client.fetchContracts({
        dataInicial: "20240101",
        dataFinal: "20240115",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NETWORK_ERROR");
      }
    });

    it("should include proper headers", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = createPncpClient({ rateLimitMs: 0 });
      await client.fetchContracts({
        dataInicial: "20240101",
        dataFinal: "20240115",
      });

      const [, options] = fetchMock.mock.calls[0] as [
        string,
        { headers: Record<string, string> },
      ];
      expect(options.headers.Accept).toBe("application/json");
      expect(options.headers["User-Agent"]).toBe("Farol-Radar-Contratos/1.0");
    });
  });
});
