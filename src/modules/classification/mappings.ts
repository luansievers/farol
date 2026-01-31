/**
 * Category mappings for contract classification
 * Based on Brazilian expense nature codes (natureza de despesa) and keywords
 */

import type { ContractCategory } from "@/generated/prisma/client.js";
import type { ExpenseNatureMapping } from "./types/index.js";

/**
 * Official expense nature codes (natureza de despesa) mapping
 * Format: X.X.XX.XX.XX (Categoria.Grupo.Modalidade.Elemento.Subelemento)
 *
 * Common categories:
 * 3 - Despesas Correntes
 * 4 - Despesas de Capital
 *
 * Common elements:
 * 30 - Material de Consumo
 * 33 - Passagens e Despesas com Locomoção
 * 35 - Serviços de Consultoria
 * 36 - Outros Serviços de Terceiros – Pessoa Física
 * 37 - Locação de Mão-de-Obra
 * 39 - Outros Serviços de Terceiros – Pessoa Jurídica
 * 40 - Serviços de Tecnologia da Informação e Comunicação
 * 51 - Obras e Instalações
 * 52 - Equipamentos e Material Permanente
 */
export const EXPENSE_NATURE_MAPPINGS: ExpenseNatureMapping[] = [
  // OBRAS - Construction and Infrastructure
  { code: "4.4.90.51", description: "Obras e Instalações", category: "OBRAS" },
  {
    code: "4.4.90.52",
    description: "Equipamentos e Material Permanente",
    category: "OBRAS",
  },
  {
    code: "4.5.90.51",
    description: "Obras e Instalações - Inversões Financeiras",
    category: "OBRAS",
  },

  // TI - Information Technology
  { code: "3.3.90.40", description: "Serviços de TIC - PJ", category: "TI" },
  {
    code: "4.4.90.40",
    description: "Serviços de TIC - Capital",
    category: "TI",
  },
  { code: "3.3.90.39.12", description: "Locação de Software", category: "TI" },
  {
    code: "4.4.90.39.12",
    description: "Aquisição de Software",
    category: "TI",
  },

  // SAUDE - Healthcare
  {
    code: "3.3.90.30.36",
    description: "Material Hospitalar",
    category: "SAUDE",
  },
  {
    code: "3.3.90.32",
    description: "Material de Distribuição Gratuita (Saúde)",
    category: "SAUDE",
  },
  {
    code: "3.3.90.39.50",
    description: "Serviços Médico-Hospitalares",
    category: "SAUDE",
  },
  {
    code: "3.3.90.39.99",
    description: "Outros Serviços (quando contexto saúde)",
    category: "SAUDE",
  },

  // EDUCACAO - Education
  {
    code: "3.3.90.30.16",
    description: "Material de Expediente Escolar",
    category: "EDUCACAO",
  },
  {
    code: "3.3.90.30.35",
    description: "Material Didático",
    category: "EDUCACAO",
  },
  {
    code: "3.3.90.39.48",
    description: "Serviços de Seleção e Treinamento",
    category: "EDUCACAO",
  },

  // SERVICOS - General Services
  {
    code: "3.3.90.35",
    description: "Serviços de Consultoria",
    category: "SERVICOS",
  },
  {
    code: "3.3.90.36",
    description: "Outros Serviços de Terceiros - PF",
    category: "SERVICOS",
  },
  {
    code: "3.3.90.37",
    description: "Locação de Mão-de-Obra",
    category: "SERVICOS",
  },
  {
    code: "3.3.90.39",
    description: "Outros Serviços de Terceiros - PJ",
    category: "SERVICOS",
  },
  {
    code: "3.3.90.33",
    description: "Passagens e Locomoção",
    category: "SERVICOS",
  },
  {
    code: "3.3.90.34",
    description: "Outras Despesas de Pessoal",
    category: "SERVICOS",
  },
];

/**
 * Keywords for each category
 * Used when official expense code is not available or doesn't match
 */
