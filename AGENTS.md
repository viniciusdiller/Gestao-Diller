<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diller-Hub (Sistema de Gestão Integrada Multi-Workspace)

## 1. Visão Geral do Projeto
Hub de gestão unificada de negócios familiares sob a marca **Diller-Hub**, projetado mobile-first para controle operacional e financeiro:
1. **Renata Diller — Semijoias**: Vendas, clientes, cobranças via WhatsApp e controle de fiado/parcelamento.
2. **Casa Itaúna — Saquarema**: Controle de reservas de temporada, calendário estilo Airbnb, vacância, comissões de plataformas (Airbnb 16%), despesa de faxina fixa (R$ 180) e comissão local da Dani (20%).

- **Logo Oficial**: `/public/diller.jpg`
- **Operação**: 100% Mobile-first com seletor fluido de workspaces no Header, Bottom Navigation Bar persistente, touch targets amplos (>= 44px) e feedback tátil/visual imediato.

---

## 2. Stack Tecnológica
- **Framework Web**: Next.js 16 (App Router), React 19, TypeScript
- **Estilização**: Tailwind CSS v4, Lucide React (ícones minimalistas)
- **Banco de Dados & Autenticação**: Supabase (PostgreSQL + Auth + Row Level Security - RLS)
- **Validação de Boundaries**: Zod (Zero-Trust no Backend e Server Actions)
- **Testes Unitários**: Vitest (Regras de negócio, cálculo de parcelas, métricas financeiras e sanitização)
- **Deploy**: Vercel CLI (`renata-diller-semijoias`)

---

## 3. Arquitetura do Banco de Dados (Supabase)

### 3.1 Tabelas e Relacionamentos
1. **`clients`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
   - `name TEXT NOT NULL`
   - `phone TEXT NOT NULL` (armazenado com DDI/DDD limpo para link wa.me)
   - `notes TEXT`
   - `created_at / updated_at TIMESTAMPTZ`

2. **`sales`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
   - `client_id UUID REFERENCES clients(id) ON DELETE CASCADE`
   - `description TEXT NOT NULL` (ex.: "Conjunto ouro 18k e brinco ponto de luz")
   - `total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0)`
   - `payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'fiado'))`
   - `status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled'))`
   - `sale_date TIMESTAMPTZ NOT NULL DEFAULT now()`

3. **`installments`** (Fiado e Parcelamento):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
   - `sale_id UUID REFERENCES sales(id) ON DELETE CASCADE`
   - `client_id UUID REFERENCES clients(id) ON DELETE CASCADE`
   - `installment_number INT NOT NULL`
   - `total_installments INT NOT NULL`
   - `amount NUMERIC(10, 2) NOT NULL`
   - `due_date DATE NOT NULL`
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled'))`
   - `paid_at TIMESTAMPTZ`
   - `paid_amount NUMERIC(10, 2)`

