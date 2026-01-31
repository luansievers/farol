# PRD: Radar de Contratos

## Overview

O Radar de Contratos é uma infraestrutura cívica que analisa automaticamente contratos públicos da Prefeitura de São Paulo, transformando documentos técnicos em informações acessíveis. O sistema usa AI para resumir contratos em linguagem simples, atribui scores de anomalia baseados em critérios objetivos e permite comparação entre contratos similares.

O foco é transparência e accountability, não acusações. O sistema sinaliza padrões estatisticamente incomuns, permitindo que jornalistas, pesquisadores e cidadãos decidam onde investigar mais.

**MVP:** Protótipo focado em contratos da Prefeitura de SP para validação do modelo.

## Goals

- Reduzir o custo cognitivo de entender contratos públicos
- Transformar PDFs técnicos em resumos acessíveis a qualquer cidadão
- Identificar anomalias estatísticas de forma objetiva e neutra
- Permitir comparação entre contratos similares (histórica e regional)
- Fornecer API pública para integração com outros sistemas
- Validar o modelo com dados reais de SP antes de expandir

## Quality Gates

Estes comandos devem passar para toda user story:
- `pnpm typecheck` - Type checking
- `pnpm lint` - Linting

Para stories de UI, também incluir:
- Verificar no browser usando dev-browser skill

## User Stories

### US-001: Setup do projeto e estrutura base
**Description:** Como desenvolvedor, quero um projeto Node/TypeScript configurado com as dependências essenciais para começar o desenvolvimento.

**Acceptance Criteria:**
- [ ] Projeto inicializado com pnpm
- [ ] TypeScript configurado com strict mode
- [ ] ESLint + Prettier configurados
- [ ] Estrutura de pastas definida (src/modules, src/shared, etc.)
- [ ] Scripts de dev, build, typecheck, lint no package.json
- [ ] README com instruções de setup

---

### US-002: Configuração do banco de dados PostgreSQL
**Description:** Como desenvolvedor, quero o banco PostgreSQL configurado com migrations para armazenar contratos e metadados.

**Acceptance Criteria:**
- [ ] Docker Compose com PostgreSQL para desenvolvimento local
- [ ] ORM configurado (Prisma ou TypeORM)
- [ ] Schema inicial: contratos, fornecedores, orgaos, aditivos, anomalias
- [ ] Migration inicial criada e aplicável
- [ ] Seed com dados de exemplo para testes

---

### US-003: Configuração de cloud storage para documentos
**Description:** Como desenvolvedor, quero integração com cloud storage (S3-compatible) para armazenar PDFs originais dos contratos.

**Acceptance Criteria:**
- [ ] Módulo de storage abstrato (interface que suporta S3, GCS, MinIO)
- [ ] Implementação para S3/MinIO (dev local)
- [ ] Funções: upload, download, getSignedUrl
- [ ] Variáveis de ambiente para configuração
- [ ] Testes unitários do módulo

---

### US-004: Crawler do Portal de Transparência SP - Listagem
**Description:** Como sistema, quero coletar a lista de contratos do Portal de Transparência da Prefeitura de SP.

**Acceptance Criteria:**
- [ ] Identificar endpoints/páginas do portal de SP com lista de contratos
- [ ] Scraper que extrai: número do contrato, objeto (resumo), valor, fornecedor, data
- [ ] Suporte a paginação
- [ ] Rate limiting para não sobrecarregar o portal
- [ ] Salvar metadados no banco
- [ ] Log de execução (contratos encontrados, erros)

---

### US-005: Crawler do Portal de Transparência SP - Detalhes e PDFs
**Description:** Como sistema, quero baixar os detalhes completos e PDFs de cada contrato identificado.

**Acceptance Criteria:**
- [ ] Acessar página de detalhes de cada contrato
- [ ] Extrair: partes, datas (início, fim), valor total, aditivos, modalidade
- [ ] Baixar PDF do contrato original
- [ ] Upload do PDF para cloud storage
- [ ] Atualizar registro no banco com URL do documento
- [ ] Fila de processamento para contratos pendentes