export const CATEGORY_KEYWORDS: Record<ContractCategory, string[]> = {
  OBRAS: [
    // Construction terms
    "obra",
    "obras",
    "construção",
    "construir",
    "edificação",
    "edificar",
    "reforma",
    "reformar",
    "ampliação",
    "ampliar",
    "restauração",
    "restaurar",
    "pavimentação",
    "pavimentar",
    "asfalto",
    "asfaltamento",
    "instalação",
    "instalações",
    "instalacao",
    "instalacoes",
    // Infrastructure
    "infraestrutura",
    "infra-estrutura",
    "saneamento",
    "drenagem",
    "ponte",
    "pontes",
    "viaduto",
    "viadutos",
    "passarela",
    "estrada",
    "estradas",
    "rodovia",
    "rodovias",
    "terraplanagem",
    "escavação",
    "fundação",
    "fundações",
    "alvenaria",
    "concreto",
    "estrutura metálica",
    // Engineering
    "engenharia civil",
    "engenharia de construção",
    "empreitada",
    "empreiteira",
    "construtora",
    "canteiro de obras",
    "projeto executivo",
  ],

  TI: [
    // Software
    "software",
    "sistema",
    "sistemas",
    "aplicativo",
    "aplicação",
    "app",
    "licença",
    "licenciamento",
    "subscription",
    "saas",
    "desenvolvimento",
    "programação",
    "código",
    "codigo",
    // Hardware
    "hardware",
    "equipamento de informática",
    "equipamentos de ti",
    "computador",
    "computadores",
    "servidor",
    "servidores",
    "notebook",
    "notebooks",
    "desktop",
    "desktops",
    "impressora",
    "impressoras",
    "scanner",
    "scanners",
    "storage",
    "armazenamento",
    "backup",
    // Network and infrastructure
    "rede",
    "redes",
    "network",
    "networking",
    "internet",
    "banda larga",
    "fibra óptica",
    "firewall",
    "segurança da informação",
    "cibersegurança",
    "data center",
    "datacenter",
    "cloud",
    "nuvem",
    // Services
    "suporte técnico",
    "help desk",
    "helpdesk",
    "manutenção de ti",
    "manutenção de sistemas",
    "consultoria em ti",
    "consultoria de tecnologia",
    "migração de dados",
    "integração de sistemas",
    // Terms
    "tecnologia da informação",
    "informática",
    "ti",
    "tic",
    "t.i.",
    "t.i.c.",
  ],

  SAUDE: [
    // Medical equipment and supplies
    "medicamento",
    "medicamentos",
    "remédio",
    "remedios",
    "material hospitalar",
    "materiais hospitalares",
    "equipamento médico",
    "equipamentos médicos",
    "equipamento hospitalar",
    "equipamentos hospitalares",
    "insumo",
    "insumos",
    "material de saúde",
    // Healthcare services
    "serviço médico",
    "serviços médicos",
    "serviço hospitalar",
    "serviços hospitalares",
    "atendimento médico",
    "consulta médica",
    "exame",
    "exames",
    "diagnóstico",
    "diagnósticos",
    "cirurgia",
    "cirurgias",
    "procedimento médico",
    "tratamento",
    "tratamentos",
    "terapia",
    "terapias",
    // Healthcare facilities
    "hospital",
    "hospitais",
    "clínica",
    "clínicas",
    "ubs",
    "upa",
    "unidade de saúde",
    "pronto socorro",
    "pronto-socorro",
    "ps",
    "ambulatório",
    "ambulatórios",
    // Healthcare professionals
    "médico",
    "médicos",
    "enfermeiro",
    "enfermeiros",
    "profissional de saúde",
    "profissionais de saúde",
    // Specific areas
    "saúde",
    "saude",
    "sanitário",
    "sanitario",
    "ambulância",
    "ambulancias",
    "samu",
    "vacinação",
    "vacina",
    "vacinas",
    "imunização",
    "farmácia",
    "farmacia",
    "farmacêutico",
  ],

  EDUCACAO: [
    // Educational services
    "educação",
    "educacao",
    "ensino",
    "aprendizagem",
    "capacitação",
    "capacitacao",
    "treinamento",
    "formação",
    "curso",
    "cursos",
    "oficina",
    "oficinas",
    "workshop",
    "palestra",
    "palestras",
    "seminário",
    "seminarios",
    // Educational materials
    "material didático",
    "material escolar",
    "livro",
    "livros",
    "apostila",
    "apostilas",
    "material pedagógico",
    "kit escolar",
    // Educational institutions
    "escola",
    "escolas",
    "creche",
    "creches",
    "universidade",
    "faculdade",
    "instituição de ensino",
    "centro educacional",
    "núcleo educacional",
    // Educational activities
    "alfabetização",
    "letramento",
    "educação infantil",
    "ensino fundamental",
    "ensino médio",
    "educação especial",
    "educação inclusiva",
    "merenda",
    "merenda escolar",
    "alimentação escolar",
    "transporte escolar",
    "transporte de alunos",
    // Educational professionals
    "professor",
    "professores",
    "docente",
    "docentes",
    "pedagogo",
    "pedagogos",
    "educador",
    "educadores",
  ],

  SERVICOS: [
    // General services
    "serviço",
    "serviços",
    "servico",
    "servicos",
    "prestação de serviço",
    "prestação de serviços",
    // Maintenance
    "manutenção",
    "manutencao",
    "conservação",
    "conservacao",
    "limpeza",
    "higienização",
    "zeladoria",
    "vigilância",
    "vigilancia",
    "segurança patrimonial",
    // Professional services
    "consultoria",
    "assessoria",
    "auditoria",
    "advocacia",
    "jurídico",
    "juridico",
    "contabilidade",
    "contábil",
    "contabil",
    "engenharia",
    "arquitetura",
    "projeto",
    // Support services
    "locação",
    "locacao",
    "aluguel",
    "transporte",
    "logística",
    "logistica",
    "alimentação",
    "alimentacao",
    "refeição",
    "refeicao",
    "catering",
    "coffee break",
    "buffet",
    // Communication
    "comunicação",
    "comunicacao",
    "publicidade",
    "propaganda",
    "marketing",
    "mídia",
    "midia",
    "imprensa",
    "evento",
    "eventos",
    "cerimonial",
    // Administrative
    "administrativo",
    "apoio administrativo",
    "recepção",
    "atendimento",
    "call center",
    "recursos humanos",
    "rh",
    "gestão de pessoas",
  ],

  OUTROS: [
    // Empty - this is the fallback category
  ],
};

