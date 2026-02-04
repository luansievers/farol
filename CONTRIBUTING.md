# Contributing to Farol

Thank you for your interest in contributing to Farol! This document provides guidelines and instructions for contributing to the project.

🌐 **Leia em:** [English](CONTRIBUTING.md) | [Português](CONTRIBUTING.pt-BR.md)

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Documentation Sync Rules](#documentation-sync-rules)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Areas for Contribution](#areas-for-contribution)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful, constructive, and professional in all interactions.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** >= 14
- **Git**

### Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/farol.git
   cd farol
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/luansievers/farol.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Setup environment**
   ```bash
   cp packages/api/.env.example packages/api/.env
   # Edit packages/api/.env with your configuration
   ```

6. **Setup database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

7. **Start development**
   ```bash
   pnpm dev:all
   ```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

### 2. Make Your Changes

Follow the [Coding Standards](#coding-standards) outlined below.

### 3. Test Your Changes

```bash
pnpm test          # Run tests
pnpm lint          # Check linting
pnpm typecheck     # Type checking
pnpm build         # Ensure build works
```

### 4. Commit Your Changes

Follow [Commit Message Guidelines](#commit-message-guidelines).

```bash
git add .
git commit -m "feat: add supplier network visualization"
```

### 5. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Coding Standards

### General Principles

- **Language**: ALL code (functions, variables, comments, messages, documentation) MUST be in **English**
- **Type Safety**: Use strict TypeScript, avoid `any`
- **Descriptive Names**: Use clear, descriptive names for functions and variables
- **Imperative Functions**: Function names should be imperative (`getUserById`, not `user`)
- **Simplicity**: Keep code simple and readable; avoid over-engineering

### File Organization

**API Module Structure**:
```
modules/
└── feature-name/
    ├── controllers/       # HTTP request handlers
    ├── services/          # Business logic
    ├── dto/
    │   ├── request/       # Input DTOs
    │   └── response/      # Output DTOs
    └── utils/             # Helper functions
```

**Web Component Structure**:
```
src/
├── routes/                # TanStack Router files (keep lean)
├── components/
│   ├── ui/                # shadcn/ui primitives
│   └── feature-name/      # Feature-specific components
├── hooks/
│   └── queries/           # TanStack Query hooks
└── lib/
    ├── validations/       # Zod schemas
    └── api.ts             # API client
```

### DTOs (Data Transfer Objects)

- **Separate** request and response DTOs in dedicated directories
- **Validation**: Use Zod for API validation, class-validator for internal
- **No Anonymous Types**: Always create named DTO classes, never use `Promise<{ message: string }>`
- **Minimal Responses**: Output DTOs should expose only necessary data

Example:
```typescript
// ✅ Good
export class CreateUserDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  createdAt: Date;
  // password field excluded
}

// ❌ Bad
Promise<{ message: string }>  // Anonymous type
Promise<User>                  // Exposes internal model
```

### Path Aliases

Use configured path aliases:
- API: `@/*`, `@modules/*`, `@shared/*`
- Web: `@/*`
- Both: `@farol/shared` (shared package)

### Database Changes

**After modifying Prisma schema**:
```bash
pnpm db:generate  # Generate Prisma client types
pnpm db:migrate   # Create migration
```

### React Components

- **Route files should be thin**: Import components, don't contain complex logic
- **Extract forms**: Move form logic to dedicated components in `components/[feature]/`
- **Callbacks as props**: Components receive `onSubmit`, `onSuccess` callbacks for testability
- **Centralize validations**: Zod schemas in `lib/validations/[feature].ts`

---

## Documentation Sync Rules

### Critical Rule: Bilingual READMEs

**When you modify `README.md`, you MUST also update `README.pt-BR.md`**

This ensures both English and Portuguese speakers have access to current documentation.

#### Process:

1. Make your changes to `README.md` in English
2. Translate the same changes to `README.pt-BR.md` in Portuguese
3. Maintain identical structure (headings, links, badges, code blocks)
4. Commit both files together

#### Sections Requiring Extra Care:

- **Mission & Problem Statement** - Reflect Brazilian civic context (PNCP, Lei 14.133/2021)
- **Feature Descriptions** - Use appropriate Brazilian legal terminology
- **FAQ** - Adapt questions for Brazilian audience (LGPD, local hosting)
- **External Links** - Verify links to PNCP, TCU, Brazilian legislation

#### Verification:

- [ ] Both READMEs updated
- [ ] Markdown structure identical
- [ ] All links work in both versions
- [ ] Technical terms correctly translated

---

## Commit Message Guidelines

### Format

```
<type>: <subject>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (neither fixes bug nor adds feature)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)

### Subject

- Use imperative mood ("add feature" not "added feature")
- No capitalization
- No period at the end
- Maximum 50 characters

### Body (optional)

- Wrap at 72 characters
- Explain **what** and **why**, not **how**

### Examples

```
feat: add supplier network visualization

Implement interactive graph showing connections between suppliers
and agencies using D3.js. Includes filtering by contract value and
date range.

Closes #123
```

```
fix: correct anomaly score calculation

Amendment frequency was incorrectly weighted. Updated algorithm
to match Lei 14.133/2021 specifications.
```

```
docs: add Portuguese README

- Create README.pt-BR.md (Portuguese version)
- Add language switcher badges to both READMEs
```

---

## Pull Request Process

### Before Submitting

Run the complete checklist:

```bash
pnpm test          # All tests pass
pnpm lint          # No linting errors
pnpm typecheck     # No type errors
pnpm build         # Builds successfully
```

### PR Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated for new functionality
- [ ] Documentation updated (including CLAUDE.md if relevant)
- [ ] No type errors (`pnpm typecheck`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Builds successfully (`pnpm build`)
- [ ] **If changed README.md, also updated README.pt-BR.md**
- [ ] Commit messages follow guidelines
- [ ] Branch is up-to-date with main

### PR Description Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #123

## How Has This Been Tested?
Describe tests performed.

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Builds successfully
- [ ] Documentation updated
- [ ] Both READMEs updated (if applicable)
```

### Review Process

1. At least one maintainer review required
2. All CI checks must pass
3. All review comments must be resolved
4. Branch must be up-to-date with main

---

## Testing

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Run in watch mode
pnpm test:coverage     # Generate coverage report
```

### Writing Tests

- Place test files next to source files: `feature.test.ts`
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies

Example:
```typescript
describe('calculateAnomalyScore', () => {
  it('should return high score for contracts with multiple risk factors', () => {
    // Arrange
    const contract = createMockContract({
      hasAmendments: true,
      isSingleBidder: true,
      isEmergency: true
    });

    // Act
    const score = calculateAnomalyScore(contract);

    // Assert
    expect(score).toBeGreaterThan(60);
  });
});
```

---

## Areas for Contribution

We welcome contributions in the following areas:

### 🔍 Data Sources
- Integrate CEIS (Cadastro de Empresas Inidôneas)
- Connect TCU open data APIs
- Add CNPJ corporate network analysis
- Cross-reference supplier sanctions

### 📊 Analytics
- Add new anomaly detection criteria
- Implement supplier network visualization
- Create temporal trend analysis
- Develop price prediction models

### 🎨 UI/UX
- Improve dashboard visualizations
- Enhance mobile responsiveness
- Add accessibility features (WCAG 2.1)
- Implement user preferences

### 🧪 Testing
- Increase unit test coverage
- Add integration tests
- Implement E2E tests
- Create performance tests

### 📖 Documentation
- Improve API documentation
- Create deployment guides
- Write tutorials and examples
- Translate documentation

### 🌐 Internationalization
- Add i18n support framework
- Translate UI strings
- Create language-specific content

### 🛠️ Infrastructure
- Optimize database queries
- Implement caching strategies
- Add monitoring and logging
- Improve CI/CD pipeline

---

## Questions?

- **General Questions**: Open a [Discussion](https://github.com/luansievers/farol/discussions)
- **Bug Reports**: Open an [Issue](https://github.com/luansievers/farol/issues)
- **Feature Requests**: Open an [Issue](https://github.com/luansievers/farol/issues) with "Feature Request" label

---

Thank you for contributing to Farol! Your efforts help make public procurement more transparent and accessible. 🔍✨
