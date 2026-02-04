# 🔍 Farol

### Infraestrutura Cívica para Análise de Contratos Públicos

🌐 **Leia em:** [English](README.md) | [Português](README.pt-BR.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-20+-green)](package.json)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](tsconfig.json)
[![PostgreSQL >= 14](https://img.shields.io/badge/postgresql-14+-blue)](README.md)
[![Made with React](https://img.shields.io/badge/made_with-React-61dafb)](packages/web/package.json)

Farol transforma documentos técnicos de contratos públicos do governo de São Paulo em informações acessíveis e analisáveis usando análise com IA, detecção automatizada de riscos e busca em texto completo.

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/press-kit/screenshots/01-dashboard.png" alt="Dashboard com analytics" /></td>
    <td><img src="docs/press-kit/screenshots/02-contratos-lista.png" alt="Listagem de contratos" /></td>
  </tr>
  <tr>
    <td><img src="docs/press-kit/screenshots/03-contrato-detalhe.png" alt="Detalhes do contrato" /></td>
    <td><img src="docs/press-kit/screenshots/04-contrato-anomalia.png" alt="Detecção de anomalias" /></td>
  </tr>
  <tr>
    <td><img src="docs/press-kit/screenshots/05-busca-global.png" alt="Busca global" /></td>
    <td><img src="docs/press-kit/screenshots/06-fornecedor-detalhe.png" alt="Perfil do fornecedor" /></td>
  </tr>
  <tr>
    <td><img src="docs/press-kit/screenshots/07-orgao-detalhe.png" alt="Perfil do órgão" /></td>
    <td><img src="docs/press-kit/screenshots/08-dark-mode.png" alt="Interface em modo escuro" /></td>
  </tr>
</table>

---

## 🎯 Problema & Missão

Contratos públicos no Brasil movimentam bilhões de reais do contribuinte anualmente, mas acessar e compreender esses dados é difícil para os cidadãos. Documentos contratuais são técnicos, dispersos e carecem de análise contextual.

**Missão do Farol**: Superar a lacuna de transparência tornando dados de contratações públicas acessíveis, pesquisáveis e compreensíveis através de análise com IA e detecção de anomalias.

---

## ✨ Funcionalidades Principais

### 🤖 **Resumos com IA**
Geração automática de resumos em linguagem simples a partir de documentos contratuais complexos usando LLMs (OpenAI/Anthropic).

### 🚨 **Detecção de Anomalias**
Pontuação automatizada de riscos baseada em 8 critérios:
- Preços fora da curva
- Frequência de aditivos
- Contratos com lance único
- Contratações emergenciais
- Indicadores de risco do fornecedor
- Atrasos na execução
- Concentração de valores
- Padrões históricos

### 🔎 **Busca em Texto Completo**
Busca rápida com PostgreSQL em todos os contratos, fornecedores e órgãos, com ranking de relevância.

### 📊 **Dashboard de Analytics**
Visualize tendências de gastos, principais fornecedores, atividade dos órgãos e distribuições de risco.

### 🔌 **API REST**
API aberta para acesso programático a todos os dados de contratos, resumos e analytics.

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** >= 14
- **Docker** (opcional, para BD local)

### Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/luansievers/farol.git
   cd farol
   ```

2. **Instale as dependências**
   ```bash
   pnpm install
   ```

3. **Configure o ambiente**
   ```bash
   cp packages/api/.env.example packages/api/.env
   # Edite packages/api/.env com suas configurações
   ```

   **Variáveis de ambiente obrigatórias**:
   - `DATABASE_URL` - String de conexão PostgreSQL
   - `AI_PROVIDER` - "openai" ou "anthropic"
   - `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`
   - `STORAGE_*` - Configuração S3/MinIO

4. **Configure o banco de dados**
   ```bash
   pnpm db:migrate    # Execute as migrations
   pnpm db:seed       # Popule dados iniciais (opcional)
   ```

5. **Inicie os servidores de desenvolvimento**
   ```bash
   pnpm dev:all       # API (porta 3000) + Web (porta 5173)
   ```

### Opção Docker

```bash
docker-compose up -d   # Inicia PostgreSQL + MinIO
pnpm install
pnpm db:migrate
pnpm dev:all
```

---

## 🏗️ Arquitetura

```
┌────────────────────────┐
│   Interface Web        │
│   (React + Vite)       │  ← Interface do usuário
└──────────┬─────────────┘
           │
┌──────────▼─────────────┐
│   REST API (Hono)      │  ← /api/contracts, /api/search
│   Zod + OpenAPI        │     /api/suppliers, /api/agencies
└──────────┬─────────────┘
           │
┌──────────▼─────────────┐
│   Pipeline de Dados    │  ← crawler → detail → parser
│   Workflow de 8 etapas │     → summary → classify → anomaly
└──────────┬─────────────┘
           │
    ┌──────┼──────┐
    │      │      │
┌───▼──┐ ┌─▼──┐ ┌▼───┐
│ DB   │ │ S3 │ │LLM │
│Prisma│ │/MIN│ │APIs│  ← PostgreSQL, MinIO, OpenAI/Anthropic
└──────┘ └────┘ └────┘
```

### Estrutura do Monorepo

```
packages/
├── api/           # Backend Hono + Prisma ORM
│   ├── src/
│   │   ├── modules/    # Módulos de funcionalidades
│   │   │   ├── api/        # Endpoints REST
│   │   │   ├── crawler/    # Coleta de dados PNCP
│   │   │   ├── parser/     # Extração de texto de PDFs
│   │   │   ├── summary/    # Resumos com IA
│   │   │   ├── classification/ # Categorização
│   │   │   ├── anomalies/  # Pontuação de riscos
│   │   │   ├── database/   # Cliente Prisma
│   │   │   ├── storage/    # S3/MinIO
│   │   │   └── ai/         # Utilitários LLM
│   │   └── generated/  # Tipos Prisma
│   └── prisma/
│       └── schema.prisma
├── web/           # React + TanStack Router/Query
│   ├── src/
│   │   ├── routes/      # Roteamento baseado em arquivos
│   │   ├── components/  # Componentes UI (shadcn/ui)
│   │   ├── hooks/       # Hooks TanStack Query
│   │   └── lib/         # Utilitários
└── shared/        # Tipos TypeScript compartilhados
    └── src/
        ├── dtos/    # Data Transfer Objects
        └── enums/   # Enums compartilhados
```

---

## 📡 Documentação da API

### Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/contracts` | GET | Lista contratos com paginação/filtros |
| `/api/contracts/:id` | GET | Detalhes do contrato + aditivos |
| `/api/contracts/search` | GET | Busca em texto completo |
| `/api/suppliers` | GET | Lista fornecedores com estatísticas |
| `/api/suppliers/:id` | GET | Perfil do fornecedor + contratos |
| `/api/agencies` | GET | Lista órgãos governamentais |
| `/api/agencies/:id` | GET | Perfil do órgão + contratos |
| `/api/stats` | GET | Estatísticas da plataforma |

### Exemplo de Requisição

```bash
curl "http://localhost:3000/api/contracts?page=1&limit=20&status=active"
```

### Exemplo de Resposta

```json
{
  "data": [
    {
      "id": "abc123",
      "number": "001/2024",
      "title": "Serviços de TI",
      "value": 500000.00,
      "supplier": { "id": "xyz", "name": "Tech Corp" },
      "agency": { "id": "def", "name": "PMSP" },
      "summary": "Contrato para serviços de infraestrutura de TI...",
      "anomalyScore": 65,
      "riskLevel": "MEDIUM"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1542
  }
}
```

### Critérios de Pontuação de Anomalias

| Critério | Descrição | Peso |
|----------|-----------|------|
| **Preço Fora da Curva** | Valor 2+ desvios-padrão acima da média da categoria | Alto |
| **Frequência de Aditivos** | Mais de 3 aditivos (limite é 25% do valor por lei) | Alto |
| **Lance Único** | Apenas um fornecedor participou da licitação | Médio |
| **Contratação Emergencial** | Contrato usou justificativa de emergência | Médio |
| **Risco do Fornecedor** | Fornecedor tem histórico de penalidades/cancelamentos | Alto |
| **Atraso na Execução** | Execução do contrato atrasada além de 30 dias | Baixo |
| **Concentração de Valores** | Fornecedor recebe >10% do total de contratos do órgão | Médio |
| **Padrão Histórico** | Desvio dos padrões típicos de gastos do órgão | Baixo |

**Faixas de pontuação**:
- **0-30**: Risco baixo (verde)
- **31-60**: Risco médio (amarelo)
- **61-100**: Risco alto (vermelho)

### Documentação OpenAPI

Documentação interativa da API disponível em: `http://localhost:3000/doc` (Swagger UI)

---

## 🔄 Pipeline de Dados (ETL)

### Workflow

```
1. crawler    → Coleta lista de contratos da API PNCP
2. detail     → Coleta dados detalhados dos contratos
3. parser     → Extrai texto de documentos PDF (OCR via tesseract.js)
4. summary    → Gera resumos com IA
5. classify   → Categoriza contratos
6. anomaly    → Calcula pontuações de anomalias
```

### Comandos

```bash
# Coletar contratos do PNCP
pnpm crawler              # Coletar novos contratos
pnpm crawler:week         # Coletar últimos 7 dias
pnpm crawler:month        # Coletar últimos 30 dias

# Coletar detalhes dos contratos
pnpm detail               # Coletar detalhes de contratos pendentes
pnpm detail:batch         # Processar em lotes
pnpm detail:stats         # Mostrar estatísticas de processamento
pnpm detail:reset         # Resetar status de processamento

# Processar PDFs
pnpm parser               # Processar PDFs pendentes
pnpm parser:batch         # Processar em lotes
pnpm parser:stats         # Mostrar estatísticas de parsing
pnpm parser:reset         # Resetar status de parsing

# Gerar resumos
pnpm summary              # Gerar resumos
pnpm summary:batch        # Processar em lotes
pnpm summary:stats        # Mostrar estatísticas de resumos
pnpm summary:reset        # Resetar status de resumos
pnpm summary:regen        # Regenerar resumos existentes

# Classificar contratos
pnpm classify             # Classificar contratos pendentes
pnpm classify:batch       # Processar em lotes
pnpm classify:stats       # Mostrar estatísticas de classificação
pnpm classify:reset       # Resetar status de classificação
pnpm classify:reclassify  # Reclassificar todos os contratos

# Calcular anomalias
pnpm anomaly              # Calcular pontuações
pnpm anomaly:batch        # Processar em lotes
pnpm anomaly:stats        # Mostrar estatísticas de anomalias
pnpm anomaly:reset        # Resetar pontuações
pnpm anomaly:recalculate  # Recalcular todas as pontuações
pnpm anomaly:single <id>  # Calcular para contrato único
```

### Automação

```bash
# Executar pipeline completo automaticamente
pnpm auto-update          # Atualização completa única
pnpm auto-update:start    # Iniciar atualizações contínuas
pnpm auto-update:stats    # Mostrar estatísticas de atualização
```

---

## 💻 Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev:all       # Iniciar API + web em paralelo
pnpm dev           # Apenas API (http://localhost:3000)
pnpm dev:web       # Apenas Web (http://localhost:5173)

# Build & Qualidade
pnpm build         # Build de todos os pacotes (shared → api → web)
pnpm test          # Executar testes vitest
pnpm lint          # Lint de todos os pacotes
pnpm typecheck     # Verificação de tipos de todos os pacotes

# Banco de Dados
pnpm db:generate   # Gerar cliente Prisma (executar após mudanças no schema)
pnpm db:migrate    # Criar/executar migrations
pnpm db:studio     # Abrir Prisma Studio UI
pnpm db:seed       # Popular banco de dados
pnpm db:reset      # Resetar banco de dados (⚠️ deleta todos os dados)
```

### Organização do Código

**Path Aliases**:
- API: `@/*` → `./src/*`, `@modules/*` → `./src/modules/*`
- Web: `@/*` → `./src/*`
- Ambos: `@farol/shared` → pacote shared

**Estrutura de Módulos** (API):
```
modules/
└── nome-funcionalidade/
    ├── controllers/       # Handlers HTTP
    ├── services/          # Lógica de negócio
    ├── dto/
    │   ├── request/       # DTOs de entrada
    │   └── response/      # DTOs de saída
    └── utils/             # Funções auxiliares
```

**Estrutura de Componentes** (Web):
```
src/
├── routes/                # TanStack Router (baseado em arquivos)
├── components/            # Componentes UI
│   ├── ui/                # Primitivos shadcn/ui
│   └── nome-funcionalidade/      # Componentes de funcionalidade
├── hooks/
│   └── queries/           # Hooks TanStack Query
└── lib/
    ├── validations/       # Schemas Zod
    └── api.ts             # Cliente API
```

### Padrões de Código

- **Idioma**: Todo código (funções, variáveis, comentários, mensagens) em **Inglês**
- **DTOs**: Diretórios request/response separados por módulo
- **Validação**: Schemas Zod para API, class-validator para interno
- **Banco de Dados**: Sempre executar `pnpm db:generate` após mudanças no schema Prisma
- **Type Safety**: TypeScript estrito, sem `any`
- **Nomenclatura**: Descritiva, imperativa para funções (`getUserById`, não `user`)

---

## 🤝 Como Contribuir

Contribuições são bem-vindas! Áreas de interesse:

- 🔍 **Fontes de Dados**: Integrar dados CEIS, TCU, CNPJ
- 📊 **Analytics**: Adicionar novos critérios de detecção de anomalias
- 🎨 **UI/UX**: Melhorar visualizações e experiência do usuário
- 🧪 **Testes**: Aumentar cobertura de testes
- 📖 **Documentação**: Melhorar guias e documentação da API
- 🌐 **i18n**: Suporte a internacionalização

Para diretrizes detalhadas, consulte [CONTRIBUTING.md](CONTRIBUTING.md).

### Workflow de Desenvolvimento

1. **Fork & clone** do repositório
2. **Criar branch**: `git checkout -b feature/minha-funcionalidade`
3. **Fazer mudanças**: Seguir padrões de código
4. **Testar**: Executar `pnpm test`, `pnpm lint`, `pnpm typecheck`
5. **Commit**: Usar mensagens claras e imperativas
   ```
   feat: add supplier network analysis
   fix: correct anomaly score calculation
   docs: update API documentation
   ```
6. **Push & PR**: Submeter pull request com descrição

### Formato de Mensagem de Commit

```
<tipo>: <assunto>

[corpo opcional]
```

**Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Checklist de PR

- [ ] Código segue convenções do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem erros de tipo (`pnpm typecheck`)
- [ ] Sem erros de linting (`pnpm lint`)
- [ ] Build bem-sucedido (`pnpm build`)
- [ ] Se alterou README.md, atualizou README.pt-BR.md

---

## 🗺️ Roadmap

### Fase 1: Fontes de Dados Expandidas (Q1 2026)
- [ ] Integrar CEIS (Cadastro de Empresas Inidôneas)
- [ ] Conectar APIs de dados abertos do TCU
- [ ] Adicionar análise de rede corporativa CNPJ
- [ ] Cruzar referências de sanções a fornecedores

### Fase 2: Analytics Avançado (Q2 2026)
- [ ] Visualização de rede de fornecedores
- [ ] Análise de tendências temporais
- [ ] Modelos de previsão de preços
- [ ] Benchmarking comparativo

### Fase 3: Funcionalidades Comunitárias (Q3 2026)
- [ ] API pública com rate limiting
- [ ] Exportação de dados (CSV, JSON, Excel)
- [ ] Alertas por email para contratos sinalizados
- [ ] Relatórios de anomalias enviados por usuários

### Fase 4: Integração Institucional (Q4 2026)
- [ ] Dashboard para auditores com filtros avançados
- [ ] Ferramentas de análise em lote
- [ ] Opção de implantação white-label
- [ ] Integração com sistemas oficiais de fiscalização

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: [Hono](https://hono.dev/) - Runtime edge ultra-rápido
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/)
- **Validação**: [Zod](https://zod.dev/) com geração OpenAPI
- **Storage**: Compatível com S3 (MinIO para dev local)
- **IA**: OpenAI GPT-4 / Anthropic Claude para resumos
- **Linguagem**: TypeScript 5.9

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Roteamento**: [TanStack Router](https://tanstack.com/router)
- **Estado**: [TanStack Query](https://tanstack.com/query)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) (Radix + Tailwind CSS)
- **Build**: [Vite 6](https://vite.dev/)

### DevOps
- **Monorepo**: pnpm workspaces
- **Testes**: Vitest
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions (planejado)
- **Containers**: Docker + Docker Compose

---

## 🚀 Deploy

### Opção 1: Vercel + Railway

**Frontend (Vercel)**:
```bash
vercel deploy --prod
```

**Backend (Railway)**:
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy a partir de `packages/api`

### Opção 2: Fly.io

```bash
fly deploy --config packages/api/fly.toml
```

### Opção 3: Docker

```bash
# Build
docker build -t farol-api -f packages/api/Dockerfile .
docker build -t farol-web -f packages/web/Dockerfile .

# Executar
docker-compose up -d
```

### Variáveis de Ambiente (Produção)

```bash
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:5432/farol

# Provedor de IA
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Storage
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_BUCKET=farol-documents
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...

# Segurança
JWT_SECRET=...
API_RATE_LIMIT=100
```

---

## ❓ FAQ

**P: Como a privacidade do usuário é tratada?**
R: Todos os dados são informações públicas de fontes governamentais (PNCP). Não coletamos dados pessoais dos usuários. O projeto está em conformidade com a LGPD, pois trabalha apenas com dados de contratações públicas já disponíveis para consulta pública.

**P: Qual a licença do Farol?**
R: GPL-3.0. Você pode usar, modificar e distribuir livremente, mas deve tornar código aberto os trabalhos derivados.

**P: Com que frequência os dados são atualizados?**
R: Atualizações incrementais diárias. Atualização completa semanal. Use `pnpm auto-update:start` para atualizações contínuas.

**P: Posso usar o Farol para fins comerciais?**
R: Sim, sob os termos da GPL-3.0. Você deve tornar código aberto quaisquer modificações.

**P: Posso hospedar o Farol localmente?**
R: Sim! Veja a seção [Deploy](#-deploy). Requer PostgreSQL + Node.js.

**P: Como relatar problemas de segurança?**
R: Abra um GitHub advisory privado no repositório.

**P: Por que a sumarização com IA usa APIs pagas?**
R: Qualidade e confiabilidade. Suportamos OpenAI e Anthropic. Modelos locais (Ollama) planejados.

**P: Os dados estão de acordo com a LGPD?**
R: Sim. Processamos apenas dados públicos de contratações governamentais conforme Lei de Acesso à Informação (LAI - Lei 12.527/2011). Não coletamos dados pessoais de usuários da plataforma.

---

## 📄 Licença & Créditos

### Licença

Farol é licenciado sob **GPL-3.0**. Veja [LICENSE](LICENSE) para texto completo.

### Licenças de Terceiros

- React: MIT
- Hono: MIT
- Prisma: Apache 2.0
- PostgreSQL: PostgreSQL License
- shadcn/ui: MIT
- TanStack: MIT

Licenças completas de dependências em `node_modules/*/LICENSE`.

### Fontes de Dados

- **PNCP** (Plataforma Nacional de Contratações Públicas): Portal oficial de contratações governamentais brasileiras
- Dados de contratos usados sob princípios de dados abertos (Lei de Acesso à Informação - LAI)

### Agradecimentos

- Inspirado pela [Operação Serenata de Amor](https://serenata.ai/)
- Construído com apoio da comunidade brasileira de tecnologia cívica

---

## 🔗 Recursos

### Documentação
- [Referência da API](docs/api/README.md) (planejado)
- [Guia do Pipeline de Dados](docs/pipeline/README.md) (planejado)
- [Guia de Deploy](docs/deployment/README.md) (planejado)

### Links Externos
- [Portal PNCP](https://pncp.gov.br/)
- [Lei 14.133/2021](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm) (Lei de licitações brasileira)
- [TCU Dados Abertos](https://portal.tcu.gov.br/dados-abertos/)
- [Portal da Transparência](https://portaldatransparencia.gov.br/)
- [CEIS - Cadastro de Empresas Inidôneas](https://portaldatransparencia.gov.br/sancoes/ceis)

### Projetos Relacionados
- [Querido Diário](https://queridodiario.ok.org.br/) - Monitoramento de diários oficiais
- [Brasil.IO](https://brasil.io/) - Datasets abertos brasileiros
- [Serenata de Amor](https://serenata.ai/) - Auditoria de gastos parlamentares

---

<div align="center">

**Construído com ❤️ para transparência e participação cívica**

[Reportar Bug](https://github.com/luansievers/farol/issues) · [Solicitar Funcionalidade](https://github.com/luansievers/farol/issues) · [Contribuir](CONTRIBUTING.md)

</div>
