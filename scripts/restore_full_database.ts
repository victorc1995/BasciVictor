import fs from "fs";
import { saveDatabaseToGoogleSheets } from "../src/lib/google-sheets-db";
import { CompraCartao, ContaCasa, ContrachequeConfirmadoMes, MovimentacaoPoupanca, ParametrosSalario } from "../src/lib/finance-engine";

async function main() {
  console.log("=== INICIANDO RESTAURAÇÃO COMPLETA DE DADOS ===");

  // 1. POUPANÇA (CONFIRMADOS TOTALIZANDO EXATAMENTE R$ 10.328,00 + PREVISÕES)
  const poupanca: MovimentacaoPoupanca[] = [
    // --- Lançamentos Confirmados ---
    {
      id: "p-conf-1",
      data: "2026-10-01",
      descricao: "Reserva de Emergência Intocável",
      tipo: "ENTRADA",
      valor: 5000.00,
      categoria: "Reserva Emergência",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-2",
      data: "2026-10-15",
      descricao: "Sobra Venda HB20 / Caixa Veículo",
      tipo: "ENTRADA",
      valor: 29700.00,
      categoria: "Metas / Projetos",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-3",
      data: "2026-10-15",
      descricao: "Seguro Ar",
      tipo: "ENTRADA",
      valor: 2294.00,
      categoria: "Metas / Projetos",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-4",
      data: "2026-10-20",
      descricao: "99 Setembro",
      tipo: "ENTRADA",
      valor: 318.00,
      categoria: "Renda Extra",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-7",
      data: "2026-11-02",
      descricao: "Cartão Letícia",
      tipo: "SAIDA",
      valor: 499.00,
      categoria: "Cartão de Crédito",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-5",
      data: "2026-11-03",
      descricao: "13º Salário 90% Antecipado",
      tipo: "ENTRADA",
      valor: 9000.00,
      categoria: "Salário / 13º",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-6",
      data: "2026-11-03",
      descricao: "Diárias Op. Verão (03/11)",
      tipo: "ENTRADA",
      valor: 6000.00,
      categoria: "Diárias Op. Verão",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-8",
      data: "2026-11-10",
      descricao: "Diárias Op. Verão (10/11)",
      tipo: "ENTRADA",
      valor: 6200.00,
      categoria: "Diárias Op. Verão",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-ar-sala",
      data: "2026-11-12",
      descricao: "Instalação Ar Sala",
      tipo: "SAIDA",
      valor: 750.00,
      categoria: "Metas / Projetos",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-ar-quarto",
      data: "2026-11-12",
      descricao: "Instalação Ar Quarto",
      tipo: "SAIDA",
      valor: 750.00,
      categoria: "Metas / Projetos",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-creta",
      data: "2026-11-13",
      descricao: "Entrada Creta",
      tipo: "SAIDA",
      valor: 45000.00,
      categoria: "Metas / Projetos",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-uber-diana",
      data: "2026-11-13",
      descricao: "Uber Diana",
      tipo: "SAIDA",
      valor: 200.00,
      categoria: "Outros",
      status: "CONFIRMADO",
    },
    {
      id: "p-conf-jantar",
      data: "2026-11-18",
      descricao: "Jantar Casamento",
      tipo: "SAIDA",
      valor: 985.00,
      categoria: "Outros",
      status: "CONFIRMADO",
    },

    // --- Previsões Futuras (A Realizar) ---
    {
      id: "p-prev-1",
      data: "2026-11-30",
      descricao: "Compensação Acordo Banrisul (Difa Nov)",
      tipo: "SAIDA",
      valor: 1562.01,
      categoria: "Compensação Banrisul (Difa)",
      status: "PREVISTO",
    },
    {
      id: "p-prev-2",
      data: "2026-12-01",
      descricao: "Previsão Diárias Op. Verão (Dez)",
      tipo: "ENTRADA",
      valor: 6262.00,
      categoria: "Diárias Op. Verão",
      status: "PREVISTO",
    },
    {
      id: "p-prev-creta-parc",
      data: "2026-12-17",
      descricao: "Parcela Creta",
      tipo: "SAIDA",
      valor: 1730.00,
      categoria: "Metas / Projetos",
      status: "PREVISTO",
    },
    {
      id: "p-prev-creta-ipva",
      data: "2026-12-20",
      descricao: "IPVA Creta",
      tipo: "SAIDA",
      valor: 2500.00,
      categoria: "Metas / Projetos",
      status: "PREVISTO",
    },
    {
      id: "p-prev-3",
      data: "2026-12-30",
      descricao: "Compensação Acordo Banrisul (Difa Dez)",
      tipo: "SAIDA",
      valor: 1562.01,
      categoria: "Compensação Banrisul (Difa)",
      status: "PREVISTO",
    },
    {
      id: "p-prev-pai",
      data: "2026-12-30",
      descricao: "Acordo / Devolução Pai",
      tipo: "SAIDA",
      valor: 6309.00,
      categoria: "Outros",
      status: "PREVISTO",
    },
    {
      id: "p-prev-4",
      data: "2027-01-01",
      descricao: "Previsão Diárias Op. Verão (Jan)",
      tipo: "ENTRADA",
      valor: 6262.00,
      categoria: "Diárias Op. Verão",
      status: "PREVISTO",
    },
    {
      id: "p-prev-5",
      data: "2027-01-30",
      descricao: "Compensação Acordo Banrisul (Difa Jan)",
      tipo: "SAIDA",
      valor: 1562.01,
      categoria: "Compensação Banrisul (Difa)",
      status: "PREVISTO",
    },
    {
      id: "p-prev-6",
      data: "2027-02-01",
      descricao: "Previsão Diárias Op. Verão (Fev)",
      tipo: "ENTRADA",
      valor: 5656.00,
      categoria: "Diárias Op. Verão",
      status: "PREVISTO",
    },
    {
      id: "p-prev-7",
      data: "2027-02-28",
      descricao: "Compensação Acordo Banrisul (Difa Fev)",
      tipo: "SAIDA",
      valor: 1562.01,
      categoria: "Compensação Banrisul (Difa)",
      status: "PREVISTO",
    },
    {
      id: "p-prev-8",
      data: "2027-03-01",
      descricao: "Previsão Diárias Op. Verão (Mar)",
      tipo: "ENTRADA",
      valor: 6060.00,
      categoria: "Diárias Op. Verão",
      status: "PREVISTO",
    },
    {
      id: "p-prev-9",
      data: "2027-03-30",
      descricao: "Compensação Acordo Banrisul (Difa Mar)",
      tipo: "SAIDA",
      valor: 1562.01,
      categoria: "Compensação Banrisul (Difa)",
      status: "PREVISTO",
    },
    {
      id: "p-prev-10",
      data: "2027-04-01",
      descricao: "Previsão Diárias Op. Verão (Abr)",
      tipo: "ENTRADA",
      valor: 3030.00,
      categoria: "Diárias Op. Verão",
      status: "PREVISTO",
    },
    {
      id: "p-prev-11",
      data: "2027-04-30",
      descricao: "Compensação Acordo Banrisul (Difa Abr)",
      tipo: "SAIDA",
      valor: 1562.01,
      categoria: "Compensação Banrisul (Difa)",
      status: "PREVISTO",
    },
  ];

  // Confirma cálculo da Poupança
  const entradasConf = poupanca.filter((p) => p.tipo === "ENTRADA" && p.status === "CONFIRMADO").reduce((a, b) => a + b.valor, 0);
  const saidasConf = poupanca.filter((p) => p.tipo === "SAIDA" && p.status === "CONFIRMADO").reduce((a, b) => a + b.valor, 0);
  console.log(`POUPANÇA: Entradas Confirmadas = R$ ${entradasConf.toFixed(2)}, Saídas Confirmadas = R$ ${saidasConf.toFixed(2)}, Saldo = R$ ${(entradasConf - saidasConf).toFixed(2)}`);

  // 2. PARÂMETROS SALARIAIS
  const salVictor: ParametrosSalario = {
    subsídioBase: 6429.95,
    tipoSubstituicao: "1_SGT",
    diasSubstituicao: 30,
    horasExtrasQtd: 0,
    diasFerias: 0,
    diariasQtd: 0,
    descontoBanrisul: 1507.35,
    outrosDescontosFixos: 123.12,
    incluirValeRefeicao: true,
    dependentesIR: 0,
  };

  const salLeticia: ParametrosSalario = {
    subsídioBase: 6429.95,
    tipoSubstituicao: "NENHUMA",
    diasSubstituicao: 0,
    horasExtrasQtd: 28,
    diasFerias: 0,
    diariasQtd: 0,
    descontoBanrisul: 1145.89,
    outrosDescontosFixos: 0,
    incluirValeRefeicao: true,
    dependentesIR: 0,
  };

  // 3. CONTRACHEQUES
  const contracheques: Record<string, ContrachequeConfirmadoMes> = {
    "2026-10": {
      victorConfirmado: true,
      victorValorReal: 4713.87,
      victorSalarioLiquidoFinal: 5557.79,
      leticiaConfirmada: true,
      leticiaValorReal: 4810.73,
      leticiaSalarioLiquidoFinal: 5654.65,
    },
    "2026-11": {
      victorConfirmado: true,
      victorValorReal: 4573.57,
      victorSalarioLiquidoFinal: 5417.49,
      leticiaConfirmada: true,
      leticiaValorReal: 4657.44,
      leticiaSalarioLiquidoFinal: 5501.36,
      victorParams: salVictor,
      leticiaParams: salLeticia,
    },
    "2026-12": {
      victorConfirmado: false,
      victorValorReal: 3316.40,
      victorExtras: [
        { id: "ext-dez-mae", descricao: "Empréstimo mãe", valor: 300.00 },
      ],
      victorGanhosExtras: 300.00,
      leticiaConfirmada: false,
      leticiaValorReal: 4657.44,
      victorParams: salVictor,
      leticiaParams: salLeticia,
    },
  };

  // 4. CONTAS DA CASA
  const contasCasa: ContaCasa[] = [
    // --- NOVEMBRO / 2026 ---
    { id: "c-nov-aluguel", mesAno: "2026-11", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2026-11-05", quemPaga: "DIV", pago: true, status: "CONFIRMADO", recorrente: true },
    { id: "c-nov-iptu", mesAno: "2026-11", descricao: "IPTU (9/10)", categoria: "Outros", valor: 115.35, vencimento: "2026-11-05", quemPaga: "DIV", pago: true, status: "CONFIRMADO", recorrente: true, parcelada: true, parcelaAtual: 9, totalParcelas: 10 },
    { id: "c2", mesAno: "2026-11", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.69, vencimento: "2026-11-15", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
    { id: "c3", mesAno: "2026-11", descricao: "Energia Elétrica (CEEE Luz)", categoria: "Luz", valor: 301.18, vencimento: "2026-11-20", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
    { id: "c4", mesAno: "2026-11", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 90.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
    { id: "c5", mesAno: "2026-11", descricao: "Parcela Financiamento Carro", categoria: "Carro", valor: 1100.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
    { id: "c6", mesAno: "2026-11", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2026-11-10", quemPaga: "VIC", pago: true, status: "CONFIRMADO", recorrente: true },
    { id: "c-acordo-nubank-nov", mesAno: "2026-11", descricao: "Acordo Nubank (5/25)", categoria: "Outros", valor: 124.31, vencimento: "2026-11-02", quemPaga: "VIC", pago: true, status: "CONFIRMADO", recorrente: true, parcelada: true, parcelaAtual: 5, totalParcelas: 25 },

    // --- DEZEMBRO / 2026 ---
    { id: "c-dez-aluguel", mesAno: "2026-12", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2026-12-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-dez-iptu", mesAno: "2026-12", descricao: "IPTU (10/10)", categoria: "Outros", valor: 115.35, vencimento: "2026-12-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 10, totalParcelas: 10 },
    { id: "c-dez-agua", mesAno: "2026-12", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2026-12-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-dez-internet", mesAno: "2026-12", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2026-12-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-dez-luz", mesAno: "2026-12", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2026-12-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-dez-tel", mesAno: "2026-12", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2026-12-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-acordo-nubank-dez", mesAno: "2026-12", descricao: "Acordo Nubank (6/25)", categoria: "Outros", valor: 124.31, vencimento: "2026-12-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 6, totalParcelas: 25 },

    // --- JANEIRO / 2027 ---
    { id: "c-jan-aluguel", mesAno: "2027-01", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-01-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-jan-carro", mesAno: "2027-01", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-01-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-jan-agua", mesAno: "2027-01", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-01-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-jan-internet", mesAno: "2027-01", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-01-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-jan-luz", mesAno: "2027-01", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-01-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-jan-tel", mesAno: "2027-01", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-01-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-acordo-nubank-jan", mesAno: "2027-01", descricao: "Acordo Nubank (7/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-01-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 7, totalParcelas: 25 },

    // --- FEVEREIRO / 2027 ---
    { id: "c-fev-aluguel", mesAno: "2027-02", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-02-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-fev-carro", mesAno: "2027-02", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-02-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-fev-agua", mesAno: "2027-02", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-02-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-fev-internet", mesAno: "2027-02", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-02-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-fev-luz", mesAno: "2027-02", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-02-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-fev-tel", mesAno: "2027-02", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-02-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-acordo-nubank-fev", mesAno: "2027-02", descricao: "Acordo Nubank (8/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-02-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 8, totalParcelas: 25 },

    // --- MARÇO / 2027 ---
    { id: "c-mar-aluguel", mesAno: "2027-03", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-03-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-mar-carro", mesAno: "2027-03", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-03-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-mar-agua", mesAno: "2027-03", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-03-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-mar-internet", mesAno: "2027-03", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-03-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-mar-luz", mesAno: "2027-03", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-03-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-mar-tel", mesAno: "2027-03", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-03-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-acordo-nubank-mar", mesAno: "2027-03", descricao: "Acordo Nubank (9/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-03-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 9, totalParcelas: 25 },

    // --- ABRIL / 2027 ---
    { id: "c-abr-aluguel", mesAno: "2027-04", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2027-04-05", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-abr-carro", mesAno: "2027-04", descricao: "Parcela do Carro", categoria: "Carro", valor: 1750.00, vencimento: "2027-04-12", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-abr-agua", mesAno: "2027-04", descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: "2027-04-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-abr-internet", mesAno: "2027-04", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2027-04-15", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-abr-luz", mesAno: "2027-04", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: "2027-04-20", quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-abr-tel", mesAno: "2027-04", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2027-04-10", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
    { id: "c-acordo-nubank-abr", mesAno: "2027-04", descricao: "Acordo Nubank (10/25)", categoria: "Outros", valor: 124.31, vencimento: "2027-04-02", quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true, parcelada: true, parcelaAtual: 10, totalParcelas: 25 },
  ];

  // 5. COMPRAS DE CARTÃO (NOVEMBRO + DEZEMBRO)
  // Carrega as compras de Novembro do initial-data e adiciona as de Dezembro
  const rawInitial = fs.readFileSync("./src/lib/initial-data.ts", "utf-8");
  // Lê as compras atuais de financas_db.json
  const currentDb = JSON.parse(fs.readFileSync("./data/financas_db.json", "utf-8"));
  const existingCompras: CompraCartao[] = (currentDb.data || currentDb).comprasCartao || [];

  // Dezembro Sicredi da aba "Fatura Sicredi" linhas 53-59
  const sicrediDez: CompraCartao[] = [
    { id: "sic-dez-1", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "27/07/2026", descricao: "Mercadolivre Mercad", parcelaInfo: "4/4", valor: 233.26, quemPaga: "DIV" },
    { id: "sic-dez-2", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "05/08/2026", descricao: "House Parts Com De", parcelaInfo: "4/6", valor: 162.98, quemPaga: "DIV" },
    { id: "sic-dez-3", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "09/09/2026", descricao: "Mais Saude", parcelaInfo: "3/12", valor: 36.90, quemPaga: "DIV" },
    { id: "sic-dez-4", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "27/09/2026", descricao: "Jaqueline Peter Cas", parcelaInfo: "2/2", valor: 74.95, quemPaga: "LE" },
    { id: "sic-dez-5", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "07/10/2026", descricao: "Agropecuaria E Ferr", parcelaInfo: "2/2", valor: 79.89, quemPaga: "DIV" },
    { id: "sic-dez-6", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "08/10/2026", descricao: "App Edprea", parcelaInfo: "2/3", valor: 29.98, quemPaga: "LE" },
    { id: "sic-dez-7", mesFatura: "2026-12", banco: "Sicredi", titularCartao: "Cartão Físico Letícia", dataCompra: "17/10/2026", descricao: "Rd Saude Online", parcelaInfo: "2/3", valor: 44.29, quemPaga: "LE" },
  ];

  // Dezembro C6 Bank das parcelas ativas
  const c6Dez: CompraCartao[] = [
    { id: "c6-dez-1", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "27/02/2026", descricao: "OTICAS CAROL", parcelaInfo: "9/10", valor: 156.10, quemPaga: "LE" },
    { id: "c6-dez-2", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "18/08/2026", descricao: "HAVAN TRAMANDAI", parcelaInfo: "4/4", valor: 52.23, quemPaga: "DIV" },
    { id: "c6-dez-3", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "09/09/2026", descricao: "63261442PAULO", parcelaInfo: "3/4", valor: 344.50, quemPaga: "DIV" },
    { id: "c6-dez-4", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Letícia Roque", dataCompra: "12/09/2026", descricao: "2ASICS - LOJA NOVO HAM", parcelaInfo: "3/5", valor: 102.77, quemPaga: "LE" },
    { id: "c6-dez-5", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "06/12/2025", descricao: "GLOBO PREMIERE", parcelaInfo: "12/12", valor: 29.90, quemPaga: "DIV" },
    { id: "c6-dez-6", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "06/12/2025", descricao: "GLOBO GLOBOPLAY", parcelaInfo: "12/12", valor: 29.90, quemPaga: "DIV" },
    { id: "c6-dez-7", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "27/02/2026", descricao: "OTICAS CAROL", parcelaInfo: "9/10", valor: 72.90, quemPaga: "VIC" },
    { id: "c6-dez-8", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "08/04/2026", descricao: "RS ADVENTURE LTDA", parcelaInfo: "8/10", valor: 119.80, quemPaga: "VIC" },
    { id: "c6-dez-9", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "10/06/2026", descricao: "HEMO CORD", parcelaInfo: "6/10", valor: 207.00, quemPaga: "DIV" },
    { id: "c6-dez-10", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "10/06/2026", descricao: "HEMO CORD", parcelaInfo: "6/10", valor: 63.00, quemPaga: "DIV" },
    { id: "c6-dez-11", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "05/07/2026", descricao: "63173484WILLIAM", parcelaInfo: "5/5", valor: 278.20, quemPaga: "DIV" },
    { id: "c6-dez-12", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "07/08/2026", descricao: "AJJ GONSALVES DEWES LT", parcelaInfo: "4/12", valor: 374.08, quemPaga: "DIV" },
    { id: "c6-dez-13", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "11/08/2026", descricao: "IMAGGI REDEMAC", parcelaInfo: "4/5", valor: 79.76, quemPaga: "DIV" },
    { id: "c6-dez-14", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "12/09/2026", descricao: "ME.LINDA-N.HAMB.RINCAO", parcelaInfo: "3/4", valor: 53.14, quemPaga: "DIV" },
    { id: "c6-dez-15", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "12/09/2026", descricao: "ADIDAS NOVO HAMBURGO", parcelaInfo: "3/5", valor: 84.02, quemPaga: "VIC" },
    { id: "c6-dez-16", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "13/09/2026", descricao: "MERCADO*MERCADOLIVRE", parcelaInfo: "3/10", valor: 105.01, quemPaga: "DIV" },
    { id: "c6-dez-17", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "04/10/2026", descricao: "EBN *PLAYSTATION", parcelaInfo: "2/4", valor: 87.25, quemPaga: "VIC" },
    { id: "c6-dez-18", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "05/10/2026", descricao: "APPLE.COM/BILL", parcelaInfo: undefined, valor: 64.90, quemPaga: "DIV" },
    { id: "c6-dez-19", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "11/10/2026", descricao: "UBER *ONE MEMBERSHIP U", parcelaInfo: undefined, valor: 12.90, quemPaga: "DIV" },
    { id: "c6-dez-20", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "22/10/2026", descricao: "GOOGLE YOUTUBEPREMIUM", parcelaInfo: undefined, valor: 16.90, quemPaga: "VIC" },
    { id: "c6-dez-21", mesFatura: "2026-12", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "27/10/2026", descricao: "AMAZON PRIME CANAIS", parcelaInfo: undefined, valor: 34.90, quemPaga: "DIV" },
  ];

  // Combina novembro já existente com dezembro
  const novCompras = existingCompras.filter((c) => c.mesFatura === "2026-11");
  const comprasCartao = [...novCompras, ...sicrediDez, ...c6Dez];

  const payload = {
    contasCasa,
    poupanca,
    salVictor,
    salLeticia,
    comprasCartao,
    contracheques,
    faturasPagas: {
      "2026-11-c6-vic": true,
      "2026-11-c6-le": true,
      "2026-11-sicredi-vic": true,
      "2026-11-sicredi-le": true,
    },
    contasExcluidas: [],
  };

  // 6. GRAVA NO DISCO data/financas_db.json
  const filePayload = {
    updatedAt: new Date().toISOString(),
    data: payload,
  };
  fs.writeFileSync("./data/financas_db.json", JSON.stringify(filePayload, null, 2), "utf-8");
  console.log("✓ data/financas_db.json atualizado com sucesso!");

  // 7. GRAVA NO GOOGLE SHEETS
  console.log("Enviando dados para o Google Sheets...");
  const res = await saveDatabaseToGoogleSheets(payload);
  console.log("✓ Salvo no Google Sheets com sucesso! updatedAt:", res.updatedAt);
}

main().catch(console.error);
