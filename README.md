# 📊 Dashboard Basic Victor — Gestão Financeira Pessoal & Acordo Familiar

Aplicação web moderna, segura e responsiva de Gestão Financeira Pessoal construída em **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** e **Recharts**, integrada diretamente à API do Google Sheets (`googleapis` via Google Service Account) com tela de login protegida por senha (`APP_PASSWORD`).

---

## 🌟 Funcionalidades e Regras de Negócio Integradas

### 1. Fonte de Dados (6 Abas do Google Sheets)
O dashboard lê de forma resiliente as 6 abas da planilha **Basic Victor** (`1y2HOD3PuJqpHhoR6j_hs8sweZ09lVX4PZHOptR-5W84`):
1. `Salario_V`: Contracheque, vantagens, consignados e projeções do Victor.
2. `Salario_L`: Contracheque, horas extras e projeções da Letícia.
3. `Gerenciador`: Fluxo de caixa geral de entradas e saídas com datas de vencimento.
4. `Poupança`: Reserva de emergência, metas (carro, IPVA) e compensações Difa Banrisul.
5. `Fatura_Sicredi`: Lançamentos do cartão Sicredi com parcelas e pagadores (`QUEM`).
6. `Fatura_01-11-2026` / `Fatura C6`: Lançamentos detalhados C6 Bank com parcelas e fechamento.

*Possui revalidação automática de cache, botão de sincronização manual ("Atualizar Dados") e fallback para snapshot offline caso as credenciais da Service Account ainda não tenham sido configuradas.*

---

### 2. Regras Financeiras Obrigatórias Implementadas
- **Regime de Competência / Caixa Antecipado:** O salário recebido no último dia útil do mês $N$ (ex: fim de outubro) provisiona as contas com vencimento no mês $N+1$ (ex: novembro).
- **Defasagem de Variáveis ($N-1$):** Horas-Extras (Letícia) e Substituição de Sargento (Victor) trabalhadas no mês $N-1$ são recebidas no contracheque do fim do mês $N$.
- **Regra das Diárias vs. Substituição (Victor):**
  - O valor da Substituição de Sgt (~R$ 1.903,00) cobre o desconto do acordo de empréstimo Banrisul (~R$ 1.562,01).
  - Nos meses de Operação Verão (sem substituição), o sistema desconta automaticamente a compensação (**"Difa"**) das diárias acumuladas na aba `Poupança`, mantendo o restante das diárias blindado fora do orçamento corrente.
- **Vale-Refeição / Alimentação (Dia 20):** Contabiliza a entrada no dia 20 de cada mês (~R$ 426,00 a R$ 450,00 por pessoa) como injeção de liquidez na 2ª quinzena. O dashboard exibe o saldo com e sem o VR.
- **Divisão de Despesas e Acerto Mensal:**
  - `LE` ou `leh`: 100% Letícia.
  - `VIC` ou `vic`: 100% Victor.
  - `DIV` ou `div`: 50% para cada.
  - O card de **Fechamento Individual** calcula automaticamente quem pagou o quê diretamente vs. sua cota devida e indica o valor exato da transferência de acerto (`Letícia deve transferir R$ X para Victor` ou vice-versa).
- **Trava da Reserva de Emergência:** Separa visualmente e matematicamente os **R$ 5.000,00** de Reserva Intocável do Saldo Livre Operacional para metas (veículo, reformas, IPVA).
- **Radar de Parcelas Futuras:** Detecta compras no padrão `Parcela X/Y` nas faturas e projeta nos gráficos o alívio de limite e caixa nos próximos meses conforme as parcelas vão se encerrando.

---

## 🚀 Guia de Configuração e Deploy

### Passo 1: Criar a Service Account no Google Cloud
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ou use um existente) chamado por exemplo `Dashboard-Victor`.
3. No menu lateral, acesse **APIs e Serviços** > **Biblioteca**.
4. Pesquise por **Google Sheets API** e clique em **Ativar**.
5. No menu lateral, acesse **IAM e administração** > **Contas de serviço** (Service Accounts).
6. Clique em **Criar Conta de Serviço**:
   - Nome: `sheets-reader`
   - ID: `sheets-reader`
   - Clique em **Criar e Continuar** e depois em **Concluir**.
7. Na lista de contas de serviço, clique sobre o e-mail criado (ex: `sheets-reader@dashboard-victor.iam.gserviceaccount.com`).
8. Vá na aba **Chaves** (Keys) > **Adicionar Chave** > **Criar nova chave** > Escolha o formato **JSON** e clique em **Criar**. O arquivo `.json` será baixado no seu computador.
9. **Compartilhar a Planilha**:
   - Abra a planilha `Basic Victor` no Google Sheets: `https://docs.google.com/spreadsheets/d/1y2HOD3PuJqpHhoR6j_hs8sweZ09lVX4PZHOptR-5W84/edit`
   - Clique no botão **Compartilhar** no canto superior direito.
   - Cole o e-mail da conta de serviço (`sheets-reader@...gserviceaccount.com`).
   - Defina a permissão como **Leitor** e desmarque a opção de notificar. Clique em **Compartilhar**.