---

### US-006: Parser de PDFs de contratos
**Description:** Como sistema, quero extrair texto dos PDFs de contratos para análise por AI.

**Acceptance Criteria:**
- [ ] Integração com biblioteca de extração de PDF (pdf-parse ou similar)
- [ ] Extrair texto completo do documento
- [ ] Lidar com PDFs escaneados (OCR básico via Tesseract ou similar)
- [ ] Salvar texto extraído no banco
- [ ] Marcar contratos com falha de extração para revisão

---

### US-007: Módulo de AI configurável
**Description:** Como desenvolvedor, quero um módulo de AI que suporte múltiplos provedores (OpenAI, Anthropic, local) de forma configurável.

**Acceptance Criteria:**
- [ ] Interface abstrata para completions (prompt → response)
- [ ] Implementação para OpenAI (GPT-4o, GPT-4o-mini)
- [ ] Implementação para Anthropic (Claude)
- [ ] Placeholder para modelos locais (Ollama)
- [ ] Configuração via variáveis de ambiente
- [ ] Retry com exponential backoff
- [ ] Logging de uso (tokens, custo estimado)

---

### US-008: Geração de resumo do contrato por AI
**Description:** Como usuário, quero ver um resumo em linguagem simples de cada contrato, explicando o que está sendo contratado, por quanto e por quem.

**Acceptance Criteria:**
- [ ] Prompt estruturado para gerar resumo
- [ ] Resumo inclui: objeto (em linguagem simples), valor, partes, prazo, condições principais
- [ ] Resumo inclui: histórico de aditivos se houver
- [ ] Resumo inclui: contexto comparativo (valores de contratos similares)
- [ ] Formato consistente e legível
- [ ] Salvar resumo no banco vinculado ao contrato
- [ ] Possibilidade de regenerar resumo

---

### US-009: Classificação automática de contratos
**Description:** Como sistema, quero classificar contratos por categoria para permitir comparações relevantes.

**Acceptance Criteria:**
- [ ] Usar código de classificação oficial quando disponível (natureza de despesa)
- [ ] AI classifica por palavras-chave do objeto quando código não disponível
- [ ] Categorias principais: obras, serviços, TI, saúde, educação, outros
- [ ] Salvar categoria no banco
- [ ] Permitir correção manual da categoria

---

### US-010: Cálculo do score de anomalia - Valor
**Description:** Como sistema, quero identificar contratos com valores significativamente acima da média de contratos similares.

**Acceptance Criteria:**
- [ ] Calcular média e desvio padrão de contratos da mesma categoria
- [ ] Identificar contratos > 2 desvios padrão acima da média
- [ ] Considerar período temporal (comparar com mesmo ano/período)
- [ ] Gerar score parcial (0-25) para este critério
- [ ] Salvar justificativa ("Valor 47% acima da média de contratos similares")

---

### US-011: Cálculo do score de anomalia - Aditivos
**Description:** Como sistema, quero identificar contratos com número excessivo de aditivos.

**Acceptance Criteria:**
- [ ] Contar aditivos por contrato
- [ ] Calcular média de aditivos para contratos da mesma categoria
- [ ] Identificar contratos com aditivos > média + 1.5 desvios
- [ ] Considerar valor acumulado dos aditivos vs valor original
- [ ] Gerar score parcial (0-25) para este critério
- [ ] Salvar justificativa ("5 aditivos, média da categoria é 1.2")

---

### US-012: Cálculo do score de anomalia - Concentração de fornecedor
**Description:** Como sistema, quero identificar órgãos com concentração recorrente em um mesmo fornecedor.

**Acceptance Criteria:**
- [ ] Calcular % de contratos de cada órgão por fornecedor
- [ ] Identificar fornecedores com > 30% dos contratos de um órgão
- [ ] Considerar valor total além de quantidade
- [ ] Gerar score parcial (0-25) para este critério
- [ ] Salvar justificativa ("Fornecedor X tem 45% dos contratos do órgão Y")

---

