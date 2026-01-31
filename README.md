# Farol - Radar de Contratos

Infraestrutura civica que analisa automaticamente contratos publicos da Prefeitura de Sao Paulo, transformando documentos tecnicos em informacoes acessiveis.

## Prerequisites

- Node.js >= 20
- pnpm >= 10

## Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix  # auto-fix

# Formatting
pnpm format:check
pnpm format

# Build for production
pnpm build

# Run production build
pnpm start
```

## Project Structure

```
src/
├── index.ts           # Application entry point
├── modules/           # Feature modules
└── shared/
    ├── config/        # Configuration
    ├── types/         # Shared type definitions
    └── utils/         # Utility functions
```

## License

ISC
