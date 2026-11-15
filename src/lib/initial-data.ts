import { CompraCartao, ContaCasa, MovimentacaoPoupanca, ParametrosSalario } from "./finance-engine";

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

export const INITIAL_CONTAS_CASA: ContaCasa[] = [
  { id: "c1", mesAno: "2026-11", descricao: "Aluguel + IPTU", categoria: "Aluguel", valor: 1444.35, vencimento: "2026-11-05", quemPaga: "DIV", pago: true },
  { id: "c2", mesAno: "2026-11", descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: "2026-11-15", quemPaga: "DIV", pago: false },
  { id: "c3", mesAno: "2026-11", descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 301.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false },
  { id: "c4", mesAno: "2026-11", descricao: "Água / Saneamento", categoria: "Água", valor: 90.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false },
  { id: "c5", mesAno: "2026-11", descricao: "Parcela Financiamento Carro", categoria: "Carro", valor: 1100.00, vencimento: "2026-11-20", quemPaga: "DIV", pago: false },
  { id: "c6", mesAno: "2026-11", descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: "2026-11-10", quemPaga: "VIC", pago: true },
];

export const INITIAL_POUPANCA: MovimentacaoPoupanca[] = [
  { id: "p1", data: "2026-10-01", descricao: "Reserva de Emergência Intocável", tipo: "ENTRADA", valor: 5000.00, categoria: "Reserva Emergência" },
  { id: "p2", data: "2026-10-15", descricao: "Sobra Venda HB20 / Caixa Veículo", tipo: "ENTRADA", valor: 26813.00, categoria: "Metas / Projetos" },
  { id: "p3", data: "2026-11-10", descricao: "Previsão Diárias Op. Verão (Nov)", tipo: "ENTRADA", valor: 6200.00, categoria: "Diárias Op. Verão" },
  { id: "p4", data: "2026-11-30", descricao: "Compensação Acordo Banrisul (Difa Nov)", tipo: "SAIDA", valor: 1507.35, categoria: "Compensação Banrisul (Difa)" },
];

export const INITIAL_COMPRAS_CARTAO: CompraCartao[] = [
  { id: "f1", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Ribeiro", dataCompra: "27/02/2026", descricao: "OTICAS CAROL", parcelaInfo: "8/10", valor: 156.10, quemPaga: "LE" },
  { id: "f2", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Letícia Ribeiro", dataCompra: "09/09/2026", descricao: "63261442PAULO", parcelaInfo: "2/4", valor: 344.50, quemPaga: "DIV" },
  { id: "f3", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "10/06/2026", descricao: "HEMO CORD", parcelaInfo: "5/10", valor: 270.00, quemPaga: "DIV" },
  { id: "f4", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "07/08/2026", descricao: "AJJ GONSALVES DEWES LT", parcelaInfo: "3/12", valor: 374.08, quemPaga: "DIV" },
  { id: "f5", mesFatura: "2026-11", banco: "C6 Bank", titularCartao: "Victor Roque", dataCompra: "12/09/2026", descricao: "ADIDAS NOVO HAMBURGO", parcelaInfo: "2/5", valor: 84.02, quemPaga: "VIC" },
  { id: "f6", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "27/07/2026", descricao: "MERCADOLIVRE MERCAD", parcelaInfo: "4/4", valor: 233.26, quemPaga: "DIV" },
  { id: "f7", mesFatura: "2026-11", banco: "Sicredi", titularCartao: "Cartão Virtual Letícia", dataCompra: "23/07/2026", descricao: "RAIA DROGASIL SA", parcelaInfo: "4/4", valor: 43.89, quemPaga: "DIV" },
];