---

### Passo 2: Configurar o arquivo `.env.local`
Abra o arquivo `.env.local` na raiz do projeto (ou duplique a partir de `.env.example`) e preencha:

```env
GOOGLE_SHEET_ID="1y2HOD3PuJqpHhoR6j_hs8sweZ09lVX4PZHOptR-5W84"
GOOGLE_SERVICE_ACCOUNT_EMAIL="sheets-reader@seu-projeto.iam.gserviceaccount.com"

# Cole a private_key exatamente como está no arquivo JSON baixado, incluindo aspas e \n:
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Senha para login na aplicação
APP_PASSWORD="suasenhafinanceira2026"
```

> **Dica sobre a Private Key:** No JSON ela vem com `\n`. Ao colar no arquivo `.env.local` ou nas variáveis de ambiente da Vercel, mantenha entre aspas duplas `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` para que a quebra de linha seja interpretada corretamente pelo Node.js.

---

### Passo 3: Testar Localmente
Para rodar a aplicação no seu computador:

```bash
# Entrar na pasta do dashboard
cd dashboard-basic-victor

# Instalar dependências (caso não tenha instalado)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador e digite a sua senha definida em `APP_PASSWORD`.

---

### Passo 4: Subir para o GitHub (Repositório Privado)
Recomendamos criar um repositório **Privado** para manter suas finanças e URLs protegidas:

1. Acesse [github.com/new](https://github.com/new) e crie um repositório com o nome `dashboard-basic-victor` (selecione **Private**).
2. No seu terminal, dentro da pasta `dashboard-basic-victor`:

```bash
cd dashboard-basic-victor
git init
git add .
git commit -m "feat: Dashboard Basic Victor - Gestão Financeira Completa"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/dashboard-basic-victor.git
git push -u origin main
```

*(O arquivo `.gitignore` já está configurado para não enviar seus arquivos `.env.local` com suas senhas e chaves privadas).*

---

### Passo 5: Fazer o Deploy Gratuito na Vercel
1. Acesse [vercel.com](https://vercel.com/) e faça login com sua conta do GitHub.
2. Clique em **Add New...** > **Project**.
3. Selecione o repositório `dashboard-basic-victor` que você acabou de enviar e clique em **Import**.
4. Na tela de configuração:
   - **Framework Preset:** Next.js (detectado automaticamente)
   - Em **Environment Variables**, adicione as seguintes 4 variáveis:
     1. `GOOGLE_SHEET_ID` = `1y2HOD3PuJqpHhoR6j_hs8sweZ09lVX4PZHOptR-5W84`
     2. `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `seu-email@seu-projeto.iam.gserviceaccount.com`
     3. `GOOGLE_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
     4. `APP_PASSWORD` = `sua-senha-aqui`
5. Clique em **Deploy**.
6. Em menos de 2 minutos seu dashboard estará online com certificado SSL gratuito e domínio seguro (ex: `dashboard-basic-victor.vercel.app`)!

---

## 🛠️ Estrutura do Código

```
dashboard-basic-victor/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Layout global com tema dark moderno
│   │   ├── page.tsx                  # Dashboard principal protegido por auth
│   │   ├── login/page.tsx            # Tela de login com validação de APP_PASSWORD
│   │   └── api/
│   │       ├── auth/login/route.ts   # Autenticação e cookie de sessão seguro
│   │       ├── auth/logout/route.ts  # Logout
│   │       ├── finance/route.ts      # Endpoint com parsers das 6 abas e regras
│   │       └── refresh/route.ts      # Força revalidação e renovação de cache
│   ├── components/
│   │   ├── Navbar.tsx                # Cabeçalho, status de conexão e botão atualizar
│   │   ├── MonthSelector.tsx         # Seletor de mês/ano
│   │   ├── OverviewKPIs.tsx          # 4 KPIs principais e card de Acerto Victor vs Letícia
│   │   ├── CashFlowTimeline.tsx      # Cronograma dia a dia (D01, D05, D10, D20) e alerta
│   │   ├── SalaryAnalysis.tsx        # Contracheques comparativos e Simulador interativo
│   │   ├── CardsDeepDive.tsx         # Raio-X de faturas e Radar de parcelas futuras
│   │   ├── SavingsVault.tsx          # Termômetro da Reserva R$ 5k e Metas (Carro/Obras)
│   │   └── DashboardClient.tsx       # Orquestrador do estado do cliente
│   ├── lib/
│   │   ├── sheets.ts                 # Cliente Google Sheets API com cache e fallback
│   │   ├── finance-rules.ts          # Regras financeiras e cálculos matemáticos
│   │   ├── auth.ts                   # Utilitários de autenticação e cookies
│   │   ├── utils.ts                  # Formatadores BRL, datas e parcelas
│   │   └── snapshot-data.ts          # Snapshot real da planilha para contingência
│   └── types/
│       └── finance.ts                # Tipagens TypeScript completas
├── .env.example
├── README.md
└── package.json
```
