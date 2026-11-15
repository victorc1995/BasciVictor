import { CompraCartao, ContaCasa, ContrachequeConfirmadoMes, MovimentacaoPoupanca, ParametrosSalario } from "./finance-engine";

export const INITIAL_SALARIO_VICTOR: ParametrosSalario = {
  subsídioBase: 6429.95,
  tipoSubstituicao: "1_SGT",
  diasSubstituicao: 30,
  horasExtrasQtd: 0,
  diasFerias: 0,
  diariasQtd: 0,
  descontoBanrisul: 1507.35, // Conforme contracheque 10/2026
  outrosDescontosFixos: 123.12, // GBOEX
  incluirValeRefeicao: true,
  dependentesIR: 0,
};

export const INITIAL_SALARIO_LETICIA: ParametrosSalario = {
  subsídioBase: 6429.95,
  tipoSubstituicao: "NENHUMA",
  diasSubstituicao: 0,
  horasExtrasQtd: 28, // ~R$ 1.350 a R$ 1.391 conforme contracheque 10/2026
  diasFerias: 0,
  diariasQtd: 0,
  descontoBanrisul: 1145.89, // Conforme contracheque 10/2026
  outrosDescontosFixos: 0,
  incluirValeRefeicao: true,
  dependentesIR: 0,
};

export const INITIAL_CONTRACHEQUES: Record<string, ContrachequeConfirmadoMes> = {
  "2026-11": {
    victorConfirmado: false,
    victorValorReal: 4713.87, // Líquido a Receber Folha Victor
    leticiaConfirmada: false,
    leticiaValorReal: 4810.73, // Líquido a Receber Folha Letícia
  },
};

