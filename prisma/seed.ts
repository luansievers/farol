import { PrismaClient, Prisma } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create agencies (government departments)
  const agencies = await Promise.all([
    prisma.agency.upsert({
      where: { code: "SME" },
      update: {},
      create: {
        code: "SME",
        name: "Secretaria Municipal de Educação",
        acronym: "SME",
      },
    }),
    prisma.agency.upsert({
      where: { code: "SMS" },
      update: {},
      create: {
        code: "SMS",
        name: "Secretaria Municipal de Saúde",
        acronym: "SMS",
      },
    }),
    prisma.agency.upsert({
      where: { code: "SIURB" },
      update: {},
      create: {
        code: "SIURB",
        name: "Secretaria Municipal de Infraestrutura Urbana e Obras",
        acronym: "SIURB",
      },
    }),
    prisma.agency.upsert({
      where: { code: "SMIT" },
      update: {},
      create: {
        code: "SMIT",
        name: "Secretaria Municipal de Inovação e Tecnologia",
        acronym: "SMIT",
      },
    }),
  ]);

  console.log(`Created ${agencies.length} agencies`);

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { cnpj: "12345678000190" },
      update: {},
      create: {
        cnpj: "12345678000190",
        tradeName: "Tech Solutions SP",
        legalName: "Tech Solutions Tecnologia Ltda",
      },
    }),
    prisma.supplier.upsert({
      where: { cnpj: "98765432000111" },
      update: {},
      create: {
        cnpj: "98765432000111",
        tradeName: "Construtora ABC",
        legalName: "ABC Engenharia e Construções S.A.",
      },
    }),
    prisma.supplier.upsert({
      where: { cnpj: "11223344000155" },
      update: {},
      create: {
        cnpj: "11223344000155",
        tradeName: "MedSupply",
        legalName: "MedSupply Distribuidora de Medicamentos Ltda",
      },
    }),
    prisma.supplier.upsert({
      where: { cnpj: "55667788000122" },
      update: {},
      create: {
        cnpj: "55667788000122",
        tradeName: "EduMateriais",
        legalName: "Educação e Materiais Didáticos Ltda",
      },
    }),
  ]);

  console.log(`Created ${suppliers.length} suppliers`);

  // Create sample contracts
  const contracts = await Promise.all([
    // IT contract - normal
    prisma.contract.upsert({
      where: { externalId: "CT-2025-001" },
      update: {},
      create: {
        externalId: "CT-2025-001",
        number: "001/2025",
        object:
          "Contratação de serviços de manutenção e suporte de sistemas de informação",
        value: new Prisma.Decimal(450000.0),
        category: "TI",
        modalidade: "Pregão Eletrônico",
        status: "ACTIVE",
        processingStatus: "COMPLETED",
        signatureDate: new Date("2025-01-15"),
        startDate: new Date("2025-02-01"),
        endDate: new Date("2026-01-31"),
        publicationDate: new Date("2025-01-16"),
        agencyId: agencies[3]!.id, // SMIT
        supplierId: suppliers[0]!.id, // Tech Solutions
        summary:
          "Contrato para manutenção de sistemas da prefeitura. Inclui suporte técnico, correção de bugs e pequenas melhorias. Valor mensal de R$ 37.500,00 durante 12 meses.",
        summaryGeneratedAt: new Date(),
      },
    }),
    // Construction contract - high value (potential anomaly)
    prisma.contract.upsert({
      where: { externalId: "CT-2025-002" },
      update: {},
      create: {
        externalId: "CT-2025-002",
        number: "002/2025",
        object: "Reforma e ampliação de unidade básica de saúde na zona leste",
        value: new Prisma.Decimal(2850000.0),
        category: "OBRAS",
        modalidade: "Concorrência",
        status: "ACTIVE",
        processingStatus: "COMPLETED",
        signatureDate: new Date("2025-01-20"),
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-12-31"),
        publicationDate: new Date("2025-01-22"),
        agencyId: agencies[1]!.id, // SMS
        supplierId: suppliers[1]!.id, // Construtora ABC
        summary:
          "Obra de reforma completa da UBS Vila Nova. Inclui ampliação de 200m², reforma de instalações elétricas e hidráulicas, e adequação de acessibilidade. Prazo de 10 meses.",
        summaryGeneratedAt: new Date(),
      },
    }),
    // Healthcare supplies - normal
    prisma.contract.upsert({
      where: { externalId: "CT-2025-003" },
      update: {},
      create: {
        externalId: "CT-2025-003",
        number: "003/2025",
        object: "Aquisição de medicamentos e insumos hospitalares",
        value: new Prisma.Decimal(780000.0),
        category: "SAUDE",
        modalidade: "Pregão Eletrônico",
        status: "ACTIVE",
        processingStatus: "COMPLETED",
        signatureDate: new Date("2025-02-01"),
        startDate: new Date("2025-02-15"),
        endDate: new Date("2025-08-15"),
        publicationDate: new Date("2025-02-03"),
        agencyId: agencies[1]!.id, // SMS
        supplierId: suppliers[2]!.id, // MedSupply
        summary:
          "Fornecimento de medicamentos básicos para rede municipal de saúde. Lista inclui 150 itens diferentes, entrega parcelada em 6 meses.",
        summaryGeneratedAt: new Date(),
      },
    }),
    // Education materials - pending processing
    prisma.contract.upsert({
      where: { externalId: "CT-2025-004" },
      update: {},
      create: {
        externalId: "CT-2025-004",
        number: "004/2025",
        object: "Fornecimento de material didático para escolas municipais",
        value: new Prisma.Decimal(1200000.0),
        category: "EDUCACAO",
        modalidade: "Pregão Eletrônico",
        status: "ACTIVE",
        processingStatus: "PENDING",
        signatureDate: new Date("2025-02-10"),
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-12-20"),
        publicationDate: new Date("2025-02-12"),
        agencyId: agencies[0]!.id, // SME
        supplierId: suppliers[3]!.id, // EduMateriais
      },
    }),
    // IT contract with same supplier (concentration test)
    prisma.contract.upsert({
      where: { externalId: "CT-2025-005" },
      update: {},
      create: {
        externalId: "CT-2025-005",
        number: "005/2025",
        object: "Desenvolvimento de portal de transparência",
        value: new Prisma.Decimal(380000.0),
        category: "TI",
        modalidade: "Pregão Eletrônico",
        status: "ACTIVE",
        processingStatus: "COMPLETED",
        signatureDate: new Date("2025-02-20"),
        startDate: new Date("2025-03-15"),
        endDate: new Date("2025-09-15"),
        publicationDate: new Date("2025-02-22"),
        agencyId: agencies[3]!.id, // SMIT
        supplierId: suppliers[0]!.id, // Tech Solutions (same supplier)
        summary:
          "Novo portal de transparência com busca avançada de contratos e licitações. Inclui desenvolvimento, testes e implantação.",
        summaryGeneratedAt: new Date(),
      },
    }),
  ]);

  console.log(`Created ${contracts.length} contracts`);

  // Create amendments for the construction contract
  const amendments = await Promise.all([
    prisma.amendment.upsert({
      where: { externalId: "AD-2025-002-01" },
      update: {},
      create: {
        externalId: "AD-2025-002-01",
        number: 1,
        type: "PRAZO",
        description: "Prorrogação de prazo por 60 dias devido a atrasos na entrega de materiais",
        durationChange: 60,
        signatureDate: new Date("2025-06-15"),
        contractId: contracts[1]!.id, // Construction contract
      },
    }),
    prisma.amendment.upsert({
      where: { externalId: "AD-2025-002-02" },
      update: {},
      create: {
        externalId: "AD-2025-002-02",
        number: 2,
        type: "VALOR",
        description: "Acréscimo de 15% no valor devido a serviços adicionais",
        valueChange: new Prisma.Decimal(427500.0),
        signatureDate: new Date("2025-08-20"),
        contractId: contracts[1]!.id,
      },
    }),
  ]);

  console.log(`Created ${amendments.length} amendments`);

  // Create anomaly scores
  const anomalyScores = await Promise.all([
    // Low risk contract
    prisma.anomalyScore.upsert({
      where: { contractId: contracts[0]!.id },
      update: {},
      create: {
        totalScore: 15,
        category: "LOW",
        valueScore: 5,
        valueReason: "Valor dentro da média para contratos de TI",
        amendmentScore: 0,
        amendmentReason: "Sem aditivos",
        concentrationScore: 10,
        concentrationReason: "Fornecedor tem 40% dos contratos de TI da SMIT",
        durationScore: 0,
        durationReason: "Prazo padrão de 12 meses",
        contractId: contracts[0]!.id,
      },
    }),
    // High risk contract (construction with amendments)
    prisma.anomalyScore.upsert({
      where: { contractId: contracts[1]!.id },
      update: {},
      create: {
        totalScore: 68,
        category: "HIGH",
        valueScore: 20,
        valueReason: "Valor 35% acima da média de obras similares",
        amendmentScore: 23,
        amendmentReason: "2 aditivos com acréscimo de 15% no valor total",
        concentrationScore: 10,
        concentrationReason: "Fornecedor tem 25% das obras da SMS",
        durationScore: 15,
        durationReason: "Prazo original de 10 meses, estendido para 12 meses",
        contractId: contracts[1]!.id,
      },
    }),
    // Medium risk contract
    prisma.anomalyScore.upsert({
      where: { contractId: contracts[2]!.id },
      update: {},
      create: {
        totalScore: 35,
        category: "MEDIUM",
        valueScore: 15,
        valueReason: "Valor 12% acima da média para medicamentos",
        amendmentScore: 0,
        amendmentReason: "Sem aditivos",
        concentrationScore: 15,
        concentrationReason: "Fornecedor tem 35% dos contratos de saúde da SMS",
        durationScore: 5,
        durationReason: "Prazo de 6 meses, ligeiramente abaixo da média",
        contractId: contracts[2]!.id,
      },
    }),
  ]);

  console.log(`Created ${anomalyScores.length} anomaly scores`);

  console.log("Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
