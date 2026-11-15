import {
  Transaction,
  CardTransaction,
  SalaryMonthData,
  SavingsItem,
  MonthSummary,
  DailyCashFlow,
  FutureInstallmentRelease,
  Payer,
  AcertoMensal,
  SimulationParams,
  ContaRealVictorInfo,
} from '@/types/finance';
import { SheetSnapshotData } from './snapshot-data';
import {
  parseCurrency,
  normalizePayer,
  extractInstallments,
  parseDateComponents,
  getMonthYearLabel,
} from './utils';

const BANRISUL_AGREEMENT_AMOUNT = 1562.01;
const EMERGENCY_RESERVE_LOCKED = 5000.0;

/**
 * Parser para a aba Gerenciador
 */
export function parseGerenciador(rows: (string | number | null)[][]): Transaction[] {
  const transactions: Transaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const tipoRaw = String(row[0] || '').trim();
    if (!tipoRaw || (tipoRaw !== 'Saída' && tipoRaw !== 'Recebimento')) {
      continue;
    }

    const categoria = String(row[1] || 'Geral').trim();
    const data = String(row[2] || '').trim();
    const descricao = String(row[3] || '').trim();
    const valorRaw = row[4];
    const valor = Math.abs(parseCurrency(valorRaw));
    if (valor === 0 && !descricao) continue;

    const parcelas = String(row[5] || '').trim();
    const formato = String(row[6] || '').trim();
    const dataVenc = String(row[7] || data || '').trim();
    const dataPgto = String(row[8] || '').trim();
    const status = String(row[9] || 'Pendente').trim();

    // Identificação de quem é a responsabilidade
    let quem: Payer = 'DIV';
    if (parcelas) {
      quem = normalizePayer(parcelas);
    } else {
      quem = normalizePayer(`${descricao} ${formato}`);
    }

    const dateInfo = parseDateComponents(dataVenc) || parseDateComponents(data);
    const isFormatoConta = formato.toLowerCase() === 'conta';
    const isTransferenciaLeticia = descricao.toLowerCase().startsWith('contas ');

    transactions.push({
      id: `gerenciador-${i}`,
      tipo: tipoRaw as 'Recebimento' | 'Saída',
      categoria,
      data,
      descricao,
      valor,
      parcelas,
      formato,
      dataVenc,
      dataPgto,
      status,
      quem,
      mesPagamento: dateInfo?.mesAno,
      diaVencimento: dateInfo?.dia || 1,
      isFormatoConta,
      isTransferenciaLeticia,
    });
  }

  return transactions;
}

/**
 * Parser para as abas de Cartões (Fatura Sicredi e Fatura C6)
 */
export function parseCardsData(
  sicrediRows: (string | number | null)[][],
  c6Rows: (string | number | null)[][]
): CardTransaction[] {
  const cardTxList: CardTransaction[] = [];

  // 1. Fatura Sicredi
  for (let i = 1; i < sicrediRows.length; i++) {
    const row = sicrediRows[i];
    if (!row || row.length < 5) continue;

    const cartao = String(row[0] || 'Sicredi').trim();
    if (!cartao || cartao.toLowerCase().includes('resumo') || cartao.toLowerCase().includes('total')) {
      continue;
    }

    const data = String(row[1] || '').trim();
    const cidade = String(row[2] || '').trim();
    const tipoCompra = String(row[3] || '').trim();
    const descricao = String(row[4] || '').trim();
    const parcelaRaw = String(row[5] || '').trim();
    const valor = Math.abs(parseCurrency(row[6]));
    const quemRaw = String(row[7] || 'DIV').trim();
    const dataPagamento = String(row[8] || '').trim();

    if (valor === 0 && !descricao) continue;

    const installmentInfo = extractInstallments(descricao, parcelaRaw);

    cardTxList.push({
      id: `sicredi-${i}`,
      origem: 'Sicredi',
      cartao,
      data,
      cidade,
      tipoCompra,
      descricao,
      valor,
      quem: normalizePayer(quemRaw),
      dataPagamento,
      parcelaTexto: installmentInfo?.texto || parcelaRaw,
      parcelaAtual: installmentInfo?.atual,
      totalParcelas: installmentInfo?.total,
      parcelasRestantes: installmentInfo?.restantes,
    });
  }

  // 2. Fatura C6
  for (let i = 1; i < c6Rows.length; i++) {
    const row = c6Rows[i];
    if (!row || row.length < 4) continue;

    const data = String(row[0] || '').trim();
    const cartao = String(row[1] || 'C6 Bank').trim();
    const descricao = String(row[2] || '').trim();
    const valor = Math.abs(parseCurrency(row[3]));
    const dataPagamento = String(row[4] || '').trim();
    const quemRaw = String(row[5] || 'DIV').trim();

    if (valor === 0 && !descricao) continue;
    if (cartao.toLowerCase().includes('resumo') || cartao.toLowerCase().includes('total')) continue;

    const installmentInfo = extractInstallments(descricao);

    cardTxList.push({
      id: `c6-${i}`,
      origem: 'C6',
      cartao,
      data,
      descricao,
      valor,
      quem: normalizePayer(quemRaw),
      dataPagamento,
      parcelaTexto: installmentInfo?.texto,
      parcelaAtual: installmentInfo?.atual,
      totalParcelas: installmentInfo?.total,
      parcelasRestantes: installmentInfo?.restantes,
    });
  }

  return cardTxList;
}