### 3.2 Segurança e RLS
- RLS estritamente habilitado em todas as tabelas.
- Políticas garantem que `auth.uid() = user_id` para todas as operações (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- Sem vazamento de dados entre usuários ou tenants.

---

## 4. Módulos do Sistema

### 4.1 Autenticação & Sessão Persistente
- Tela de login mobile limpa com logo em destaque.
- Supabase Auth com persistência via cookies seguros (`@supabase/ssr`).
- Sessão de longa duração ("Login eterno") configurada para a proprietária não precisar redigitar senha constantemente no celular.

### 4.2 Dashboard (Visão Geral Financeira)
- **Cards de KPIs Compactos**:
  - Faturamento do Mês atual (vendas pagas/concluídas)
  - Total a Receber (soma de parcelas em aberto e atrasadas)
  - Vendas Realizadas (quantidade no mês)
  - Total em Atraso (inadimplência imediata)
- **Gráfico Mensal**: Histórico visual simples de faturamento nos últimos 6 meses.
- **Top 3 Clientes do Mês**: Ranking com nome, quantidade de compras e valor total gasto.
- **Alertas de Ação Imediata**:
  - Parcelas Vencidas (vermelho com atalho para cobrar no WhatsApp)
  - Parcelas a vencer nos próximos 7 dias (âmbar)

### 4.3 Gestão de Clientes
- Cadastro ágil com foco em teclado numérico no telefone.
- Lista com busca instantânea por nome ou telefone.
- Perfil do cliente com:
  - Total gasto na loja e ticket médio.
  - Meio de pagamento preferido.
  - Saldo devedor atual (se houver fiado em aberto).
  - Histórico cronológico de compras e parcelas.
  - Botão de ação direta para abrir conversa no WhatsApp.

### 4.4 Registro de Vendas & Lógica de Parcelas
- Seleção de cliente facilitada ou cadastro rápido inline.
- Campo de valor monetário com formatação automática em R$.
- Descrição das peças vendidas.
- Seleção da forma de pagamento:
  - Se for à vista (`pix`, `dinheiro`, `cartao_debito`), registra venda como concluída imediatamente.
  - Se for `fiado` ou parcelado, ativa seletor de parcelas e datas de vencimento flexíveis (mensal, quinzenal, semanal ou personalizada).
  - Cálculo de divisão de centavos exato (última parcela absorve resíduo de arredondamento).

### 4.5 Gestão de Cobranças (Régua de Cobrança)
- Tela com abas rápidas:
  - **Vencidos**: Parcelas com `due_date < hoje` e status pendente.
  - **Vence Hoje**: Parcelas com `due_date = hoje`.
  - **Próximos 7 Dias**: Parcelas a vencer na semana.
  - **Pagas**: Histórico de baixas.
- Card de parcela com:
  - Nome do cliente, valor, data de vencimento e dias de atraso/restantes.
  - Botão de Baixa rápida (Marcar como Paga).
  - Botão de Cobrança no WhatsApp:
    - Link `wa.me/55[telefone]?text=[mensagem]`.
    - Mensagem amigável e educada pronta, sem precisar digitar:
      `Oi [Nome], tudo bem? Passando pra lembrar do vencimento da sua parcela de R$ [Valor] com a Renata Semijoias no dia [Data]. Qualquer dúvida estou por aqui! ✨`

---

## 5. Diretrizes de Qualidade, Testes e Pipeline Git

### 5.1 Regras de Versionamento (Git)
- **Blindagem da Main**: NUNCA commitar ou dar push na branch `main`. Todo o desenvolvimento é feito na branch `feat/gestao-semijoias`.
- **Commits Fatiados por Camada**:
  1. `feat(db)`: Migrations e schemas SQL.
  2. `feat(api)`: Serviços, validações Zod e regras de negócio.
  3. `feat(frontend)`: Telas, layouts e componentes mobile.
  4. `test(...)`: Suíte de testes unitários.
- **Ordem de Pipeline**:
  `1. Testes Unitários 100% verdes` -> `2. Build / Typecheck sem erros` -> `3. Commit atômico`.

### 5.2 Testes Unitários Obrigatórios
- Teste do gerador de parcelas e centavos (`splitInstallments`).
- Teste do validador de telefone brasileiro para WhatsApp (`formatWhatsAppNumber`).
- Teste dos cálculos de KPIs do Dashboard (faturamento, a receber, vencidos).
- Teste dos filtros da régua de cobrança (Vencido, Hoje, Próximos 7 dias).
- Teste dos schemas de validação Zod.

---

## 6. Checklist de Execução & Roadmap
- [x] **Etapa 1**: Inicialização do Next.js 16 + Tailwind CSS + Lucide React + Vitest
- [x] **Etapa 2**: Definição da migration SQL e políticas RLS (`supabase/migrations/20261102_initial_schema.sql`)
- [x] **Etapa 3**: Conexão e aplicação da migration no banco Supabase
- [x] **Etapa 4**: Implementação dos Utilitários de Negócio e Validações Zod
- [x] **Etapa 5**: Criação da Suíte de Testes Unitários (Vitest) e validação 100% verde (24 testes aprovados)
- [x] **Etapa 6**: Configuração de Autenticação Supabase e Middleware com Sessão Persistente
- [x] **Etapa 7**: Construção dos Componentes de UI Mobile-First e Bottom Navigation Bar
- [x] **Etapa 8**: Implementação da Tela de Login e Layout Autenticado
- [x] **Etapa 9**: Implementação do Módulo de Clientes (Cadastro, Lista e Perfil)
- [x] **Etapa 10**: Implementação do Módulo de Registro de Vendas e Parcelamento
- [x] **Etapa 11**: Implementação do Módulo de Cobranças com Integração WhatsApp
- [x] **Etapa 12**: Implementação do Dashboard Mobile (KPIs, Gráficos, Ranking, Alertas)
- [x] **Etapa 13**: Execução da Pipeline Pré-Commit (Testes + Typecheck + Build de Produção)
- [x] **Etapa 14**: Deploy na Vercel CLI com o nome `renata-diller-semijoias` (https://renata-diller-semijoias.vercel.app)
- [ ] **Etapa 15**: Validação final de ponta a ponta e entrega ao usuário
