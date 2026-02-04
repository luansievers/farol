# Contribuindo para o Farol

Obrigado pelo seu interesse em contribuir para o Farol! Este documento fornece diretrizes e instruções para contribuir com o projeto.

🌐 **Leia em:** [English](CONTRIBUTING.md) | [Português](CONTRIBUTING.pt-BR.md)

---

## Índice

- [Código de Conduta](#código-de-conduta)
- [Primeiros Passos](#primeiros-passos)
- [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Regras de Sincronização de Documentação](#regras-de-sincronização-de-documentação)
- [Diretrizes de Mensagens de Commit](#diretrizes-de-mensagens-de-commit)
- [Processo de Pull Request](#processo-de-pull-request)
- [Testes](#testes)
- [Áreas para Contribuição](#áreas-para-contribuição)

---

## Código de Conduta

Estamos comprometidos em fornecer um ambiente acolhedor e inclusivo. Por favor, seja respeitoso, construtivo e profissional em todas as interações.

---

## Primeiros Passos

### Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** >= 14
- **Git**

### Configuração

1. **Faça fork do repositório** no GitHub
2. **Clone seu fork**
   ```bash
   git clone https://github.com/SEU_USUARIO/farol.git
   cd farol
   ```

3. **Adicione o remote upstream**
   ```bash
   git remote add upstream https://github.com/luansievers/farol.git
   ```

4. **Instale as dependências**
   ```bash
   pnpm install
   ```

5. **Configure o ambiente**
   ```bash
   cp packages/api/.env.example packages/api/.env
   # Edite packages/api/.env com suas configurações
   ```

6. **Configure o banco de dados**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

7. **Inicie o desenvolvimento**
   ```bash
   pnpm dev:all
   ```

---

## Workflow de Desenvolvimento

### 1. Crie uma Branch

```bash
git checkout -b feature/nome-da-sua-funcionalidade
```

Convenções de nomenclatura de branches:
- `feature/` - Novas funcionalidades
- `fix/` - Correções de bugs
- `docs/` - Mudanças na documentação
- `refactor/` - Refatoração de código
- `test/` - Adição/atualização de testes
- `chore/` - Tarefas de manutenção

### 2. Faça Suas Mudanças

Siga os [Padrões de Código](#padrões-de-código) descritos abaixo.

### 3. Teste Suas Mudanças

```bash
pnpm test          # Executar testes
pnpm lint          # Verificar linting
pnpm typecheck     # Verificação de tipos
pnpm build         # Garantir que o build funciona
```

### 4. Faça Commit das Suas Mudanças

Siga as [Diretrizes de Mensagens de Commit](#diretrizes-de-mensagens-de-commit).

```bash
git add .
git commit -m "feat: add supplier network visualization"
```

### 5. Mantenha Sua Branch Atualizada

```bash
git fetch upstream
git rebase upstream/main
```

### 6. Push e Crie PR

```bash
git push origin feature/nome-da-sua-funcionalidade
```

Então crie um Pull Request no GitHub.

---

## Padrões de Código

### Princípios Gerais

- **Idioma**: TODO código (funções, variáveis, comentários, mensagens, documentação) DEVE estar em **Inglês**
- **Type Safety**: Use TypeScript estrito, evite `any`
- **Nomes Descritivos**: Use nomes claros e descritivos para funções e variáveis
- **Funções Imperativas**: Nomes de funções devem ser imperativos (`getUserById`, não `user`)
- **Simplicidade**: Mantenha o código simples e legível; evite over-engineering

### Organização de Arquivos

**Estrutura de Módulos da API**:
```
modules/
└── nome-funcionalidade/
    ├── controllers/       # Handlers de requisições HTTP
    ├── services/          # Lógica de negócio
    ├── dto/
    │   ├── request/       # DTOs de entrada
    │   └── response/      # DTOs de saída
    └── utils/             # Funções auxiliares
```

**Estrutura de Componentes Web**:
```
src/
├── routes/                # Arquivos TanStack Router (manter leves)
├── components/
│   ├── ui/                # Primitivos shadcn/ui
│   └── nome-funcionalidade/      # Componentes específicos
├── hooks/
│   └── queries/           # Hooks TanStack Query
└── lib/
    ├── validations/       # Schemas Zod
    └── api.ts             # Cliente API
```

### DTOs (Data Transfer Objects)

- **Separe** DTOs de request e response em diretórios dedicados
- **Validação**: Use Zod para validação de API, class-validator para interno
- **Sem Tipos Anônimos**: Sempre crie classes DTO nomeadas, nunca use `Promise<{ message: string }>`
- **Respostas Mínimas**: DTOs de saída devem expor apenas dados necessários

Exemplo:
```typescript
// ✅ Bom
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
  // campo password excluído
}

// ❌ Ruim
Promise<{ message: string }>  // Tipo anônimo
Promise<User>                  // Expõe modelo interno
```

### Path Aliases

Use aliases de path configurados:
- API: `@/*`, `@modules/*`, `@shared/*`
- Web: `@/*`
- Ambos: `@farol/shared` (pacote shared)

### Mudanças no Banco de Dados

**Após modificar o schema Prisma**:
```bash
pnpm db:generate  # Gerar tipos do cliente Prisma
pnpm db:migrate   # Criar migration
```

### Componentes React

- **Arquivos de rota devem ser leves**: Importar componentes, não conter lógica complexa
- **Extrair formulários**: Mover lógica de formulário para componentes dedicados em `components/[feature]/`
- **Callbacks como props**: Componentes recebem callbacks `onSubmit`, `onSuccess` para testabilidade
- **Centralizar validações**: Schemas Zod em `lib/validations/[feature].ts`

---

## Regras de Sincronização de Documentação

### Regra Crítica: READMEs Bilíngues

**Quando você modificar `README.md`, você DEVE também atualizar `README.pt-BR.md`**

Isso garante que falantes de inglês e português tenham acesso à documentação atual.

#### Processo:

1. Faça suas mudanças em `README.md` em inglês
2. Traduza as mesmas mudanças para `README.pt-BR.md` em português
3. Mantenha estrutura idêntica (títulos, links, badges, blocos de código)
4. Faça commit de ambos os arquivos juntos

#### Seções Requerendo Cuidado Extra:

- **Missão & Problema** - Refletir contexto cívico brasileiro (PNCP, Lei 14.133/2021)
- **Descrições de Funcionalidades** - Usar terminologia legal brasileira apropriada
- **FAQ** - Adaptar perguntas para público brasileiro (LGPD, hospedagem local)
- **Links Externos** - Verificar links para PNCP, TCU, legislação brasileira

#### Verificação:

- [ ] Ambos READMEs atualizados
- [ ] Estrutura markdown idêntica
- [ ] Todos os links funcionam em ambas versões
- [ ] Termos técnicos corretamente traduzidos

---

## Diretrizes de Mensagens de Commit

### Formato

```
<tipo>: <assunto>

[corpo opcional]

[rodapé opcional]
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças apenas na documentação
- `style`: Mudanças de estilo de código (formatação, ponto-e-vírgula faltando, etc.)
- `refactor`: Refatoração de código (nem corrige bug nem adiciona funcionalidade)
- `test`: Adição ou atualização de testes
- `chore`: Tarefas de manutenção (dependências, configuração de build, etc.)

### Assunto

- Use modo imperativo ("add feature" não "added feature")
- Sem capitalização
- Sem ponto no final
- Máximo 50 caracteres

### Corpo (opcional)

- Quebrar em 72 caracteres
- Explicar **o quê** e **por quê**, não **como**

### Exemplos

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

## Processo de Pull Request

### Antes de Submeter

Execute o checklist completo:

```bash
pnpm test          # Todos os testes passam
pnpm lint          # Sem erros de linting
pnpm typecheck     # Sem erros de tipo
pnpm build         # Build com sucesso
```

### Checklist de PR

- [ ] Código segue convenções do projeto
- [ ] Testes adicionados/atualizados para nova funcionalidade
- [ ] Documentação atualizada (incluindo CLAUDE.md se relevante)
- [ ] Sem erros de tipo (`pnpm typecheck`)
- [ ] Sem erros de linting (`pnpm lint`)
- [ ] Build com sucesso (`pnpm build`)
- [ ] **Se alterou README.md, também atualizou README.pt-BR.md**
- [ ] Mensagens de commit seguem diretrizes
- [ ] Branch está atualizada com main

### Template de Descrição de PR

```markdown
## Descrição
Breve descrição das mudanças.

## Tipo de Mudança
- [ ] Correção de bug
- [ ] Nova funcionalidade
- [ ] Mudança breaking
- [ ] Atualização de documentação

## Issue Relacionada
Closes #123

## Como Foi Testado?
Descreva testes realizados.

## Screenshots (se aplicável)
[Adicionar screenshots]

## Checklist
- [ ] Testes passam
- [ ] Linting passa
- [ ] Verificação de tipos passa
- [ ] Build com sucesso
- [ ] Documentação atualizada
- [ ] Ambos READMEs atualizados (se aplicável)
```

### Processo de Review

1. Review de pelo menos um maintainer necessária
2. Todas as verificações de CI devem passar
3. Todos os comentários de review devem ser resolvidos
4. Branch deve estar atualizada com main

---

## Testes

### Executando Testes

```bash
pnpm test              # Executar todos os testes
pnpm test:watch        # Executar em modo watch
pnpm test:coverage     # Gerar relatório de cobertura
```

### Escrevendo Testes

- Colocar arquivos de teste ao lado dos arquivos fonte: `feature.test.ts`
- Usar nomes de testes descritivos
- Seguir padrão AAA: Arrange, Act, Assert
- Mockar dependências externas

Exemplo:
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

## Áreas para Contribuição

Damos boas-vindas a contribuições nas seguintes áreas:

### 🔍 Fontes de Dados
- Integrar CEIS (Cadastro de Empresas Inidôneas)
- Conectar APIs de dados abertos do TCU
- Adicionar análise de rede corporativa CNPJ
- Cruzar referências de sanções a fornecedores

### 📊 Analytics
- Adicionar novos critérios de detecção de anomalias
- Implementar visualização de rede de fornecedores
- Criar análise de tendências temporais
- Desenvolver modelos de previsão de preços

### 🎨 UI/UX
- Melhorar visualizações do dashboard
- Aprimorar responsividade mobile
- Adicionar recursos de acessibilidade (WCAG 2.1)
- Implementar preferências de usuário

### 🧪 Testes
- Aumentar cobertura de testes unitários
- Adicionar testes de integração
- Implementar testes E2E
- Criar testes de performance

### 📖 Documentação
- Melhorar documentação da API
- Criar guias de deployment
- Escrever tutoriais e exemplos
- Traduzir documentação

### 🌐 Internacionalização
- Adicionar framework de suporte i18n
- Traduzir strings da UI
- Criar conteúdo específico por idioma

### 🛠️ Infraestrutura
- Otimizar queries do banco de dados
- Implementar estratégias de caching
- Adicionar monitoramento e logging
- Melhorar pipeline de CI/CD

---

## Dúvidas?

- **Perguntas Gerais**: Abra uma [Discussion](https://github.com/luansievers/farol/discussions)
- **Reportar Bugs**: Abra uma [Issue](https://github.com/luansievers/farol/issues)
- **Solicitar Funcionalidades**: Abra uma [Issue](https://github.com/luansievers/farol/issues) com label "Feature Request"

---

Obrigado por contribuir com o Farol! Seus esforços ajudam a tornar as contratações públicas mais transparentes e acessíveis. 🔍✨