/**
 * Parser para abas Salario V e Salario L
 */
export function parseSalaries(
  vRows: (string | number | null)[][],
  lRows: (string | number | null)[][]
): {
  victorMonths: SalaryMonthData[];
  leticiaMonths: SalaryMonthData[];
} {
  const parseSheet = (rows: (string | number | null)[][]): SalaryMonthData[] => {
    if (!rows || rows.length < 2) return [];

    const header = rows[0] || [];
    const months: SalaryMonthData[] = [];

    const rowMap: Record<string, (string | number | null)[]> = {};
    for (const r of rows) {
      if (!r || !r[0]) continue;
      const key = String(r[0]).trim().toLowerCase();
      rowMap[key] = r;
    }

    for (let c = 1; c < header.length; c++) {
      const mesName = String(header[c] || '').trim();
      if (!mesName || mesName.length > 5 || mesName.includes('/')) continue;

      const getVal = (keyStart: string): number => {
        const foundKey = Object.keys(rowMap).find(k => k.startsWith(keyStart));
        if (foundKey && rowMap[foundKey]) {
          return Math.abs(parseCurrency(rowMap[foundKey][c]));
        }
        return 0;
      };

      const subsidio = getVal('sub') || getVal('subsidio') || getVal('subsídio');
      const substituicao = getVal('substitui');
      const ferias = getVal('férias') || getVal('ferias');
      const horasExtras = getVal('horas-extra') || getVal('horas');
      const decimoRetroativo = getVal('13º') || getVal('decimo');
      const diarias = getVal('diarias') || getVal('diárias');
      const totalVantagens = getVal('total vantagens');
      const totalDescontos = getVal('total descontos');
      const impostoRenda = getVal('imposto de renda');
      const ipeSaude = getVal('ipe saude') || getVal('ipe saúde');
      const ipePrev = getVal('ipe prev');
      const ipePrevRetroativo = getVal('ipe prev retroativo');
      const auxilioRefeicao = getVal('auxilio refeição') || getVal('aux refeição');
      const liquido = getVal('liquido') || getVal('líquido');

      let consignados = 0;
      for (const k of Object.keys(rowMap)) {
        if (k.startsWith('emp')) {
          consignados += Math.abs(parseCurrency(rowMap[k][c]));
        }
      }

      const gboex = getVal('gboex');

      months.push({
        mes: mesName,
        mesIndex: c,
        subsidio,
        substituicao,
        ferias,
        horasExtras,
        decimoRetroativo,
        diarias,
        totalVantagens: totalVantagens || (subsidio + substituicao + ferias + horasExtras),
        totalDescontos: totalDescontos || (impostoRenda + ipeSaude + ipePrev + consignados),
        impostoRenda,
        ipeSaude,
        ipePrev,
        ipePrevRetroativo,
        auxilioRefeicao,
        consignados,
        gboex,
        liquido: liquido || Math.max(0, subsidio - totalDescontos),
      });
    }

    return months;
  };

  return {
    victorMonths: parseSheet(vRows),
    leticiaMonths: parseSheet(lRows),
  };
}

