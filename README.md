# Farol - Radar de Contratos

Infraestrutura civica que analisa automaticamente contratos publicos da Prefeitura de Sao Paulo, transformando documentos tecnicos em informacoes acessiveis.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start API (http://localhost:3000)
pnpm api:dev

# Start Frontend (http://localhost:5173)
pnpm dev:web

# Start both in parallel
pnpm dev:all
```

## Project Structure

Monorepo with pnpm workspaces:

```
farol/
├── packages/
│   ├── api/           # Backend Node.js (Hono + Prisma)
│   │   ├── src/
│   │   │   └── modules/
│   │   │       ├── api/        # REST API endpoints
│   │   │       ├── crawler/    # PNCP data crawler
│   │   │       ├── parser/     # PDF parsing
│   │   │       ├── summary/    # AI summaries
│   │   │       ├── classification/  # Contract categorization
│   │   │       └── anomalies/  # Anomaly scoring
│   │   └── prisma/
│   ├── web/           # Frontend React (Vite + TanStack)
│   │   └── src/
│   │       ├── components/
│   │       ├── routes/
│   │       └── hooks/
│   └── shared/        # Shared types (DTOs, enums)
│       └── src/
│           ├── dto/
│           └── enums/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL

## Scripts

### Development

```bash
pnpm dev          # Start API
pnpm dev:web      # Start Frontend
pnpm dev:all      # Start both
```

### Build & Test

```bash
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm typecheck    # Type check all packages
pnpm lint         # Lint all packages
```

### Database

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed database
```

### Data Pipeline

```bash
pnpm crawler      # Fetch contracts from PNCP
pnpm detail       # Fetch contract details
pnpm parser       # Parse PDF documents
pnpm summary      # Generate AI summaries
pnpm classify     # Categorize contracts
pnpm anomaly      # Calculate anomaly scores
```

## API

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/contracts` | List contracts with filters |
| `GET /api/contracts/{id}` | Get contract details |
| `GET /api/contracts/{id}/similar` | Get similar contracts |
| `GET /api/contracts/{id}/amendments` | Get amendments |
| `GET /api/suppliers` | List suppliers |
| `GET /api/suppliers/{id}` | Get supplier details |
| `GET /api/agencies` | List agencies |
| `GET /api/agencies/{id}` | Get agency details |
| `GET /api/search` | Full-text search |
| `GET /api/search/autocomplete` | Search suggestions |

### Examples

```bash
# List contracts with filters
curl "http://localhost:3000/api/contracts?category=OBRAS&minScore=50"

# Search
curl "http://localhost:3000/api/search?q=limpeza"

# Get contract details
curl "http://localhost:3000/api/contracts/{id}"
```

### Documentation

- Swagger UI: http://localhost:3000/api/docs
- OpenAPI: http://localhost:3000/api/docs/openapi.json

### Anomaly Scores

Contracts include AI-generated anomaly scores (0-100):

| Criterion | Description |
|-----------|-------------|
| value | Unusual value vs. category average |
| amendment | Excessive modifications |
| concentration | Supplier concentration risk |
| duration | Unusual contract duration |

Categories: LOW (0-33), MEDIUM (34-66), HIGH (67-100)

## Environment

Create `packages/api/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/farol
ANTHROPIC_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
```

## License

ISC