### US-013: Cálculo do score de anomalia - Prazo atípico
**Description:** Como sistema, quero identificar contratos com prazos incomuns para sua categoria.

**Acceptance Criteria:**
- [ ] Calcular duração média de contratos por categoria
- [ ] Identificar contratos com prazo muito curto ou muito longo
- [ ] Considerar urgência declarada vs prazo
- [ ] Gerar score parcial (0-25) para este critério
- [ ] Salvar justificativa ("Prazo de 10 dias para obra, média é 180 dias")

---

### US-014: Consolidação do score de anomalia
**Description:** Como sistema, quero consolidar os scores parciais em um score final com categoria.

**Acceptance Criteria:**
- [ ] Somar scores parciais (0-100)
- [ ] Atribuir categoria: Baixo (0-30), Médio (31-60), Alto (61-100)
- [ ] Listar quais critérios contribuíram para o score
- [ ] Salvar score consolidado e breakdown no banco
- [ ] Ordenar contratos por score para exibição

---

### US-015: API REST - Endpoints de contratos
**Description:** Como desenvolvedor externo, quero acessar dados de contratos via API REST.

**Acceptance Criteria:**
- [ ] GET /api/contracts - Lista paginada com filtros
- [ ] GET /api/contracts/:id - Detalhes de um contrato
- [ ] Filtros: categoria, órgão, fornecedor, período, score mínimo
- [ ] Ordenação: data, valor, score
- [ ] Resposta inclui: dados, resumo AI, score, breakdown
- [ ] Documentação OpenAPI/Swagger

---

### US-016: API REST - Endpoints de comparação
**Description:** Como desenvolvedor externo, quero comparar contratos similares via API.

**Acceptance Criteria:**
- [ ] GET /api/contracts/:id/similar - Contratos similares
- [ ] Parâmetros: período (histórico), região (quando expandir)
- [ ] Resposta inclui: lista de contratos similares com valores
- [ ] Inclui estatísticas: média, mediana, min, max da categoria
- [ ] Documentação OpenAPI/Swagger

---

### US-017: API REST - Endpoints de fornecedores e órgãos
**Description:** Como desenvolvedor externo, quero consultar dados agregados por fornecedor e órgão.

**Acceptance Criteria:**
- [ ] GET /api/suppliers - Lista de fornecedores
- [ ] GET /api/suppliers/:id - Detalhes e contratos do fornecedor
- [ ] GET /api/agencies - Lista de órgãos
- [ ] GET /api/agencies/:id - Detalhes e contratos do órgão
- [ ] Inclui métricas: total de contratos, valor total, score médio
- [ ] Documentação OpenAPI/Swagger

---

### US-018: Interface Web - Setup e estrutura
**Description:** Como desenvolvedor, quero a aplicação web configurada com framework e componentes base.

**Acceptance Criteria:**
- [ ] Framework React com Vite ou Next.js
- [ ] TailwindCSS configurado
- [ ] Componentes base: Layout, Header, Footer
- [ ] Roteamento configurado
- [ ] Integração com API (fetch/axios configurado)
- [ ] Página inicial com placeholder

---

### US-019: Interface Web - Lista de contratos
**Description:** Como jornalista, quero ver uma lista de contratos com filtros e ordenação para encontrar rapidamente o que procuro.

**Acceptance Criteria:**
- [ ] Tabela de contratos com colunas: objeto, valor, fornecedor, órgão, data, score
- [ ] Filtros: categoria, órgão, fornecedor, período
- [ ] Filtro por score mínimo (slider ou input)
- [ ] Ordenação por qualquer coluna
- [ ] Paginação
- [ ] Indicador visual de score (cor por categoria)
- [ ] Link para detalhes de cada contrato

---

### US-020: Interface Web - Detalhes do contrato
**Description:** Como jornalista, quero ver todos os detalhes de um contrato, incluindo resumo AI e breakdown do score.

