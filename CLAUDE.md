# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Farol is a civic infrastructure platform that analyzes public contracts from PNCP (São Paulo city government). It transforms technical documents into accessible information using AI-powered analysis, summaries, and anomaly detection.

## Commands

### Development
```bash
pnpm dev:all          # Start API + web in parallel
pnpm api:dev          # API only (http://localhost:3000)
pnpm dev:web          # Web only (http://localhost:5173)
```

### Build & Quality
```bash
pnpm build            # Build all (shared → api → web)
pnpm test             # Run vitest tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
```

### Database
```bash
pnpm db:generate      # Generate Prisma client (run after schema changes)
pnpm db:migrate       # Create/run migrations
pnpm db:studio        # Prisma Studio UI
pnpm db:seed          # Seed database
```

### Data Pipeline (ETL)
```bash
pnpm crawler          # Fetch contracts from PNCP
pnpm detail           # Fetch contract details
pnpm parser           # Parse PDFs (with OCR via tesseract.js)
pnpm summary          # Generate AI summaries
pnpm classify         # Categorize contracts
pnpm anomaly          # Calculate anomaly scores
```
Each pipeline command supports `:batch`, `:stats`, `:reset` variants.

## Architecture

### Monorepo Structure (pnpm workspaces)
```
packages/
├── api/           # Hono + Prisma backend
├── web/           # React + Vite + TanStack Router/Query
└── shared/        # DTOs and enums (shared types)
```

### API Module Organization (`packages/api/src/modules/`)
- `api/` - REST endpoints (contracts/, suppliers/, agencies/, search/)
- `crawler/` - PNCP data fetching
- `parser/` - PDF text extraction
- `summary/` - AI summary generation
- `classification/` - Contract categorization
- `anomalies/` - Risk score calculation
- `database/` - Prisma client singleton
- `storage/` - S3/MinIO file management
- `ai/` - LLM utilities

### Path Aliases
- API: `@/*` → `./src/*`, `@modules/*` → `./src/modules/*`, `@shared/*` → `./src/shared/*`
- Web: `@/*` → `./src/*`
- Both: `@farol/shared` → shared package

### Database
- PostgreSQL with Prisma ORM
- Schema: `packages/api/prisma/schema.prisma`
- Generated types: `packages/api/src/generated/prisma`
- Models: Agency, Supplier, Contract, Amendment, AnomalyScore
- Enums: ContractCategory, ContractStatus, ProcessingStatus

### Frontend Patterns
- File-based routing with TanStack Router (`routes/`)
- Server state with TanStack Query (`hooks/queries/`)
- UI components: shadcn/ui pattern (Radix + Tailwind)
- Route files should be thin; extract forms/logic to `components/`

## Environment Setup

Copy `packages/api/.env.example` to `packages/api/.env`:
- `DATABASE_URL` - PostgreSQL connection
- `STORAGE_*` - S3/MinIO config
- `AI_PROVIDER` - "openai" or "anthropic"
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

Docker: `docker-compose up -d` starts PostgreSQL + MinIO.

## Key Conventions

- All code in English (functions, variables, comments, messages)
- DTOs: Separate request/response directories per module
- After Prisma schema changes: run `pnpm db:generate`
- TypeORM pattern: create entities first, then generate migrations
- API uses Hono with Zod OpenAPI for validation and docs