/**
 * Parser para a aba Poupança
 */
export function parsePoupanca(rows: (string | number | null)[][]): {
  items: SavingsItem[];
  totalEmConta: number;
  reservaEmergencia: number;
  saldoLivre: number;
  carroMeta: {
    valorCarro: number;
    entrada: number;
    financiamento: number;
    ipva: number;
  };
} {
  const items: SavingsItem[] = [];
  let totalEmConta = 12263.0;
  let valorCarro = 109900.0;
  let entradaCarro = 45000.0;
  let financiamentoCarro = 64900.0;
  let ipvaCarro = 2544.26;

  if (rows.length > 0 && rows[0].length >= 6) {
    const val = parseCurrency(rows[0][5]);
    if (val > 0) totalEmConta = val;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const descricao = String(row[0] || '').trim();
    const data = String(row[1] || '').trim();
    const valorReal = parseCurrency(row[2]);
    const previsao = parseCurrency(row[3]);

    if (!descricao && valorReal === 0 && previsao === 0) continue;

    const descLower = descricao.toLowerCase();
    const isEmergencia = descLower.includes('emergencia') || descLower.includes('emergência');
    const isDifa = descLower.includes('difa');
    const isCarro = descLower.includes('carro');
    const isIpva = descLower.includes('ipva');

    const valorEfetivo = valorReal !== 0 ? valorReal : previsao;
    const isEntrada = valorEfetivo > 0;

    items.push({
      id: `poupanca-${i}`,
      descricao,
      data,
      valor: valorEfetivo,
      previsao: previsao !== 0 ? previsao : undefined,
      isEmergencia,
      isDifa,
      isCarro,
      isIpva,
      isEntrada,
    });

    if (row.length >= 8) {
      const colG = String(row[6] || '').toLowerCase();
      const colH = parseCurrency(row[7]);
      if (colG.includes('valor carro') && colH > 0) valorCarro = colH;
      if (colG.includes('entrada') && colH !== 0) entradaCarro = Math.abs(colH);
      if (colG.includes('financiado') && colH > 0) financiamentoCarro = colH;
    }
  }

  const reservaEmergencia = EMERGENCY_RESERVE_LOCKED;
  const saldoLivre = Math.max(0, totalEmConta - reservaEmergencia);

  return {
    items,
    totalEmConta,
    reservaEmergencia,
    saldoLivre,
    carroMeta: {
      valorCarro,
      entrada: entradaCarro,
      financiamento: financiamentoCarro,
      ipva: ipvaCarro,
    },
  };
}

/**
 * Calcula o fechamento mensal, KPIs e o acerto exato entre Victor e Letícia para um mês/ano selecionado
 */