/**
 * Negative keywords that indicate a category should NOT be assigned
 * even if positive keywords match
 */
export const NEGATIVE_KEYWORDS: Partial<Record<ContractCategory, string[]>> = {
  OBRAS: [
    "manutenção de equipamentos",
    "manutenção predial",
    "serviços de limpeza",
    "vigilância",
  ],
  TI: [
    "equipamento hospitalar",
    "equipamento médico",
    "sistema de saúde",
    "sistema educacional",
  ],
};

/**
 * Get category from expense nature code
 */
export function getCategoryFromExpenseCode(
  code: string | null | undefined
): ContractCategory | null {
  if (!code) return null;

  // Normalize code (remove dots and extra spaces)
  const normalizedCode = code.trim().replace(/\s+/g, "");

  // Try exact match first
  const exactMatch = EXPENSE_NATURE_MAPPINGS.find(
    (m) => m.code.replace(/\./g, "") === normalizedCode.replace(/\./g, "")
  );
  if (exactMatch) return exactMatch.category;

  // Try prefix match (more specific codes)
  const prefixMatch = EXPENSE_NATURE_MAPPINGS.find((m) =>
    normalizedCode.replace(/\./g, "").startsWith(m.code.replace(/\./g, ""))
  );
  if (prefixMatch) return prefixMatch.category;

  return null;
}

/**
 * Get category from text using keyword matching
 */
export function getCategoryFromKeywords(text: string): {
  category: ContractCategory;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
} | null {
  if (!text || text.trim().length === 0) return null;

  const normalizedText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results: {
    category: ContractCategory;
    matches: string[];
    score: number;
  }[] = [];

  // Check each category
  const categories: ContractCategory[] = [
    "OBRAS",
    "TI",
    "SAUDE",
    "EDUCACAO",
    "SERVICOS",
  ];

  for (const category of categories) {
    const keywords = CATEGORY_KEYWORDS[category];
    const negativeKws = NEGATIVE_KEYWORDS[category] ?? [];

    // Check negative keywords first
    const hasNegative = negativeKws.some((kw) => {
      const normalizedKw = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return normalizedText.includes(normalizedKw);
    });

    if (hasNegative) continue;

    // Count positive matches
    const matches: string[] = [];
    for (const keyword of keywords) {
      const normalizedKw = keyword
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (normalizedText.includes(normalizedKw)) {
        matches.push(keyword);
      }
    }

    if (matches.length > 0) {
      // Calculate score based on:
      // - Number of matches
      // - Length of matched keywords (longer = more specific)
      const score =
        matches.reduce((sum, kw) => sum + kw.length, 0) * matches.length;
      results.push({ category, matches, score });
    }
  }

  if (results.length === 0) return null;

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: length > 0 checked above
  const best = results[0]!;
  const secondBest = results[1];

  // Determine confidence based on score difference and match count
  let confidence: "high" | "medium" | "low";

  if (
    best.matches.length >= 3 &&
    (!secondBest || best.score > secondBest.score * 2)
  ) {
    confidence = "high";
  } else if (
    best.matches.length >= 2 ||
    (secondBest && best.score > secondBest.score * 1.5)
  ) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    category: best.category,
    confidence,
    matchedKeywords: best.matches.slice(0, 5), // Limit to top 5 matched keywords
  };
}