export const INITIAL_CONTAS_CASA: ContaCasa[] = [
  // ==========================================
  // NOVEMBRO / 2026
  // ==========================================
  { id: "c-nov-aluguel", mesAno: "2026-11", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2026-11-05", quemPaga: "DIV", pago: true, status: "CONFIRMADO", recorrente: true },
  { id: "c-nov-iptu", mesAno: "2026-11", descricao: "IPTU (9/10)", categoria: "Outros", valor: 115.35, vencimento: "2026-11-05", quemPaga: "DIV", pago: true, status: "CONFIRMADO", recorrente: true, parcelada: true, parcelaAtual: 9, totalParcelas: 10 },
  { id: "c2", mesAno: "2026-11", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.69, vencimento: "2026-11-15", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
  { id: "c3", mesAno: "2026-11", descricao: "Energia Elétrica (CEEE Luz)", categoria: "Luz", valor: 301.18, vencimento: "2026-11-20", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
  { id: "c4", mesAno: "2026-11", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 90.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
  { id: "c5", mesAno: "2026-11", descricao: "Parcela Financiamento Carro", categoria: "Carro", valor: 1100.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
  { id: "c6", mesAno: "2026-11", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2026-11-10", quemPaga: "VIC", pago: true, status: "CONFIRMADO", recorrente: true },
  { id: "c-acordo-nubank-nov", mesAno: "2026-11", descricao: "Acordo Nubank (5/25)", categoria: "Outros", valor: 124.31, vencimento: "2026-11-02", quemPaga: "VIC", pago: true, status: "CONFIRMADO", recorrente: true, parcelada: true, parcelaAtual: 5, totalParcelas: 25 },

  // ==========================================
  // DEZEMBRO / 2026 (Novas Contas Fixas em Vigor)
  // ==========================================
  { id: "c-dez-aluguel", mesAno: "2026-12", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2026-12-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-dez-iptu", mesAno: "2026-12", descricao: "IPTU (10/10)", categoria: "Outros", valor: 115.35, vencimento: "2026-12-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 10, totalParcelas: 10 },
  { id: "c-dez-agua", mesAno: "2026-12", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2026-12-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-dez-internet", mesAno: "2026-12", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2026-12-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-dez-luz", mesAno: "2026-12", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2026-12-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-dez-tel", mesAno: "2026-12", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2026-12-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-acordo-nubank-dez", mesAno: "2026-12", descricao: "Acordo Nubank (6/25)", categoria: "Outros", valor: 124.31, vencimento: "2026-12-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 6, totalParcelas: 25 },

  // ==========================================
  // JANEIRO / 2027 (Entrada do Carro R$ 1.750 em 12/01/2027)
  // ==========================================
  { id: "c-jan-aluguel", mesAno: "2027-01", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-01-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-jan-carro", mesAno: "2027-01", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-01-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-jan-agua", mesAno: "2027-01", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-01-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-jan-internet", mesAno: "2027-01", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-01-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-jan-luz", mesAno: "2027-01", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-01-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-jan-tel", mesAno: "2027-01", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-01-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-acordo-nubank-jan", mesAno: "2027-01", descricao: "Acordo Nubank (7/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-01-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 7, totalParcelas: 25 },

  // ==========================================
  // FEVEREIRO / 2027
  // ==========================================
  { id: "c-fev-aluguel", mesAno: "2027-02", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-02-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-fev-carro", mesAno: "2027-02", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-02-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-fev-agua", mesAno: "2027-02", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-02-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-fev-internet", mesAno: "2027-02", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-02-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-fev-luz", mesAno: "2027-02", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-02-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-fev-tel", mesAno: "2027-02", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-02-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-acordo-nubank-fev", mesAno: "2027-02", descricao: "Acordo Nubank (8/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-02-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 8, totalParcelas: 25 },

  // ==========================================
  // MARÇO / 2027
  // ==========================================
  { id: "c-mar-aluguel", mesAno: "2027-03", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-03-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-mar-carro", mesAno: "2027-03", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-03-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-mar-agua", mesAno: "2027-03", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-03-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-mar-internet", mesAno: "2027-03", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-03-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-mar-luz", mesAno: "2027-03", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-03-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-mar-tel", mesAno: "2027-03", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-03-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-acordo-nubank-mar", mesAno: "2027-03", descricao: "Acordo Nubank (9/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-03-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 9, totalParcelas: 25 },

  // ==========================================
  // ABRIL / 2027
  // ==========================================
  { id: "c-abr-aluguel", mesAno: "2027-04", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-04-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-abr-carro", mesAno: "2027-04", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-04-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-abr-agua", mesAno: "2027-04", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-04-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-abr-internet", mesAno: "2027-04", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-04-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-abr-luz", mesAno: "2027-04", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-04-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-abr-tel", mesAno: "2027-04", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-04-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
  { id: "c-acordo-nubank-abr", mesAno: "2027-04", descricao: "Acordo Nubank (10/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-04-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 10, totalParcelas: 25 },
];

export const INITIAL_POUPANCA: MovimentacaoPoupanca[] = [
  { id: "p1", data: "2026-10-01", descricao: "Reserva de Emergência Intocável", tipo: "ENTRADA", valor: 5000.00, categoria: "Reserva Emergência", status: "CONFIRMADO" },
  { id: "p2", data: "2026-10-15", descricao: "Sobra Venda HB20 / Caixa Veículo", tipo: "ENTRADA", valor: 26813.00, categoria: "Metas / Projetos", status: "CONFIRMADO" },
  { id: "p3", data: "2026-11-10", descricao: "Previsão Diárias Op. Verão (Nov)", tipo: "ENTRADA", valor: 6200.00, categoria: "Diárias Op. Verão", status: "CONFIRMADO" },
  { id: "p4", data: "2026-11-30", descricao: "Compensação Acordo Banrisul (Difa Nov)", tipo: "SAIDA", valor: 1507.35, categoria: "Compensação Banrisul (Difa)", status: "CONFIRMADO" },
  { id: "p5", data: "2026-12-02", descricao: "Previsão Diárias Op. Verão (Dez)", tipo: "ENTRADA", valor: 6200.00, categoria: "Diárias Op. Verão", status: "PREVISTO" },
  { id: "p6", data: "2026-12-30", descricao: "Compensação Acordo Banrisul (Difa Dez)", tipo: "SAIDA", valor: 1507.35, categoria: "Compensação Banrisul (Difa)", status: "PREVISTO" },
];

export const INITIAL_COMPRAS_CARTAO: CompraCartao[] = [
  // =========================================================================
  // FATURA C6 BANK - NOVEMBRO/2026 (Pagamento 01/11/2026 - Total R$ 2.890,81)
  // =========================================================================
  { id: "c6-1", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "27/02/2026", descricao: "OTICAS CAROL", parcelaInfo: "8/10", valor: 156.10, quemPaga: "LE" },
  { id: "c6-2", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "04/07/2026", descricao: "JC COMERCIO DE CALCADO", parcelaInfo: "4/4", valor: 57.47, quemPaga: "LE" },
  { id: "c6-3", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "14/07/2026", descricao: "PANVEL*DIGITAL", parcelaInfo: "4/4", valor: 35.47, quemPaga: "DIV" },
  { id: "c6-4", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "18/08/2026", descricao: "HAVAN TRAMANDAI", parcelaInfo: "3/4", valor: 52.23, quemPaga: "DIV" },
  { id: "c6-5", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "09/09/2026", descricao: "63261442PAULO", parcelaInfo: "2/4", valor: 344.50, quemPaga: "DIV" },
  { id: "c6-6", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "12/09/2026", descricao: "2ASICS - LOJA NOVO HAM", parcelaInfo: "2/5", valor: 102.77, quemPaga: "LE" },
  { id: "c6-7", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "13/09/2026", descricao: "SHOPEE*PAPER OFFICE M", parcelaInfo: "2/2", valor: 26.51, quemPaga: "DIV" },
  { id: "c6-8", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "01/10/2026", descricao: "SUPERMERCADO ASUN", parcelaInfo: undefined, valor: 160.31, quemPaga: "DIV" },
  { id: "c6-9", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "11/10/2026", descricao: "HDI SEGUROS SA", parcelaInfo: undefined, valor: 80.76, quemPaga: "DIV" },
  { id: "c6-10", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "06/12/2025", descricao: "GLOBO PREMIERE", parcelaInfo: "11/12", valor: 29.90, quemPaga: "DIV" },
  { id: "c6-11", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "06/12/2025", descricao: "GLOBO GLOBOPLAY", parcelaInfo: "11/12", valor: 29.90, quemPaga: "DIV" },
  { id: "c6-12", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "27/02/2026", descricao: "OTICAS CAROL", parcelaInfo: "8/10", valor: 72.90, quemPaga: "VIC" },
  { id: "c6-13", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "08/04/2026", descricao: "RS ADVENTURE LTDA", parcelaInfo: "7/10", valor: 119.80, quemPaga: "VIC" },
  { id: "c6-14", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "10/06/2026", descricao: "HEMO CORD", parcelaInfo: "5/10", valor: 207.00, quemPaga: "DIV" },
  { id: "c6-15", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "10/06/2026", descricao: "HEMO CORD", parcelaInfo: "5/10", valor: 63.00, quemPaga: "DIV" },
  { id: "c6-16", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "05/07/2026", descricao: "63173484WILLIAM", parcelaInfo: "4/5", valor: 278.20, quemPaga: "DIV" },
  { id: "c6-17", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "07/08/2026", descricao: "AJJ GONSALVES DEWES LT", parcelaInfo: "3/12", valor: 374.08, quemPaga: "DIV" },
  { id: "c6-18", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "11/08/2026", descricao: "IMAGGI REDEMAC", parcelaInfo: "3/5", valor: 79.76, quemPaga: "DIV" },
  { id: "c6-19", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "12/09/2026", descricao: "ME.LINDA-N.HAMB.RINCAO", parcelaInfo: "2/4", valor: 53.14, quemPaga: "DIV" },
  { id: "c6-20", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "12/09/2026", descricao: "ADIDAS NOVO HAMBURGO", parcelaInfo: "2/5", valor: 84.02, quemPaga: "VIC" },
  { id: "c6-21", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "13/09/2026", descricao: "MERCADO*MERCADOLIVRE", parcelaInfo: "2/10", valor: 105.01, quemPaga: "DIV" },
  { id: "c6-22", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "29/09/2026", descricao: "AMAZON PRIME CANAIS - Estorno", parcelaInfo: undefined, valor: -59.90, quemPaga: "DIV" },
  { id: "c6-23", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "29/09/2026", descricao: "AMAZON PRIME CANAIS", parcelaInfo: undefined, valor: 59.90, quemPaga: "DIV" },
  { id: "c6-24", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "29/09/2026", descricao: "IFD*VERIDIANA MARQUES", parcelaInfo: undefined, valor: 39.20, quemPaga: "DIV" },
  { id: "c6-25", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "04/10/2026", descricao: "AMAZON BR *AMAZON BR", parcelaInfo: undefined, valor: 89.99, quemPaga: "VIC" },
  { id: "c6-26", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "04/10/2026", descricao: "RAIA3331", parcelaInfo: undefined, valor: 23.99, quemPaga: "VIC" },
  { id: "c6-27", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "04/10/2026", descricao: "EBN *PLAYSTATION", parcelaInfo: "1/4", valor: 87.25, quemPaga: "VIC", isNova: true },
  { id: "c6-28", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "05/10/2026", descricao: "APPLE.COM/BILL", parcelaInfo: undefined, valor: 64.90, quemPaga: "DIV" },
  { id: "c6-29", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "05/10/2026", descricao: "IFD*IFOOD CLUB", parcelaInfo: undefined, valor: 7.95, quemPaga: "VIC" },
  { id: "c6-30", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "11/10/2026", descricao: "UBER *ONE MEMBERSHIP U", parcelaInfo: undefined, valor: 12.90, quemPaga: "DIV" },
  { id: "c6-31", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "22/10/2026", descricao: "GOOGLE YOUTUBEPREMIUM", parcelaInfo: undefined, valor: 16.90, quemPaga: "VIC" },
  { id: "c6-32", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "27/10/2026", descricao: "AMAZON PRIME CANAIS", parcelaInfo: undefined, valor: 34.90, quemPaga: "DIV" },

  // =========================================================================
  // FATURA SICREDI - NOVEMBRO/2026 (Pagamento 03/11/2026 - Total R$ 3.609,22)
  // =========================================================================
  { id: "sic-1", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "23/07/2026", descricao: "Raia Drogasil Sa", parcelaInfo: "3/3", valor: 43.89, quemPaga: "DIV" },
  { id: "sic-2", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "27/07/2026", descricao: "Mercadolivre Mercad", parcelaInfo: "3/4", valor: 233.26, quemPaga: "DIV" },
  { id: "sic-3", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "27/07/2026", descricao: "Mercadolivre Mercad", parcelaInfo: "3/3", valor: 128.40, quemPaga: "DIV" },
  { id: "sic-4", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "05/08/2026", descricao: "House Parts Com De", parcelaInfo: "3/6", valor: 162.98, quemPaga: "DIV" },
  { id: "sic-5", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "14/08/2026", descricao: "Lojas Reggla", parcelaInfo: "3/3", valor: 45.32, quemPaga: "LE" },
  { id: "sic-6", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "09/09/2026", descricao: "Mais Saude", parcelaInfo: "2/12", valor: 36.90, quemPaga: "DIV" },
  { id: "sic-7", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "17/09/2026", descricao: "Uber Cash", parcelaInfo: undefined, valor: 100.00, quemPaga: "DIV" },
  { id: "sic-8", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "19/09/2026", descricao: "Jaja Supermercado", parcelaInfo: undefined, valor: 29.92, quemPaga: "DIV" },
  { id: "sic-9", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "20/09/2026", descricao: "Depositodogordo", parcelaInfo: undefined, valor: 6.00, quemPaga: "VIC" },
  { id: "sic-10", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "21/09/2026", descricao: "Panvel Filil 869", parcelaInfo: undefined, valor: 41.80, quemPaga: "DIV" },
  { id: "sic-11", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "22/09/2026", descricao: "Dl Uberrides", parcelaInfo: undefined, valor: 6.82, quemPaga: "DIV" },
  { id: "sic-12", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "23/09/2026", descricao: "Vitor Rosa", parcelaInfo: undefined, valor: 117.90, quemPaga: "DIV" },
  { id: "sic-13", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "24/09/2026", descricao: "Adilso Pereira Dos San", parcelaInfo: undefined, valor: 58.91, quemPaga: "DIV" },
  { id: "sic-14", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "24/09/2026", descricao: "Pameladasilveira", parcelaInfo: undefined, valor: 15.40, quemPaga: "DIV" },
  { id: "sic-15", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "24/09/2026", descricao: "Comercial Samy Ltda", parcelaInfo: undefined, valor: 55.34, quemPaga: "DIV" },
  { id: "sic-16", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "24/09/2026", descricao: "Hospital Mae De Deus", parcelaInfo: undefined, valor: 343.83, quemPaga: "VIC" },
  { id: "sic-17", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "25/09/2026", descricao: "Serdil", parcelaInfo: undefined, valor: 49.43, quemPaga: "VIC" },
  { id: "sic-18", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "26/09/2026", descricao: "Embaixador Rod Poa", parcelaInfo: undefined, valor: 111.95, quemPaga: "LE" },
  { id: "sic-19", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "26/09/2026", descricao: "Paradouro Grill", parcelaInfo: undefined, valor: 38.00, quemPaga: "DIV" },
  { id: "sic-20", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "27/09/2026", descricao: "Jaqueline Peter Cas", parcelaInfo: "1/2", valor: 74.95, quemPaga: "LE", isNova: true },
  { id: "sic-21", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "28/09/2026", descricao: "Supermecado Dalpiaz", parcelaInfo: undefined, valor: 32.64, quemPaga: "DIV" },
  { id: "sic-22", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "01/10/2026", descricao: "Comercial Samy Ltda", parcelaInfo: undefined, valor: 235.57, quemPaga: "DIV" },
  { id: "sic-23", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "02/10/2026", descricao: "Supermercado Asun", parcelaInfo: undefined, valor: 120.94, quemPaga: "DIV" },
  { id: "sic-24", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "04/10/2026", descricao: "Distribuidorade", parcelaInfo: undefined, valor: 89.15, quemPaga: "DIV" },
  { id: "sic-25", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "04/10/2026", descricao: "Farmacia Sao Joao", parcelaInfo: undefined, valor: 12.98, quemPaga: "LE" },
  { id: "sic-26", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "04/10/2026", descricao: "Rd Saude Online", parcelaInfo: undefined, valor: 67.34, quemPaga: "DIV" },
  { id: "sic-27", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "06/10/2026", descricao: "Dl Uberrides", parcelaInfo: undefined, valor: 9.04, quemPaga: "DIV" },
  { id: "sic-28", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "06/10/2026", descricao: "Uber Cash", parcelaInfo: undefined, valor: 200.00, quemPaga: "DIV" },
  { id: "sic-29", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "07/10/2026", descricao: "Carlos Eduardo Nunes S", parcelaInfo: undefined, valor: 9.90, quemPaga: "LE" },
  { id: "sic-30", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "07/10/2026", descricao: "Agropecuaria E Ferr", parcelaInfo: "1/2", valor: 79.89, quemPaga: "DIV" },
  { id: "sic-31", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "08/10/2026", descricao: "App Edprea", parcelaInfo: "1/3", valor: 29.98, quemPaga: "LE" },
  { id: "sic-32", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "10/10/2026", descricao: "X Do Nei", parcelaInfo: undefined, valor: 59.00, quemPaga: "DIV" },
  { id: "sic-33", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "11/10/2026", descricao: "Distribuidorade", parcelaInfo: undefined, valor: 32.79, quemPaga: "DIV" },
  { id: "sic-34", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "11/10/2026", descricao: "Log Participacoes E In", parcelaInfo: undefined, valor: 80.72, quemPaga: "DIV" },
  { id: "sic-35", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "11/10/2026", descricao: "Comercial Samy Ltda", parcelaInfo: undefined, valor: 114.14, quemPaga: "DIV" },
  { id: "sic-36", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "13/10/2026", descricao: "Uber One Membership U", parcelaInfo: undefined, valor: 3.99, quemPaga: "DIV" },
  { id: "sic-37", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "13/10/2026", descricao: "Shein Shein Com", parcelaInfo: undefined, valor: 76.11, quemPaga: "DIV" },
  { id: "sic-38", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "14/10/2026", descricao: "Supermercados Dalpiaz", parcelaInfo: undefined, valor: 22.93, quemPaga: "DIV" },
  { id: "sic-39", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "14/10/2026", descricao: "Mp Kingeski", parcelaInfo: undefined, valor: 12.90, quemPaga: "DIV" },
  { id: "sic-40", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "15/10/2026", descricao: "Mais Saude", parcelaInfo: undefined, valor: 79.90, quemPaga: "LE" },
  { id: "sic-41", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "15/10/2026", descricao: "Alex Sandro Da Silva", parcelaInfo: undefined, valor: 41.43, quemPaga: "DIV" },
  { id: "sic-42", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "15/10/2026", descricao: "Bistek Supermercados L", parcelaInfo: undefined, valor: 26.20, quemPaga: "DIV" },
  { id: "sic-43", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "15/10/2026", descricao: "Vitor Rosa", parcelaInfo: undefined, valor: 87.00, quemPaga: "DIV" },
  { id: "sic-44", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "15/10/2026", descricao: "Jaja Supermercado", parcelaInfo: undefined, valor: 22.96, quemPaga: "DIV" },
  { id: "sic-45", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "16/10/2026", descricao: "Comercial Samy Ltda", parcelaInfo: undefined, valor: 20.78, quemPaga: "DIV" },
  { id: "sic-46", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "17/10/2026", descricao: "Pameladasilveira", parcelaInfo: undefined, valor: 72.60, quemPaga: "DIV" },
  { id: "sic-47", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "17/10/2026", descricao: "Rd Saude Online", parcelaInfo: "1/3", valor: 44.29, quemPaga: "LE" },
  { id: "sic-48", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "18/10/2026", descricao: "Log Participacoes E In", parcelaInfo: undefined, valor: 131.86, quemPaga: "DIV" },
  { id: "sic-49", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Físico Victor", dataCompra: "18/10/2026", descricao: "Distribuidorade", parcelaInfo: undefined, valor: 91.19, quemPaga: "DIV" },
];