**Acceptance Criteria:**
- [ ] Resumo AI em destaque no topo
- [ ] Dados completos: partes, valores, datas, aditivos
- [ ] Score visual com breakdown (quais critérios contribuíram)
- [ ] Lista de aditivos com valores e datas
- [ ] Link para PDF original
- [ ] Seção de contratos similares (preview)

---

### US-021: Interface Web - Comparação de contratos
**Description:** Como pesquisador, quero comparar um contrato com similares para entender se os valores são típicos.

**Acceptance Criteria:**
- [ ] Visualização de contratos similares (tabela ou cards)
- [ ] Gráfico comparativo (valor do contrato vs média/mediana)
- [ ] Filtro por período (últimos 1, 2, 5 anos)
- [ ] Estatísticas da categoria: média, mediana, min, max
- [ ] Destaque visual para posição do contrato atual

---

### US-022: Interface Web - Página de fornecedor
**Description:** Como jornalista, quero ver o perfil de um fornecedor com todos os seus contratos e métricas.

**Acceptance Criteria:**
- [ ] Dados do fornecedor: CNPJ, razão social
- [ ] Métricas: total de contratos, valor total, órgãos atendidos
- [ ] Indicador de concentração (se > 30% em algum órgão)
- [ ] Lista de contratos do fornecedor
- [ ] Gráfico de evolução temporal (contratos por ano)

---

### US-023: Interface Web - Página de órgão
**Description:** Como pesquisador, quero ver o perfil de um órgão com seus contratos e principais fornecedores.

**Acceptance Criteria:**
- [ ] Dados do órgão
- [ ] Métricas: total de contratos, valor total, score médio
- [ ] Top fornecedores (com % de participação)
- [ ] Lista de contratos do órgão
- [ ] Indicador de concentração se houver

---

### US-024: Interface Web - Busca global
**Description:** Como usuário, quero buscar contratos por texto livre para encontrar rapidamente o que procuro.

**Acceptance Criteria:**
- [ ] Campo de busca no header
- [ ] Busca por: objeto do contrato, fornecedor, órgão
- [ ] Resultados agrupados por tipo (contratos, fornecedores, órgãos)
- [ ] Autocomplete com sugestões
- [ ] Página de resultados com filtros

---

### US-025: Job de atualização automática
**Description:** Como sistema, quero atualizar automaticamente os dados de contratos periodicamente.

**Acceptance Criteria:**
- [ ] Job agendado (cron) para rodar diariamente
- [ ] Coletar novos contratos desde última execução
- [ ] Atualizar contratos existentes se houver mudanças
- [ ] Recalcular scores afetados por novos dados
- [ ] Log de execução com métricas (novos, atualizados, erros)
- [ ] Alertas em caso de falha

---

### US-026: Documentação da API
**Description:** Como desenvolvedor externo, quero documentação completa da API para integrar meus sistemas.

**Acceptance Criteria:**
- [ ] Swagger/OpenAPI spec completa
- [ ] Página de documentação interativa (/api/docs)
- [ ] Exemplos de requisição e resposta
- [ ] Descrição de todos os filtros e parâmetros
- [ ] Guia de início rápido no README

## Functional Requirements

- FR-01: O sistema deve coletar contratos do Portal de Transparência de SP via scraping/API
- FR-02: O sistema deve armazenar PDFs originais em cloud storage com link para o registro
- FR-03: O sistema deve extrair texto de PDFs, incluindo documentos escaneados (OCR)
- FR-04: O sistema deve gerar resumos em linguagem simples usando AI configurável
- FR-05: O sistema deve classificar contratos por categoria usando código oficial + AI
- FR-06: O sistema deve calcular score de anomalia (0-100) baseado em 4 critérios objetivos
- FR-07: O sistema deve categorizar scores como Baixo/Médio/Alto
- FR-08: O sistema deve permitir comparação com contratos similares (histórica e regional)
- FR-09: A API deve ser pública e documentada, sem autenticação
- FR-10: A interface deve ser otimizada para jornalistas/pesquisadores com filtros avançados
- FR-11: O sistema deve atualizar dados automaticamente via job diário

## Non-Goals (Out of Scope)