export function calculateMonthSummary(
  targetMesAno: string, // ex: "11/2026"
  transactions: Transaction[],
  cards: CardTransaction[],
  salaries: { victorMonths: SalaryMonthData[]; leticiaMonths: SalaryMonthData[] },
  poupancaTotal: number
): MonthSummary {
  const monthTx = transactions.filter(t => t.mesPagamento === targetMesAno);

  const [targetMes, targetAno] = targetMesAno.split('/');
  const mesIndex = parseInt(targetMes, 10);

  const sV = salaries.victorMonths[mesIndex - 1] || salaries.victorMonths[salaries.victorMonths.length - 1];
  const sL = salaries.leticiaMonths[mesIndex - 1] || salaries.leticiaMonths[salaries.leticiaMonths.length - 1];

  const salaryTxV = monthTx.find(t => t.tipo === 'Recebimento' && t.quem === 'VIC' && t.descricao.toLowerCase().includes('subsidio'));
  const salaryTxL = monthTx.find(t => t.tipo === 'Recebimento' && t.quem === 'LE' && t.descricao.toLowerCase().includes('subsidio'));

  const receitaVictor = salaryTxV?.valor || sV?.liquido || 4909.99;
  const receitaLeticia = salaryTxL?.valor || sL?.liquido || 4692.89;
  const receitaTotal = receitaVictor + receitaLeticia;

  // Vale-Refeição dia 20
  const vrTx = monthTx.filter(t => t.tipo === 'Recebimento' && (t.categoria.toLowerCase().includes('aliment') || t.descricao.toLowerCase().includes('vale')));
  const vrTotal = vrTx.length > 0 ? vrTx.reduce((acc, curr) => acc + curr.valor, 0) : 852.0;
  const vrVictor = 426.0;
  const vrLeticia = vrTotal - vrVictor;

  // 1. Visão Conta Real do Victor (o que tem formato "Conta")
  const itensContaReal = monthTx.filter(t => t.isFormatoConta);
  const entradasContaVictor = itensContaReal
    .filter(t => t.tipo === 'Recebimento')
    .reduce((acc, curr) => acc + curr.valor, 0) || (receitaVictor + vrVictor);

  const saidasContaVictor = itensContaReal
    .filter(t => t.tipo === 'Saída')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const saldoContaRealVictor = entradasContaVictor - saidasContaVictor;

  // Transferência de pacote para Letícia ("Contas novembro", "Contas outubro", etc.)
  const itemTransLeticia = monthTx.find(t => t.isTransferenciaLeticia);
  const transferenciaLeticia = itemTransLeticia?.valor || 0;

  // 2. Visão Despesas Reais da Família (sem duplicar o pacote de transferência para a Letícia)
  const saidasMonth = monthTx.filter(t => t.tipo === 'Saída');
  const saidasSemPacote = saidasMonth.filter(t => !t.isTransferenciaLeticia);
  const despesasReaisFamilia = saidasSemPacote.reduce((acc, curr) => acc + curr.valor, 0);

  // Total de saídas incluindo o pacote (para referência da tabela)
  const saidasTotal = saidasMonth.reduce((acc, curr) => acc + curr.valor, 0);

  const saidasVIC = saidasSemPacote.filter(t => t.quem === 'VIC').reduce((acc, curr) => acc + curr.valor, 0);
  const saidasLE = saidasSemPacote.filter(t => t.quem === 'LE').reduce((acc, curr) => acc + curr.valor, 0);
  const saidasDIV = saidasSemPacote.filter(t => t.quem === 'DIV' || t.quem === 'RP' || t.quem === 'OUTROS').reduce((acc, curr) => acc + curr.valor, 0);

  // Saldos consolidados da família
  const saldoComVR = (receitaTotal + vrTotal) - despesasReaisFamilia;
  const saldoSemVR = receitaTotal - despesasReaisFamilia;

  // Objeto da Conta Real
  const contaRealVictor: ContaRealVictorInfo = {
    entradasTotal: entradasContaVictor,
    saidasTotal: saidasContaVictor,
    saldoFinal: saldoContaRealVictor,
    transferenciaLeticia,
    subsidio: receitaVictor,
    valeAlimentacao: vrVictor,
    itensConta: itensContaReal,
  };

  // Acerto Mensal (Divisão de Despesas e Cartões)
  let gastoDiretoVictor = 0;
  let gastoDiretoLeticia = 0;

  for (const t of saidasMonth) {
    const descLower = t.descricao.toLowerCase();
    const formatoLower = t.formato.toLowerCase();

    if (descLower.includes('leh') || descLower.includes('leticia') || formatoLower.includes('leh')) {
      gastoDiretoLeticia += t.valor;
    } else {
      gastoDiretoVictor += t.valor;
    }
  }

  const currentMonthCards = cards.filter(c => {
    const dInfo = parseDateComponents(c.dataPagamento);
    return dInfo?.mesAno === targetMesAno;
  });

  for (const c of currentMonthCards) {
    if (c.cartao.toLowerCase().includes('leticia')) {
      gastoDiretoLeticia += c.valor;
    } else {
      gastoDiretoVictor += c.valor;
    }
  }

  const cotaVictor = saidasVIC + (saidasDIV / 2);
  const cotaLeticia = saidasLE + (saidasDIV / 2);

  const saldoVictor = gastoDiretoVictor - cotaVictor;
  const saldoLeticia = gastoDiretoLeticia - cotaLeticia;

  let devedor: 'Victor' | 'Letícia' | 'Nenhum' = 'Nenhum';
  let credor: 'Victor' | 'Letícia' | 'Nenhum' = 'Nenhum';
  let valorTransferencia = 0;
  let explicacao = 'As contas estão equilibradas.';

  if (Math.abs(saldoVictor) > 0.01) {
    if (saldoVictor > 0) {
      credor = 'Victor';
      devedor = 'Letícia';
      valorTransferencia = saldoVictor;
      explicacao = `Letícia deve transferir ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTransferencia)} para Victor fechar as contas do mês.`;
    } else {
      credor = 'Letícia';
      devedor = 'Victor';
      valorTransferencia = Math.abs(saldoVictor);
      explicacao = `Victor deve transferir ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTransferencia)} para Letícia fechar as contas do mês.`;
    }
  }

  const acerto: AcertoMensal = {
    gastoDiretoVictor,
    gastoDiretoLeticia,
    cotaVictor,
    cotaLeticia,
    saldoVictor,
    saldoLeticia,
    devedor,
    credor,
    valorTransferencia,
    explicacao,
  };

  // Linha do tempo dia a dia baseada nos movimentos reais da conta
  const timelineDays = buildDailyTimeline(targetMesAno, itensContaReal.length > 0 ? itensContaReal : monthTx, receitaVictor);

  let hasNegativeBeforeDay20 = false;
  let lowestBalanceBeforeDay20 = Infinity;
  let dayLowestBalance = 1;

  for (const day of timelineDays) {
    if (day.dia < 20) {
      if (day.saldoAcumulado < lowestBalanceBeforeDay20) {
        lowestBalanceBeforeDay20 = day.saldoAcumulado;
        dayLowestBalance = day.dia;
      }
      // Alerta apenas se a conta real realmente fica negativa com margem de tolerância
      if (day.saldoAcumulado < -50) {
        hasNegativeBeforeDay20 = true;
      }
    }
  }

  const reservaEmergencia = EMERGENCY_RESERVE_LOCKED;
  const poupancaLivre = Math.max(0, poupancaTotal - reservaEmergencia);

  return {
    mesAno: targetMesAno,
    label: getMonthYearLabel(targetMesAno),
    receitaVictor,
    receitaLeticia,
    receitaTotal,
    saidasTotal,
    saidasVIC,
    saidasLE,
    saidasDIV,
    saldoComVR,
    saldoSemVR,
    vrVictor,
    vrLeticia,
    vrTotal,
    acerto,
    poupancaTotal,
    reservaEmergencia,
    poupancaLivre,
    timelineDays,
    hasNegativeBeforeDay20,
    lowestBalanceBeforeDay20: lowestBalanceBeforeDay20 === Infinity ? 0 : lowestBalanceBeforeDay20,
    dayLowestBalance,
    contaRealVictor,
    despesasReaisFamilia,
    saldoConsolidadoFamilia: saldoComVR,
  };
}

