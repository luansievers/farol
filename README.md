# 🔍 Farol

### Civic Infrastructure for Public Contract Analysis

🌐 **Read in:** [English](README.md) | [Português](README.pt-BR.md)

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-20+-green)](package.json)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](tsconfig.json)
[![PostgreSQL >= 14](https://img.shields.io/badge/postgresql-14+-blue)](README.md)
[![Made with React](https://img.shields.io/badge/made_with-React-61dafb)](packages/web/package.json)

Farol transforms technical public contract documents from São Paulo's government into accessible, analyzable information using AI-powered analysis, automated risk detection, and full-text search.

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/press-kit/screenshots/01-dashboard.png" alt="Dashboard with analytics" /></td>
    <td><img src="docs/press-kit/screenshots/02-contratos-lista.png" alt="Contracts list view" /></td>
  </tr>
  <tr>
    <td><img src="docs/press-kit/screenshots/03-contrato-detalhe.png" alt="Contract details" /></td>
    <td><img src="docs/press-kit/screenshots/04-contrato-anomalia.png" alt="Anomaly detection" /></td>
  </tr>
  <tr>
    <td><img src="docs/press-kit/screenshots/05-busca-global.png" alt="Global search" /></td>
    <td><img src="docs/press-kit/screenshots/06-fornecedor-detalhe.png" alt="Supplier profile" /></td>
  </tr>
  <tr>
    <td><img src="docs/press-kit/screenshots/07-orgao-detalhe.png" alt="Agency profile" /></td>
    <td><img src="docs/press-kit/screenshots/08-dark-mode.png" alt="Dark mode interface" /></td>
  </tr>
</table>

---

## 🎯 Problem & Mission

Public contracts in Brazil involve billions of taxpayer reais annually, but accessing and understanding this data is difficult for citizens. Contract documents are technical, scattered, and lack contextual analysis.

**Farol's mission**: Bridge the transparency gap by making public procurement data accessible, searchable, and understandable through AI-powered analysis and anomaly detection.

---

## ✨ Key Features

### 🤖 **AI-Powered Summaries**
Automatic generation of plain-language summaries from complex contract documents using LLMs (OpenAI/Anthropic).

### 🚨 **Anomaly Detection**
Automated risk scoring based on 8 criteria:
- Price outliers
- Amendment frequency
- Single-bid contracts
- Emergency procurement
- Supplier risk flags
- Execution delays
- Value concentration
- Historical patterns

### 🔎 **Full-Text Search**
Fast, PostgreSQL-backed search across all contracts, suppliers, and agencies with relevance ranking.

### 📊 **Analytics Dashboard**
Visualize spending trends, top suppliers, agency activity, and risk distributions.

### 🔌 **REST API**
Open API for programmatic access to all contract data, summaries, and analytics.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** >= 14
- **Docker** (optional, for local DB)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/luansievers/farol.git
   cd farol
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp packages/api/.env.example packages/api/.env
   # Edit packages/api/.env with your settings
   ```

   **Required environment variables**:
   - `DATABASE_URL` - PostgreSQL connection string
   - `AI_PROVIDER` - "openai" or "anthropic"
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `STORAGE_*` - S3/MinIO configuration

4. **Setup database**
   ```bash
   pnpm db:migrate    # Run migrations
   pnpm db:seed       # Seed initial data (optional)
   ```

5. **Start development servers**
   ```bash
   pnpm dev:all       # API (port 3000) + Web (port 5173)
   ```

### Docker Option

```bash
docker-compose up -d   # Starts PostgreSQL + MinIO
pnpm install
pnpm db:migrate
pnpm dev:all
```

---

## 🏗️ Architecture

```
┌────────────────────────┐
│   Public Web UI        │
│   (React + Vite)       │  ← User-facing interface
└──────────┬─────────────┘
           │
┌──────────▼─────────────┐
│   REST API (Hono)      │  ← /api/contracts, /api/search
│   Zod + OpenAPI        │     /api/suppliers, /api/agencies
└──────────┬─────────────┘
           │
┌──────────▼─────────────┐
│   Data Pipeline (ETL)  │  ← crawler → detail → parser
│   8-stage workflow     │     → summary → classify → anomaly
└──────────┬─────────────┘
           │
    ┌──────┼──────┐
    │      │      │
┌───▼──┐ ┌─▼──┐ ┌▼───┐
│ DB   │ │ S3 │ │LLM │
│Prisma│ │/MIN│ │APIs│  ← PostgreSQL, MinIO, OpenAI/Anthropic
└──────┘ └────┘ └────┘
```

### Monorepo Structure

```
packages/
├── api/           # Hono backend + Prisma ORM
│   ├── src/
│   │   ├── modules/    # Feature modules
│   │   │   ├── api/        # REST endpoints
│   │   │   ├── crawler/    # PNCP data fetching
│   │   │   ├── parser/     # PDF text extraction
│   │   │   ├── summary/    # AI summarization
│   │   │   ├── classification/ # Categorization
│   │   │   ├── anomalies/  # Risk scoring
│   │   │   ├── database/   # Prisma client
│   │   │   ├── storage/    # S3/MinIO
│   │   │   └── ai/         # LLM utilities
│   │   └── generated/  # Prisma types
│   └── prisma/
│       └── schema.prisma
├── web/           # React + TanStack Router/Query
│   ├── src/
│   │   ├── routes/      # File-based routing
│   │   ├── components/  # UI components (shadcn/ui)
│   │   ├── hooks/       # TanStack Query hooks
│   │   └── lib/         # Utilities
└── shared/        # Shared TypeScript types
    └── src/
        ├── dtos/    # Data Transfer Objects
        └── enums/   # Shared enums
```

---

## 📡 API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contracts` | GET | List contracts with pagination/filters |
| `/api/contracts/:id` | GET | Get contract details + amendments |
| `/api/contracts/search` | GET | Full-text search |
| `/api/suppliers` | GET | List suppliers with stats |
| `/api/suppliers/:id` | GET | Supplier profile + contracts |
| `/api/agencies` | GET | List government agencies |
| `/api/agencies/:id` | GET | Agency profile + contracts |
| `/api/stats` | GET | Platform-wide statistics |

### Example Request

```bash
curl "http://localhost:3000/api/contracts?page=1&limit=20&status=active"
```

### Example Response

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
      "summary": "Contract for IT infrastructure services...",
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

### Anomaly Score Criteria

| Criterion | Description | Weight |
|-----------|-------------|--------|
| **Price Outlier** | Value 2+ standard deviations above category average | High |
| **Amendment Frequency** | More than 3 amendments (limit is 25% of value per law) | High |
| **Single Bidder** | Only one supplier participated in bidding | Medium |
| **Emergency Procurement** | Contract used emergency justification | Medium |
| **Supplier Risk** | Supplier has history of penalties/cancellations | High |
| **Execution Delay** | Contract execution delayed beyond 30 days | Low |
| **Value Concentration** | Supplier receives >10% of agency's total contracts | Medium |
| **Historical Pattern** | Deviation from agency's typical spending patterns | Low |

**Score ranges**:
- **0-30**: Low risk (green)
- **31-60**: Medium risk (yellow)
- **61-100**: High risk (red)

### OpenAPI Documentation

Interactive API docs available at: `http://localhost:3000/doc` (Swagger UI)

---

## 🔄 Data Pipeline (ETL)

### Workflow

```
1. crawler    → Fetch contract list from PNCP API
2. detail     → Fetch detailed contract data
3. parser     → Extract text from PDF documents (OCR via tesseract.js)
4. summary    → Generate AI summaries
5. classify   → Categorize contracts
6. anomaly    → Calculate anomaly scores
```

### Commands

```bash
# Fetch contracts from PNCP
pnpm crawler              # Fetch new contracts
pnpm crawler:week         # Fetch last 7 days
pnpm crawler:month        # Fetch last 30 days

# Fetch contract details
pnpm detail               # Fetch details for pending contracts
pnpm detail:batch         # Process in batches
pnpm detail:stats         # Show processing statistics
pnpm detail:reset         # Reset processing status

# Parse PDFs
pnpm parser               # Parse pending PDFs
pnpm parser:batch         # Process in batches
pnpm parser:stats         # Show parsing statistics
pnpm parser:reset         # Reset parsing status

# Generate summaries
pnpm summary              # Generate summaries
pnpm summary:batch        # Process in batches
pnpm summary:stats        # Show summary statistics
pnpm summary:reset        # Reset summary status
pnpm summary:regen        # Regenerate existing summaries

# Classify contracts
pnpm classify             # Classify pending contracts
pnpm classify:batch       # Process in batches
pnpm classify:stats       # Show classification statistics
pnpm classify:reset       # Reset classification status
pnpm classify:reclassify  # Reclassify all contracts

# Calculate anomalies
pnpm anomaly              # Calculate scores
pnpm anomaly:batch        # Process in batches
pnpm anomaly:stats        # Show anomaly statistics
pnpm anomaly:reset        # Reset scores
pnpm anomaly:recalculate  # Recalculate all scores
pnpm anomaly:single <id>  # Calculate for single contract
```

### Automation

```bash
# Run full pipeline automatically
pnpm auto-update          # One-time full update
pnpm auto-update:start    # Start continuous updates
pnpm auto-update:stats    # Show update statistics
```

---

## 💻 Development

### Available Scripts

```bash
# Development
pnpm dev:all       # Start API + web in parallel
pnpm dev           # API only (http://localhost:3000)
pnpm dev:web       # Web only (http://localhost:5173)

# Build & Quality
pnpm build         # Build all packages (shared → api → web)
pnpm test          # Run vitest tests
pnpm lint          # Lint all packages
pnpm typecheck     # Type check all packages

# Database
pnpm db:generate   # Generate Prisma client (run after schema changes)
pnpm db:migrate    # Create/run migrations
pnpm db:studio     # Open Prisma Studio UI
pnpm db:seed       # Seed database
pnpm db:reset      # Reset database (⚠️ deletes all data)
```

### Code Organization

**Path Aliases**:
- API: `@/*` → `./src/*`, `@modules/*` → `./src/modules/*`
- Web: `@/*` → `./src/*`
- Both: `@farol/shared` → shared package

**Module Structure** (API):
```
modules/
└── feature-name/
    ├── controllers/       # HTTP handlers
    ├── services/          # Business logic
    ├── dto/
    │   ├── request/       # Input DTOs
    │   └── response/      # Output DTOs
    └── utils/             # Helper functions
```

**Component Structure** (Web):
```
src/
├── routes/                # TanStack Router (file-based)
├── components/            # UI components
│   ├── ui/                # shadcn/ui primitives
│   └── feature-name/      # Feature components
├── hooks/
│   └── queries/           # TanStack Query hooks
└── lib/
    ├── validations/       # Zod schemas
    └── api.ts             # API client
```

### Coding Standards

- **Language**: All code (functions, variables, comments, messages) in **English**
- **DTOs**: Separate request/response directories per module
- **Validation**: Zod schemas for API, class-validator for internal
- **Database**: Always run `pnpm db:generate` after Prisma schema changes
- **Type Safety**: Strict TypeScript, no `any`
- **Naming**: Descriptive, imperative for functions (`getUserById`, not `user`)

---

## 🤝 Contributing

Contributions welcome! Areas of interest:

- 🔍 **Data Sources**: Integrate CEIS, TCU, CNPJ data
- 📊 **Analytics**: Add new anomaly detection criteria
- 🎨 **UI/UX**: Improve visualizations and user experience
- 🧪 **Testing**: Increase test coverage
- 📖 **Documentation**: Improve guides and API docs
- 🌐 **i18n**: Internationalization support

### Development Workflow

1. **Fork & clone** the repository
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make changes**: Follow coding standards
4. **Test**: Run `pnpm test`, `pnpm lint`, `pnpm typecheck`
5. **Commit**: Use clear, imperative messages
   ```
   feat: add supplier network analysis
   fix: correct anomaly score calculation
   docs: update API documentation
   ```
6. **Push & PR**: Submit pull request with description

### Commit Message Format

```
<type>: <subject>

[optional body]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### PR Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No type errors (`pnpm typecheck`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Builds successfully (`pnpm build`)

---

## 🗺️ Roadmap

### Phase 1: Expanded Data Sources (Q1 2026)
- [ ] Integrate CEIS (Cadastro de Empresas Inidôneas)
- [ ] Connect TCU open data APIs
- [ ] Add CNPJ corporate network analysis
- [ ] Cross-reference supplier sanctions

### Phase 2: Advanced Analytics (Q2 2026)
- [ ] Supplier network visualization
- [ ] Temporal trend analysis
- [ ] Price prediction models
- [ ] Comparative benchmarking

### Phase 3: Community Features (Q3 2026)
- [ ] Public API with rate limiting
- [ ] Data export (CSV, JSON, Excel)
- [ ] Email alerts for flagged contracts
- [ ] User-submitted anomaly reports

### Phase 4: Institutional Integration (Q4 2026)
- [ ] Auditor dashboard with advanced filters
- [ ] Batch analysis tools
- [ ] White-label deployment option
- [ ] Integration with official oversight systems

---

## 🛠️ Technology Stack

### Backend
- **Framework**: [Hono](https://hono.dev/) - Ultra-fast edge runtime
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/) with OpenAPI generation
- **Storage**: S3-compatible (MinIO for local dev)
- **AI**: OpenAI GPT-4 / Anthropic Claude for summaries
- **Language**: TypeScript 5.9

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State**: [TanStack Query](https://tanstack.com/query)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) (Radix + Tailwind CSS)
- **Build**: [Vite 6](https://vite.dev/)

### DevOps
- **Monorepo**: pnpm workspaces
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions (planned)
- **Containers**: Docker + Docker Compose

---

## 🚀 Deployment

### Option 1: Vercel + Railway

**Frontend (Vercel)**:
```bash
vercel deploy --prod
```

**Backend (Railway)**:
1. Connect GitHub repository
2. Set environment variables
3. Deploy from `packages/api`

### Option 2: Fly.io

```bash
fly deploy --config packages/api/fly.toml
```

### Option 3: Docker

```bash
# Build
docker build -t farol-api -f packages/api/Dockerfile .
docker build -t farol-web -f packages/web/Dockerfile .

# Run
docker-compose up -d
```

### Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/farol

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Storage
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_BUCKET=farol-documents
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...

# Security
JWT_SECRET=...
API_RATE_LIMIT=100
```

---

## ❓ FAQ

**Q: How is user privacy handled?**
A: All data is public information from government sources (PNCP). We don't collect personal data from users.

**Q: What license is Farol under?**
A: GPL-3.0. You can use, modify, and distribute freely, but must open-source derivative works.

**Q: How often is data updated?**
A: Daily incremental updates. Full refresh weekly. Use `pnpm auto-update:start` for continuous updates.

**Q: Can I use Farol for commercial purposes?**
A: Yes, under GPL-3.0 terms. You must open-source any modifications.

**Q: Can I self-host Farol?**
A: Yes! See [Deployment](#-deployment) section. Requires PostgreSQL + Node.js.

**Q: How do I report security issues?**
A: Email security@farol.app (planned) or open a private GitHub advisory.

**Q: Why does AI summarization use paid APIs?**
A: Quality and reliability. We support both OpenAI and Anthropic. Local models (Ollama) planned.

---

## 📄 License & Credits

### License

Farol is licensed under **GPL-3.0**. See [LICENSE](LICENSE) for full text.

### Third-Party Licenses

- React: MIT
- Hono: MIT
- Prisma: Apache 2.0
- PostgreSQL: PostgreSQL License
- shadcn/ui: MIT
- TanStack: MIT

Full dependency licenses in `node_modules/*/LICENSE`.

### Data Sources

- **PNCP** (Plataforma Nacional de Contratações Públicas): Official Brazilian government procurement portal
- Contract data used under open data principles (Lei de Acesso à Informação - LAI)

### Acknowledgments

- Inspired by [Operação Serenata de Amor](https://serenata.ai/)
- Built with support from the Brazilian civic tech community

---

## 🔗 Resources

### Documentation
- [API Reference](docs/api/README.md) (planned)
- [Data Pipeline Guide](docs/pipeline/README.md) (planned)
- [Deployment Guide](docs/deployment/README.md) (planned)

### External Links
- [PNCP Portal](https://pncp.gov.br/)
- [Lei 14.133/2021](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm) (Brazilian procurement law)
- [TCU Open Data](https://portal.tcu.gov.br/dados-abertos/)

### Related Projects
- [Querido Diário](https://queridodiario.ok.org.br/) - Official gazette monitoring
- [Brasil.IO](https://brasil.io/) - Brazilian open datasets
- [Serenata de Amor](https://serenata.ai/) - Congressional expense auditing

---

<div align="center">

**Built with ❤️ for transparency and civic participation**

[Report Bug](https://github.com/luansievers/farol/issues) · [Request Feature](https://github.com/luansievers/farol/issues) · [Contribute](CONTRIBUTING.md)

</div>
