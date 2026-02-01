# Farol - Radar de Contratos Públicos

## O que é o Farol?

O Farol é uma plataforma de infraestrutura cívica que analisa contratos públicos do PNCP (Portal Nacional de Contratações Públicas). A ferramenta transforma documentos técnicos em informações acessíveis usando análise com inteligência artificial, geração de resumos e detecção de anomalias.

**Objetivo**: Aumentar a transparência e facilitar a fiscalização de gastos públicos por jornalistas, pesquisadores e cidadãos.

---

## Funcionalidades Principais

### 1. Dashboard com Visão Geral

O painel principal apresenta os indicadores-chave (KPIs) da base de dados:
- Total de contratos monitorados
- Contratos com score de anomalia elevado
- Quantidade de fornecedores e órgãos públicos
- Lista dos contratos mais recentes

![Dashboard](screenshots/01-dashboard.png)

---

### 2. Busca e Filtros de Contratos

A listagem de contratos oferece filtros avançados para investigação:
- **Categoria**: Obras, Serviços, Tecnologia, Saúde, Educação, Outros
- **Órgão**: Filtro por entidade contratante
- **Fornecedor**: Filtro por empresa contratada
- **Período**: Intervalo de datas
- **Score de Anomalia**: Filtro por nível de risco
- **Ordenação**: Por valor, data ou score

![Lista de Contratos](screenshots/02-contratos-lista.png)

---

### 3. Análise de Anomalias com IA

Cada contrato recebe um score de anomalia (0-100) calculado por inteligência artificial com base em 4 critérios:

| Critério | Descrição |
|----------|-----------|
| **Valor** | Compara com a média de contratos similares do período |
| **Duração** | Analisa se o prazo é atípico para a categoria |
| **Aditivos** | Avalia quantidade e proporção de aditivos |
| **Concentração** | Verifica se o fornecedor tem participação excessiva em um órgão |

![Análise de Anomalia](screenshots/04-contrato-anomalia.png)

O breakdown mostra exatamente quais critérios contribuíram para o score, com explicações detalhadas.

---

### 4. Resumos Gerados por IA

Para cada contrato, a plataforma gera automaticamente um resumo em linguagem acessível, extraído do texto original do documento (geralmente um PDF).

O sistema usa OCR (reconhecimento óptico de caracteres) para extrair texto de documentos escaneados e IA para gerar resumos concisos.

![Detalhe do Contrato](screenshots/03-contrato-detalhe.png)

A página de detalhe também mostra:
- Dados completos do contrato (valor, vigência, modalidade)
- Partes envolvidas (órgão e fornecedor)
- Comparação com contratos similares
- Link direto para o documento original no PNCP

---

### 5. Análise de Fornecedores

A plataforma permite investigar fornecedores individualmente:
- Histórico de contratos com o poder público
- Volume total de contratos e valores
- Score médio de anomalia
- Gráfico de evolução anual
- Indicador de concentração (% de contratos em um único órgão)

![Análise de Fornecedor](screenshots/06-fornecedor-detalhe.png)

---

### 6. Análise de Órgãos Públicos

De forma similar, é possível analisar órgãos públicos:
- Total de contratos firmados
- Volume financeiro movimentado
- Principais fornecedores
- Concentração de fornecedores
- Evolução temporal

![Análise de Órgão](screenshots/07-orgao-detalhe.png)

---

### 7. Busca Global Inteligente

A busca global (atalho: `Cmd+K` ou `Ctrl+K`) permite encontrar rapidamente:
- Contratos por texto do objeto
- Fornecedores por nome ou CNPJ
- Órgãos por nome

Os resultados aparecem agrupados por tipo em tempo real.

![Busca Global](screenshots/05-busca-global.png)

---

### 8. Modo Escuro

A interface suporta modo claro, escuro e automático (baseado no sistema operacional).

![Modo Escuro](screenshots/08-dark-mode.png)

---

## Dados e Metodologia

### Fonte de Dados

- **Portal**: PNCP (Portal Nacional de Contratações Públicas)
- **URL**: https://pncp.gov.br
- **Escopo atual**: Contratos de órgãos públicos brasileiros

### Pipeline de Dados

1. **Crawler**: Coleta metadados de contratos via API do PNCP
2. **Detalhamento**: Busca informações complementares de cada contrato
3. **Parser**: Extrai texto de PDFs (com OCR para documentos escaneados)
4. **Resumo**: Gera resumos via IA (GPT ou Claude)
5. **Classificação**: Categoriza contratos por área
6. **Anomalias**: Calcula scores de risco

### Critérios de Anomalia

Os scores são calculados estatisticamente:

- **Valor atípico**: Quando o valor está acima de 2 desvios-padrão da média de contratos similares
- **Duração atípica**: Quando o prazo difere significativamente da média da categoria
- **Aditivos excessivos**: Quando o volume de aditivos é anormalmente alto
- **Concentração**: Quando um fornecedor tem mais de 50% dos contratos de um órgão

Cada critério contribui com até 25 pontos para o score total (máximo 100).

---

## Informações Técnicas

- **Frontend**: React com TanStack Router/Query
- **Backend**: Hono (Node.js) com Prisma ORM
- **Banco de dados**: PostgreSQL
- **IA**: Suporte a OpenAI e Anthropic
- **OCR**: tesseract.js para PDFs escaneados

---

## Contato

Para mais informações sobre o projeto Farol, entre em contato.

---

*Documentação gerada em janeiro de 2026*