/**
 * Constrói a linha do tempo dia a dia do fluxo de caixa no mês
 */
function buildDailyTimeline(
  mesAno: string,
  transactions: Transaction[],
  salarioInicialRecebido: number
): DailyCashFlow[] {
  const daysMap: Record<number, { entradas: number; saidas: number; itens: Transaction[] }> = {};

  for (let d = 1; d <= 31; d++) {
    daysMap[d] = { entradas: 0, saidas: 0, itens: [] };
  }

  daysMap[1].entradas += salarioInicialRecebido;

  for (const tx of transactions) {
    const dia = tx.diaVencimento || 1;
    if (dia >= 1 && dia <= 31) {
      if (tx.tipo === 'Recebimento') {
        if (!tx.descricao.toLowerCase().includes('subsidio')) {
          daysMap[dia].entradas += tx.valor;
        }
      } else {
        daysMap[dia].saidas += tx.valor;
      }
      daysMap[dia].itens.push(tx);
    }
  }

  const result: DailyCashFlow[] = [];
  let saldoAcumulado = 0;

  for (let d = 1; d <= 31; d++) {
    const info = daysMap[d];
    const saldoDia = info.entradas - info.saidas;
    saldoAcumulado += saldoDia;

    const dataStr = `${String(d).padStart(2, '0')}/${mesAno}`;
    const temAlertaNegativo = d < 20 && saldoAcumulado < -50;

    result.push({
      dia: d,
      dataStr,
      entradas: info.entradas,
      saidas: info.saidas,
      saldoDia,
      saldoAcumulado,
      itens: info.itens,
      temAlertaNegativo,
    });
  }

  return result;
}

