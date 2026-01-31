# Farol - Radar de Contratos

Infraestrutura civica que analisa automaticamente contratos publicos da Prefeitura de Sao Paulo, transformando documentos tecnicos em informacoes acessiveis.

## API Quick Start

### Running the API

```bash
# Install dependencies
pnpm install

# Start the API server (development)
pnpm api:dev

# The API will be available at http://localhost:3000
# Swagger UI docs: http://localhost:3000/api/docs
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/contracts` | List contracts with filters |
| `GET /api/contracts/{id}` | Get contract details |
| `GET /api/contracts/{id}/similar` | Get similar contracts for benchmarking |
| `GET /api/contracts/{id}/amendments` | Get contract amendments |
| `GET /api/suppliers` | List suppliers |
| `GET /api/suppliers/{id}` | Get supplier details |
| `GET /api/agencies` | List government agencies |
| `GET /api/agencies/{id}` | Get agency details |
| `GET /api/search` | Full-text search |
| `GET /api/search/autocomplete` | Quick search suggestions |

### Example Requests

**List contracts with filters:**
```bash
curl "http://localhost:3000/api/contracts?category=OBRAS&minScore=50&pageSize=10"
```

**Search for contracts:**
```bash
curl "http://localhost:3000/api/search?q=limpeza&types=contract,supplier"
```

**Get contract details:**
```bash
curl "http://localhost:3000/api/contracts/{id}"
```

### Response Format

All list endpoints return paginated responses:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Anomaly Scores

Contracts include AI-generated anomaly scores (0-100) across 4 criteria:
- **value**: Unusual contract value vs. category average
- **amendment**: Excessive amendments/modifications
- **concentration**: Supplier concentration risk
- **duration**: Unusual contract duration

Categories: LOW (0-33), MEDIUM (34-66), HIGH (67-100)

### Interactive Documentation

Full API documentation with request/response examples is available at:
- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs/openapi.json

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
├── modules/
│   └── api/           # REST API module
│       ├── server.ts  # API server setup
│       ├── contracts/ # Contracts endpoints
│       ├── suppliers/ # Suppliers endpoints
│       ├── agencies/  # Agencies endpoints
│       └── search/    # Search endpoints
└── shared/
    ├── config/        # Configuration
    ├── types/         # Shared type definitions
    └── utils/         # Utility functions
```

## License

ISC