- Autenticação de usuários (dados públicos = acesso público)
- Alertas personalizados por email (futuro)
- Expansão para outros municípios/estados (após validação do MVP)
- App mobile nativo (interface web responsiva é suficiente)
- Integração com redes sociais
- Sistema de denúncias ou comentários
- Julgamento ou classificação como "corrupto" - apenas anomalias estatísticas
- Dados em tempo real (atualização diária é suficiente)

## Technical Considerations

- **Stack:** Node.js + TypeScript, PostgreSQL, React
- **AI:** Módulo abstrato suportando OpenAI, Anthropic, modelos locais
- **Storage:** S3-compatible (MinIO para dev, AWS S3 ou similar para prod)
- **Scraping:** Respeitar rate limits, implementar retry, considerar mudanças no portal
- **Performance:** Indexar campos de busca, cache para queries frequentes
- **Infraestrutura:** Docker Compose para dev, considerar deploy em cloud (Railway, Render, AWS)

## Success Metrics

- Contratos de SP coletados e processados (meta: 1000+ no MVP)
- Resumos gerados com qualidade avaliada por usuários teste
- Scores de anomalia correlacionam com casos conhecidos de problemas
- API respondendo em < 500ms para queries típicas
- Feedback positivo de jornalistas/pesquisadores em testes de usabilidade

## Open Questions

- Qual a frequência de atualização do Portal de Transparência de SP?
- Existem APIs oficiais ou apenas páginas HTML para scraping?
- Como lidar com contratos sigilosos ou parcialmente ocultados?
- Qual limite de custo aceitável para AI (tokens/mês)?
- Expandir para licitações além de contratos no futuro?

### 1️⃣ Frequência de atualização do Portal de Transparência de SP

Na prática, **não é real-time**.

* Contratos e aditivos costumam aparecer com **delay de dias a semanas** após assinatura/publicação oficial.
* Atualizações são **assíncronas por secretaria** (algumas atualizam mais rápido que outras).

👉 **Decisão para o MVP:**
Rodar coleta **1x por dia** é suficiente e realista. Mais do que isso não gera ganho real.

---

### 2️⃣ APIs oficiais ou apenas HTML para scraping?

* O município de São Paulo **não oferece APIs completas e estáveis** para todos os contratos.
* Parte dos dados vem de **páginas HTML + downloads de PDF**.
* Alguns datasets podem existir em CSV, mas **incompletos ou desatualizados**.

👉 **Decisão para o MVP:**
**Scraping como fonte principal**, com abstração para plugar APIs se surgirem depois.

---

### 3️⃣ Contratos sigilosos ou parcialmente ocultados

Isso vai acontecer — e **não é um bug, é um sinal**.

Boas práticas:

* Marcar claramente como:

  * “Parcialmente ocultado”
  * “Informações sigilosas por lei”
* Analisar **metadados disponíveis**:

  * valor total
  * órgão
  * fornecedor
  * datas
* Penalizar **opacidade excessiva** como *feature do score* (ex: +risco por baixa transparência)

👉 **Importante:**
Nunca tentar inferir conteúdo oculto. Apenas **registrar que está oculto**.

---

### 4️⃣ Limite de custo aceitável para AI (tokens/mês)

Para um MVP saudável:

* **Target:** USD **20–50/mês**
* Estratégias:

  * resumir **uma vez** por contrato (cache forte)
  * chunking inteligente (não mandar PDF inteiro sempre)
  * usar modelo menor para pré-processamento
  * modelo maior só para resumos finais

👉 **Regra de ouro:**
AI é **build-time**, não request-time.

---

### 5️⃣ Expandir para licitações além de contratos no futuro?

**Sim — mas NÃO no MVP.**

Roadmap lógico:

1. MVP → contratos + aditivos
2. Depois → **licitações** (fase anterior ao contrato)
3. Ouro → comparação *promessa vs execução*

Licitações são mais complexas:

* mais documentos
* mais ruído
* mais risco político

👉 **Decisão correta:**
Deixar explícito como **fase 2**.