/**
 * Radar de parcelas futuras: projeta quanto de limite/caixa será liberado nos próximos meses
 */
export function calculateFutureReleases(cards: CardTransaction[]): FutureInstallmentRelease[] {
  const futureMonths: FutureInstallmentRelease[] = [];
  const installmentTx = cards.filter(c => c.totalParcelas && c.totalParcelas > 1);
  const baseDate = new Date();
  
  for (let m = 1; m <= 6; m++) {
    const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + m, 1);
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = targetDate.getFullYear();
    const mesAno = `${mm}/${yyyy}`;

    let valorLiberado = 0;
    let valorRestante = 0;
    const itensConcluidos: { descricao: string; valor: number; cartao: string; quem: Payer }[] = [];

    for (const tx of installmentTx) {
      const restantes = tx.parcelasRestantes ?? 0;
      if (restantes > 0 && restantes <= m) {
        valorLiberado += tx.valor;
        itensConcluidos.push({
          descricao: tx.descricao,
          valor: tx.valor,
          cartao: tx.cartao,
          quem: tx.quem,
        });
      } else if (restantes > m) {
        valorRestante += tx.valor;
      }
    }

    futureMonths.push({
      mesAno,
      label: getMonthYearLabel(mesAno),
      valorLiberadoTotal: valorLiberado,
      valorRestanteFaturas: valorRestante,
      itensConcluidos,
    });
  }

  return futureMonths;
}

/**
 * Simulador de Cenários de Contracheque
 */
export function simulateSalary(
  baseSalary: SalaryMonthData,
  params: SimulationParams,
  person: 'Victor' | 'Leticia'
): SalaryMonthData {
  const sim = { ...baseSalary };

  if (person === 'Victor') {
    if (params.adicionarSubstituicaoVictor) {
      let valorSub = 1903.76;
      if (params.tipoSubstituicaoVictor === '2Sgt') valorSub = 1393.78;
      if (params.tipoSubstituicaoVictor === '1Ten') valorSub = 3584.09;
      if (params.valorSubstituicaoCustom > 0) valorSub = params.valorSubstituicaoCustom;

      sim.substituicao = valorSub;
    }

    if (params.simularDiarias && params.valorDiarias > 0) {
      sim.diarias = params.valorDiarias;
    }

    sim.totalVantagens = sim.subsidio + sim.substituicao + sim.ferias + sim.horasExtras + sim.diarias;
    const aumentoBruto = sim.substituicao - baseSalary.substituicao;
    const aumentoDescontos = aumentoBruto > 0 ? aumentoBruto * 0.35 : 0;
    sim.totalDescontos = baseSalary.totalDescontos + aumentoDescontos;
    sim.liquido = Math.max(0, sim.totalVantagens - sim.totalDescontos);
  } else {
    if (params.adicionarHEleticia && params.horasExtrasLeticiaQtd > 0) {
      const valorHora = params.valorHoraExtraLeticia || 46.37;
      const valorTotalHE = params.horasExtrasLeticiaQtd * valorHora;
      sim.horasExtras = valorTotalHE;
    }

    sim.totalVantagens = sim.subsidio + sim.substituicao + sim.ferias + sim.horasExtras;
    const aumentoBruto = sim.horasExtras - baseSalary.horasExtras;
    const aumentoDescontos = aumentoBruto > 0 ? aumentoBruto * 0.30 : 0;
    sim.totalDescontos = baseSalary.totalDescontos + aumentoDescontos;
    sim.liquido = Math.max(0, sim.totalVantagens - sim.totalDescontos);
  }

  return sim;
}
