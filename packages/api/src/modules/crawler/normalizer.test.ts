/**
 * Tests for the PNCP normalizer
 */

import { describe, expect, it } from "vitest";
import { normalizeContract, normalizeContracts } from "./normalizer.js";
import type { PncpContractResponse } from "./types/index.js";

const mockContract: PncpContractResponse = {
  numeroControlePNCP: "12345678901234-1-000001/2024",
  numeroControlePncpCompra: "12345678901234-1-000001/2024-000001",
  numeroContratoEmpenho: "TC-2024/00001",
  dataAssinatura: "2024-01-15T00:00:00",
  dataVigenciaInicio: "2024-01-16T00:00:00",
  dataVigenciaFim: "2024-12-31T00:00:00",
  dataAtualizacao: "2024-01-15T10:30:00",
  dataPublicacaoPncp: "2024-01-15T08:00:00",
  orgaoEntidade: {
    cnpj: "12.345.678/0001-34",
    razaoSocial: "Prefeitura Municipal de São Paulo",
    poderId: "E",
    esferaId: "M",
  },
  unidadeOrgao: {
    ufSigla: "SP",
    municipioNome: "São Paulo",
    codigoIBGE: "3550308",
    ufNome: "São Paulo",
    codigoUnidade: "123456",
    nomeUnidade: "Secretaria de Educação",
  },
  niFornecedor: "98.765.432/0001-10",
  nomeRazaoSocialFornecedor: "Empresa ABC Ltda",
  codigoPaisFornecedor: "BRA",
  categoriaProcesso: "Serviços",
  tipoContrato: "Pregão Eletrônico",
  objetoContrato: "Contratação de serviços de limpeza",
  processo: "2024.0.000.001-0",
  valorInicial: 100000.0,
  valorParcela: 10000.0,
  valorGlobal: 120000.0,
  valorAcumulado: 120000.0,
  numeroParcelas: 12,
  receita: false,
  numeroRetificacao: 0,
  usuarioNome: "Sistema",
};

describe("normalizeContract", () => {
  it("should normalize a contract correctly", () => {
    const result = normalizeContract(mockContract);

    expect(result.externalId).toBe("12345678901234-1-000001/2024");
    expect(result.number).toBe("TC-2024/00001");
    expect(result.object).toBe("Contratação de serviços de limpeza");
    expect(result.value).toBe(120000.0);
    expect(result.modalidade).toBe("Pregão Eletrônico");
  });

  it("should parse dates correctly", () => {
    const result = normalizeContract(mockContract);

    expect(result.signatureDate).toBeInstanceOf(Date);
    expect(result.signatureDate?.toISOString()).toContain("2024-01-15");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it("should normalize CNPJ by removing formatting", () => {
    const result = normalizeContract(mockContract);

    expect(result.agency.cnpj).toBe("12345678000134");
    expect(result.supplier.cnpj).toBe("98765432000110");
  });

  it("should extract agency information", () => {
    const result = normalizeContract(mockContract);

    expect(result.agency.code).toBe("123456");
    expect(result.agency.name).toBe("Secretaria de Educação");
  });

  it("should extract supplier information", () => {
    const result = normalizeContract(mockContract);

    expect(result.supplier.name).toBe("Empresa ABC Ltda");
  });

  it("should build contract link from control number", () => {
    const result = normalizeContract(mockContract);

    // URL format: /app/contratos/{cnpj}/{year}/{sequencial}
    expect(result.pdfUrl).toBe(
      "https://pncp.gov.br/app/contratos/12345678901234/2024/1"
    );
  });

  it("should handle null dates gracefully", () => {
    const contractWithNullDates: PncpContractResponse = {
      ...mockContract,
      dataAssinatura: "",
      dataVigenciaInicio: "",
      dataVigenciaFim: "",
    };

    const result = normalizeContract(contractWithNullDates);

    expect(result.signatureDate).toBeNull();
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it("should use valorGlobal over other value fields", () => {
    const result = normalizeContract(mockContract);
    expect(result.value).toBe(120000.0);
  });

  it("should fallback to other values when valorGlobal is missing", () => {
    const contractWithoutGlobal: PncpContractResponse = {
      ...mockContract,
      valorGlobal: 0,
      valorAcumulado: 50000,
    };

    const result = normalizeContract(contractWithoutGlobal);
    expect(result.value).toBe(50000);
  });

  it("should preserve raw data", () => {
    const result = normalizeContract(mockContract);
    expect(result.rawData).toBe(mockContract);
  });
});

describe("normalizeContracts", () => {
  it("should normalize an array of contracts", () => {
    const contracts = [
      mockContract,
      { ...mockContract, numeroControlePNCP: "different-id" },
    ];
    const results = normalizeContracts(contracts);

    expect(results).toHaveLength(2);
    expect(results[0]?.externalId).toBe("12345678901234-1-000001/2024");
    expect(results[1]?.externalId).toBe("different-id");
  });

  it("should return empty array for empty input", () => {
    const results = normalizeContracts([]);
    expect(results).toEqual([]);
  });
});
