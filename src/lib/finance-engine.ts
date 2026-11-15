export type Pagador = "VIC" | "LE" | "DIV";
export type CartaoBanco = "C6 Bank" | "Sicredi";

export interface ContaCasa {
  id: string;
  mesAno: string; // Ex: "2026-11"
  descricao: string;
  categoria: "Luz" | "Água" | "Internet" | "Telefone" | "Aluguel" | "Carro" | "Fatura Cartão" | "Outros" | (string & {});
  valor: number;
  vencimento: string;
  quemPaga: Pagador;
  pago: boolean;
  status?: "CONFIRMADO" | "PREVISTO";
  recorrente?: boolean;
  parcelada?: boolean;
  parcelaAtual?: number;
  totalParcelas?: number;
}

export interface MovimentacaoPoupanca {
  id: string;
  data: string;
  descricao: string;
  tipo: "ENTRADA" | "SAIDA";
  valor: number;
  categoria: "Reserva Emergência" | "Metas / Projetos" | "Diárias Op. Verão" | "Compensação Banrisul (Difa)" | "13º / Extras" | "Outros";
  status?: "CONFIRMADO" | "PREVISTO";
}

export interface CompraCartao {
  id: string;
  mesFatura: string; // Ex: "2026-11"
  banco: CartaoBanco;
  titularCartao: string;
  dataCompra: string;
  descricao: string;
  parcelaInfo?: string;
  valor: number;
  quemPaga: Pagador;
  isNova?: boolean;
  pagadorDefinido?: boolean;
}

export interface ParametrosSalario {
  subsídioBase: number;
  tipoSubstituicao: "NENHUMA" | "2_SGT" | "1_SGT" | "1_TEN";
  diasSubstituicao: number;
  horasExtrasQtd: number;
  diasFerias: number;
  diariasQtd: number;
  descontoBanrisul: number;
  outrosDescontosFixos: number; // Ex: GBOEX R$ 123,12
  incluirValeRefeicao: boolean;
  dependentesIR: number;
}

export interface ResultadoSalario {
  subsidio: number;
  valorSubstituicao: number;
  valorHorasExtras: number;
  valorFeriasTerco: number;
  valorDiarias: number;
  totalBrutoTributavel: number;
  ipePrev: number;
  ipeSaude: number;
  irrf: number;
  descontosConsignados: number;
  liquidoFolha: number;
  valeRefeicaoIndenizatorio: number;
  totalDisponivelMes: number;
}

// Tabela Oficial RS vigente a partir de 01/10/2026 (Lei Estadual nº 16.165/2024 - 3ª parcela de 4%)
export const TABELA_RS_2026 = {
  SUBSIDIO_SD_1CLASSE: 6429.95, // Valor legal vigente desde 01/10/2026 (pode ser editado para 6459.67 se houver parcela completiva)
  SUBSIDIO_2_SGT: 10319.81,
  SUBSIDIO_1_SGT: 10985.60,
  SUBSIDIO_1_TEN: 14980.39,
  VALE_REFEICAO_MENSAL: 445.19, // Lei 16.041/2023 e Decreto 58.444/2025 (22 dias úteis ~ R$ 445,19)
  VALOR_DIARIA_INTERIOR: 201.01,
  IPE_SAUDE_ALIQUOTA: 0.036, // 3,6% titular
};

// Cálculo Previdência Militar RS (SPSMER - LC 15.602/2021 / IN IPE Prev)
export function calcularIpePrevMilitarRS(basePrevidenciaria: number): number {
  // Tabela progressiva SPSMER / Militares RS:
  // Faixa 1: até 1.518,00 -> 7,5%
  // Faixa 2: 1.518,01 a 2.793,88 -> 9% (dedução 22,77)
  // Faixa 3: 2.793,89 a 4.190,83 -> 12% (dedução 106,59)
  // Faixa 4: 4.190,84 a 8.157,41 -> 14% (dedução 190,40)
  // Faixa 5: 8.157,42 a 13.969,48 -> 14,5% (dedução 231,19)
  if (basePrevidenciaria <= 2793.88) {
    return Math.max(0, basePrevidenciaria * 0.09 - 22.77);
  } else if (basePrevidenciaria <= 4190.83) {
    return basePrevidenciaria * 0.12 - 106.59;
  } else if (basePrevidenciaria <= 8157.41) {
    return basePrevidenciaria * 0.14 - 190.40;
  } else {
    return basePrevidenciaria * 0.145 - 231.19;
  }
}

// Cálculo IRRF Vigente em 2026 (Tabela Progressiva + Lei nº 15.270/2025 - Redutor até R$ 7.350,00)
export function calcularIRRF2026(rendimentoTributavel: number, previdencia: number, dependentes: number): number {
  const deducaoDependentes = dependentes * 189.59;
  // Receita Federal aplica a maior dedução entre as legais (Prev + Dep) e o desconto simplificado mensal (R$ 607,20)
  const totalDeducoes = Math.max(previdencia + deducaoDependentes, 607.20);
  const baseCalculo = Math.max(0, rendimentoTributavel - totalDeducoes);

  let impostoTabela = 0;
  if (baseCalculo <= 2428.80) {
    impostoTabela = 0;
  } else if (baseCalculo <= 2826.65) {
    impostoTabela = baseCalculo * 0.075 - 182.16;
  } else if (baseCalculo <= 3751.05) {
    impostoTabela = baseCalculo * 0.15 - 394.16;
  } else if (baseCalculo <= 4664.68) {
    impostoTabela = baseCalculo * 0.225 - 675.49;
  } else {
    impostoTabela = baseCalculo * 0.275 - 908.73;
  }

  // Redutor adicional da Lei 15.270/2025 (isenção até R$ 5.000 e redução gradual até R$ 7.350)
  let redutorLei2026 = 0;
  if (rendimentoTributavel <= 5000.00) {
    redutorLei2026 = 312.89;
  } else if (rendimentoTributavel <= 7350.00) {
    redutorLei2026 = Math.max(0, 978.62 - 0.133145 * rendimentoTributavel);
  }

  return Math.max(0, Number((impostoTabela - redutorLei2026).toFixed(2)));
}

export function calcularContrachequeRS(params: ParametrosSalario): ResultadoSalario {
  const subsidio = params.subsídioBase;

  // 1. Substituição Temporária (Lei LC 15.454/2020 - proporcional aos dias informados no mês de 30 dias)
  // Diferença de subsídio/posto equivalente na tabela militar RS
  let diferencaMensalPosto = 0;
  if (params.tipoSubstituicao === "2_SGT") {
    diferencaMensalPosto = 1480.00; // Base de diferença entre Sd e 2º Sgt na lei de subsídio RS
  } else if (params.tipoSubstituicao === "1_SGT") {
    diferencaMensalPosto = 1903.00; // Base de diferença entre Sd e 1º Sgt (conforme contracheque 10/2026)
  } else if (params.tipoSubstituicao === "1_TEN") {
    diferencaMensalPosto = 3584.09; // Base de diferença entre Sd e 1º Ten
  }
  const valorSubstituicao = Number(((diferencaMensalPosto / 30) * Math.min(30, Math.max(0, params.diasSubstituicao))).toFixed(2));

  // 2. Horas Extras (GSE - Gratificação de Serviço Extraordinário: Subsídio / 200 * 1,5)
  const valorHoraExtraUnit = (subsidio / 200) * 1.5;
  const valorHorasExtras = Number((valorHoraExtraUnit * Math.max(0, params.horasExtrasQtd)).toFixed(2));

  // 3. Férias (1/3 Constitucional proporcional aos dias de gozo informados: (Subsídio / 3) * (dias / 30))
  const valorFeriasTerco = Number((((subsidio / 3) / 30) * Math.min(30, Math.max(0, params.diasFerias))).toFixed(2));

  // 4. Diárias (Verba indenizatória - isenta de IR e Previdência)
  const valorDiarias = Number((params.diariasQtd * TABELA_RS_2026.VALOR_DIARIA_INTERIOR).toFixed(2));

  // Rendimentos Tributáveis (Subsídio + Substituição + Horas Extras; Férias indenizadas/1/3 tem tributação específica, incluímos na base)
  const totalBrutoTributavel = Number((subsidio + valorSubstituicao + valorHorasExtras + valorFeriasTerco).toFixed(2));

  // Descontos Obrigatórios
  // IPE Prev incide sobre o subsídio permanente (vantagens transitórias como substituição e GSE não sofrem desconto previdenciário)
  const ipePrev = Number(calcularIpePrevMilitarRS(subsidio).toFixed(2));
  const ipeSaude = Number((subsidio * TABELA_RS_2026.IPE_SAUDE_ALIQUOTA).toFixed(2));
  const irrf = calcularIRRF2026(totalBrutoTributavel, ipePrev, params.dependentesIR);

  const descontosConsignados = Number((params.descontoBanrisul + params.outrosDescontosFixos).toFixed(2));
  const liquidoFolha = Number((totalBrutoTributavel - ipePrev - ipeSaude - irrf - descontosConsignados).toFixed(2));
  const valeRefeicaoIndenizatorio = params.incluirValeRefeicao ? TABELA_RS_2026.VALE_REFEICAO_MENSAL : 0;

  return {
    subsidio,
    valorSubstituicao,
    valorHorasExtras,
    valorFeriasTerco,
    valorDiarias,
    totalBrutoTributavel,
    ipePrev,
    ipeSaude,
    irrf,
    descontosConsignados,
    liquidoFolha,
    valeRefeicaoIndenizatorio,
    totalDisponivelMes: Number((liquidoFolha + valeRefeicaoIndenizatorio + valorDiarias).toFixed(2)),
  };
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface RendimentoExtraItem {
  id: string;
  descricao: string;
  valor: number;
}

export interface ContrachequeConfirmadoMes {
  victorConfirmado: boolean;
  victorValorReal: number;
  victorExtras?: RendimentoExtraItem[];
  victorGanhosExtras?: number;
  leticiaConfirmada: boolean;
  leticiaValorReal: number;
  leticiaExtras?: RendimentoExtraItem[];
  leticiaGanhosExtras?: number;
}

export interface ProjecaoMesContas {
  mesAno: string;
  label: string;
  totalContasFixas: number;
  totalFaturaC6: number;
  totalFaturaSicredi: number;
  totalGeral: number;
  isConfirmado: boolean;
  totalParcelasVictor: number;
  totalParcelasLeticia: number;
  totalContasVictor: number;
  totalContasLeticia: number;
  totalGeralVictor: number;
  totalGeralLeticia: number;
  contas: ContaCasa[];
  parcelasProjetadas: {
    id: string;
    descricao: string;
    banco: CartaoBanco;
    titularCartao: string;
    parcelaAtual: number;
    totalParcelas: number;
    valor: number;
    quemPaga: Pagador;
    valorVictor: number;
    valorLeticia: number;
  }[];
}

export interface ProjecaoFaturaCartaoMes {
  mesAno: string;
  label: string;
  banco: CartaoBanco;
  totalFatura: number;
  totalVictor: number;
  totalLeticia: number;
  totalDividido: number;
  totalExclusivoVictor: number;
  totalExclusivoLeticia: number;
  parcelas: {
    id: string;
    descricao: string;
    titularCartao: string;
    parcelaAtual: number;
    totalParcelas: number;
    valor: number;
    quemPaga: Pagador;
    valorVictor: number;
    valorLeticia: number;
  }[];
}

export function somarMeses(mesAno: string, qtd: number): string {
  const [anoStr, mesStr] = mesAno.split("-");
  let ano = parseInt(anoStr, 10);
  let mes = parseInt(mesStr, 10) - 1 + qtd;
  ano += Math.floor(mes / 12);
  mes = ((mes % 12) + 12) % 12 + 1;
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function formatarMesAnoLabel(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const idx = parseInt(mes, 10) - 1;
  return `${meses[idx] || mes}/${ano}`;
}

function parseParcela(info?: string): { atual: number; total: number } | null {
  if (!info) return null;
  const match = info.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return { atual: parseInt(match[1], 10), total: parseInt(match[2], 10) };
}

/**
 * Retorna a lista padrão de contas fixas para um determinado mês,
 * respeitando os novos valores vigentes a partir de Dezembro/2026
 * e a entrada da parcela do Carro (R$ 1.750,00) a partir de 12/01/2027
 */
export function obterContasFixasPadraoMes(mesAlvo: string): ContaCasa[] {
  if (mesAlvo < "2026-12") {
    return [
      { id: `padrao-aluguel-${mesAlvo}`, mesAno: mesAlvo, descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: `${mesAlvo}-05`, quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
      { id: `padrao-iptu-${mesAlvo}`, mesAno: mesAlvo, descricao: "IPTU (9/10)", categoria: "Outros", valor: 115.35, vencimento: `${mesAlvo}-05`, quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true, parcelada: true, parcelaAtual: 9, totalParcelas: 10 },
      { id: `padrao-internet-${mesAlvo}`, mesAno: mesAlvo, descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.69, vencimento: `${mesAlvo}-15`, quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
      { id: `padrao-luz-${mesAlvo}`, mesAno: mesAlvo, descricao: "Energia Elétrica (CEEE Luz)", categoria: "Luz", valor: 301.18, vencimento: `${mesAlvo}-20`, quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
      { id: `padrao-agua-${mesAlvo}`, mesAno: mesAlvo, descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 90.00, vencimento: `${mesAlvo}-20`, quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
      { id: `padrao-carro-${mesAlvo}`, mesAno: mesAlvo, descricao: "Parcela Financiamento Carro", categoria: "Carro", valor: 1100.00, vencimento: `${mesAlvo}-20`, quemPaga: "DIV", pago: false, status: "CONFIRMADO", recorrente: true },
      { id: `padrao-tel-${mesAlvo}`, mesAno: mesAlvo, descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: `${mesAlvo}-10`, quemPaga: "VIC", pago: false, status: "CONFIRMADO", recorrente: true },
    ];
  }

  // A partir de Dezembro/2026:
  // Aluguel R$ 1.329,00 (vencimento dia 05)
  // IPTU R$ 115,35 (em Dezembro é a parcela 10/10)
  // Água R$ 120,00 (vencimento dia 20)
  // Internet Residencial R$ 135,00 (vencimento dia 15)
  // Luz R$ 350,00 (vencimento dia 20)
  // Telefone Celular R$ 64,00 (vencimento dia 10 - Victor)
  const contas: ContaCasa[] = [
    { id: `padrao-aluguel-${mesAlvo}`, mesAno: mesAlvo, descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: `${mesAlvo}-05`, quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: `padrao-agua-${mesAlvo}`, mesAno: mesAlvo, descricao: "Água / Saneamento (Corsan)", categoria: "Água", valor: 120.00, vencimento: `${mesAlvo}-20`, quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: `padrao-internet-${mesAlvo}`, mesAno: mesAlvo, descricao: "Internet Residencial (Vero)", categoria: "Internet", valor: 135.00, vencimento: `${mesAlvo}-15`, quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: `padrao-luz-${mesAlvo}`, mesAno: mesAlvo, descricao: "Energia Elétrica (Luz)", categoria: "Luz", valor: 350.00, vencimento: `${mesAlvo}-20`, quemPaga: "DIV", pago: false, status: "PREVISTO", recorrente: true },
    { id: `padrao-tel-${mesAlvo}`, mesAno: mesAlvo, descricao: "Telefone Celular Vivo", categoria: "Telefone", valor: 64.00, vencimento: `${mesAlvo}-10`, quemPaga: "VIC", pago: false, status: "PREVISTO", recorrente: true },
  ];

  // Em Dezembro/2026 adiciona IPTU parcela 10/10 (última parcela)
  if (mesAlvo === "2026-12") {
    contas.splice(1, 0, {
      id: `padrao-iptu-${mesAlvo}`,
      mesAno: mesAlvo,
      descricao: "IPTU (10/10)",
      categoria: "Outros",
      valor: 115.35,
      vencimento: `${mesAlvo}-05`,
      quemPaga: "DIV",
      pago: false,
      status: "PREVISTO",
      recorrente: true,
      parcelada: true,
      parcelaAtual: 10,
      totalParcelas: 10,
    });
  }

  // A partir de 12/01/2027: Parcela do Carro R$ 1.750,00 (vencimento dia 12)
  if (mesAlvo >= "2027-01") {
    contas.splice(1, 0, {
      id: `padrao-carro-${mesAlvo}`,
      mesAno: mesAlvo,
      descricao: "Parcela do Carro",
      categoria: "Carro",
      valor: 1750.00,
      vencimento: `${mesAlvo}-12`,
      quemPaga: "DIV",
      pago: false,
      status: "PREVISTO",
      recorrente: true,
    });
  }

  return contas;
}

export function calcularProjecao6Meses(
  mesBase: string,
  contas: ContaCasa[],
  compras: CompraCartao[],
  contasExcluidas: string[] = []
): ProjecaoMesContas[] {
  const resultado: ProjecaoMesContas[] = [];
  const setExcluidos = new Set(contasExcluidas);

  for (let offset = 0; offset < 6; offset++) {
    const mesAlvo = somarMeses(mesBase, offset);
    const label = formatarMesAnoLabel(mesAlvo);

    // Contas cadastradas para este mês específico
    const contasEspecificas = contas.filter(
      (c) => c.mesAno === mesAlvo && !setExcluidos.has(c.id)
    );

    let contasDoMes: ContaCasa[] = [];
    if (contasEspecificas.length > 0) {
      contasDoMes = [...contasEspecificas];
    } else {
      const padraoMes = obterContasFixasPadraoMes(mesAlvo).filter(
        (p) => !setExcluidos.has(p.id) && !setExcluidos.has(`${mesAlvo}-${p.descricao}`)
      );
      contasDoMes = padraoMes;
    }

    // Projeta boletos parcelados (ex: Acordo Nubank) para os meses futuros
    if (offset > 0) {
      const contasBaseParceladas = contas.filter((c) => c.mesAno === mesBase && c.parcelada);
      for (const cb of contasBaseParceladas) {
        const atual = cb.parcelaAtual || 1;
        const total = cb.totalParcelas || 1;
        const parcelaFutura = atual + offset;
        if (parcelaFutura <= total) {
          const descBase = cb.descricao.replace(/\s*\(\d+\/\d+\)/, "").trim();
          const jaExiste = contasDoMes.some((c) => c.descricao.toLowerCase().includes(descBase.toLowerCase()));
          const projId = `proj-parc-${cb.id}-${mesAlvo}`;
          if (!jaExiste && !setExcluidos.has(projId) && !setExcluidos.has(cb.id)) {
            contasDoMes.push({
              id: projId,
              mesAno: mesAlvo,
              descricao: `${descBase} (${parcelaFutura}/${total})`,
              categoria: cb.categoria,
              valor: cb.valor,
              vencimento: `${mesAlvo}-${cb.vencimento.slice(8) || "02"}`,
              quemPaga: cb.quemPaga,
              pago: false,
              status: "PREVISTO",
              parcelada: true,
              parcelaAtual: parcelaFutura,
              totalParcelas: total,
            });
          }
        }
      }
    }

    // Garante que nenhuma conta excluída permaneça em contasDoMes
    contasDoMes = contasDoMes.filter((c) => !setExcluidos.has(c.id));

    const totalContasFixas = contasDoMes
      .filter((c) => c.categoria !== "Fatura Cartão")
      .reduce((acc, c) => acc + c.valor, 0);

    // Projeção das parcelas de cartões
    const parcelasProjetadas: ProjecaoMesContas["parcelasProjetadas"] = [];
    let totalFaturaC6 = 0;
    let totalFaturaSicredi = 0;

    for (const c of compras) {
      // Se a compra já pertence diretamente ao mês alvo
      if (c.mesFatura === mesAlvo) {
        if (c.banco === "C6 Bank") totalFaturaC6 += c.valor;
        if (c.banco === "Sicredi") totalFaturaSicredi += c.valor;
        const pInfo = parseParcela(c.parcelaInfo);
        const valorVictor = c.quemPaga === "VIC" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
        const valorLeticia = c.quemPaga === "LE" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
        parcelasProjetadas.push({
          id: c.id,
          descricao: c.descricao,
          banco: c.banco,
          titularCartao: c.titularCartao,
          parcelaAtual: pInfo ? pInfo.atual : 1,
          totalParcelas: pInfo ? pInfo.total : 1,
          valor: c.valor,
          quemPaga: c.quemPaga,
          valorVictor,
          valorLeticia,
        });
        continue;
      }

      // Se a compra foi lançada no mês base e possui parcelas futuras
      if (c.mesFatura === mesBase && c.parcelaInfo && offset > 0) {
        const pInfo = parseParcela(c.parcelaInfo);
        if (pInfo) {
          const parcelaFutura = pInfo.atual + offset;
          if (parcelaFutura <= pInfo.total) {
            if (c.banco === "C6 Bank") totalFaturaC6 += c.valor;
            if (c.banco === "Sicredi") totalFaturaSicredi += c.valor;
            const valorVictor = c.quemPaga === "VIC" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
            const valorLeticia = c.quemPaga === "LE" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
            parcelasProjetadas.push({
              id: `${c.id}-off${offset}`,
              descricao: c.descricao,
              banco: c.banco,
              titularCartao: c.titularCartao,
              parcelaAtual: parcelaFutura,
              totalParcelas: pInfo.total,
              valor: c.valor,
              quemPaga: c.quemPaga,
              valorVictor,
              valorLeticia,
            });
          }
        }
      }
    }

    // Se o usuário adicionou explicitamente uma conta de Fatura Cartão no mês
    const faturasCadastradas = contasDoMes.filter(
      (c) => c.categoria === "Fatura Cartão"
    );
    const hasFaturaConfirmada = faturasCadastradas.length > 0;
    const valorFaturaCadastrada = faturasCadastradas.reduce((acc, f) => acc + f.valor, 0);

    const totalCartoes = hasFaturaConfirmada
      ? valorFaturaCadastrada
      : totalFaturaC6 + totalFaturaSicredi;

    // Separação de Gastos Victor vs Letícia no Mês Projetado
    const totalParcelasVictor = parcelasProjetadas.reduce((acc, p) => acc + p.valorVictor, 0);
    const totalParcelasLeticia = parcelasProjetadas.reduce((acc, p) => acc + p.valorLeticia, 0);

    const totalContasVictor = contasDoMes
      .filter((c) => c.categoria !== "Fatura Cartão")
      .reduce((acc, c) => acc + (c.quemPaga === "VIC" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0), 0);

    const totalContasLeticia = contasDoMes
      .filter((c) => c.categoria !== "Fatura Cartão")
      .reduce((acc, c) => acc + (c.quemPaga === "LE" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0), 0);

    const totalGeralVictor = totalContasVictor + totalParcelasVictor;
    const totalGeralLeticia = totalContasLeticia + totalParcelasLeticia;

    resultado.push({
      mesAno: mesAlvo,
      label,
      totalContasFixas,
      totalFaturaC6,
      totalFaturaSicredi,
      totalGeral: totalContasFixas + totalCartoes,
      isConfirmado: offset === 0 || hasFaturaConfirmada,
      totalParcelasVictor,
      totalParcelasLeticia,
      totalContasVictor,
      totalContasLeticia,
      totalGeralVictor,
      totalGeralLeticia,
      contas: contasDoMes,
      parcelasProjetadas,
    });
  }

  return resultado;
}

/**
 * Projeta as parcelas futuras de um cartão específico (C6 Bank ou Sicredi)
 * separando os valores de Victor e Letícia para cada um dos próximos meses
 */
export function calcularProjecaoParcelasCartao(
  banco: CartaoBanco,
  mesBase: string,
  compras: CompraCartao[]
): ProjecaoFaturaCartaoMes[] {
  const resultado: ProjecaoFaturaCartaoMes[] = [];

  for (let offset = 0; offset < 6; offset++) {
    const mesAlvo = somarMeses(mesBase, offset);
    const label = formatarMesAnoLabel(mesAlvo);
    const parcelasMes: ProjecaoFaturaCartaoMes["parcelas"] = [];

    let totalExclusivoVictor = 0;
    let totalExclusivoLeticia = 0;
    let totalDividido = 0;

    for (const c of compras) {
      if (c.banco !== banco) continue;

      let parcelaAtual = 1;
      let totalParcelas = 1;
      let incluiNoMes = false;

      // 1. Se a compra já pertence diretamente ao mês alvo
      if (c.mesFatura === mesAlvo) {
        incluiNoMes = true;
        const pInfo = parseParcela(c.parcelaInfo);
        if (pInfo) {
          parcelaAtual = pInfo.atual;
          totalParcelas = pInfo.total;
        }
      }
      // 2. Se a compra foi lançada no mês base e possui parcelas futuras
      else if (c.mesFatura === mesBase && c.parcelaInfo && offset > 0) {
        const pInfo = parseParcela(c.parcelaInfo);
        if (pInfo) {
          const prox = pInfo.atual + offset;
          if (prox <= pInfo.total) {
            incluiNoMes = true;
            parcelaAtual = prox;
            totalParcelas = pInfo.total;
          }
        }
      }

      if (incluiNoMes) {
        const valorVictor = c.quemPaga === "VIC" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
        const valorLeticia = c.quemPaga === "LE" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;

        if (c.quemPaga === "VIC") totalExclusivoVictor += c.valor;
        else if (c.quemPaga === "LE") totalExclusivoLeticia += c.valor;
        else totalDividido += c.valor;

        parcelasMes.push({
          id: `${c.id}-off${offset}`,
          descricao: c.descricao,
          titularCartao: c.titularCartao,
          parcelaAtual,
          totalParcelas,
          valor: c.valor,
          quemPaga: c.quemPaga,
          valorVictor,
          valorLeticia,
        });
      }
    }

    const metadeDiv = totalDividido / 2;
    resultado.push({
      mesAno: mesAlvo,
      label,
      banco,
      totalFatura: totalExclusivoVictor + totalExclusivoLeticia + totalDividido,
      totalVictor: totalExclusivoVictor + metadeDiv,
      totalLeticia: totalExclusivoLeticia + metadeDiv,
      totalDividido,
      totalExclusivoVictor,
      totalExclusivoLeticia,
      parcelas: parcelasMes,
    });
  }

  return resultado;
}

export interface StatusVencimento {
  texto: string;
  classe: string;
  diasDiferenca: number;
  atrasada: boolean;
  venceHoje: boolean;
}

export function obterStatusVencimento(vencimento: string, pago: boolean): StatusVencimento {
  if (pago) {
    return {
      texto: "Pago",
      classe: "bg-emerald-50 text-emerald-700 border-emerald-200",
      diasDiferenca: 0,
      atrasada: false,
      venceHoje: false,
    };
  }

  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth();
  const diaHoje = hoje.getDate();
  const msHoje = Date.UTC(anoHoje, mesHoje, diaHoje);

  const partes = (vencimento || "").split("-");
  const anoV = parseInt(partes[0], 10) || anoHoje;
  const mesV = (parseInt(partes[1], 10) || (mesHoje + 1)) - 1;
  const diaV = parseInt(partes[2], 10) || diaHoje;
  const msVenc = Date.UTC(anoV, mesV, diaV);

  const diffMs = msVenc - msHoje;
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    const atraso = Math.abs(diffDias);
    return {
      texto: atraso === 1 ? "Atrasada (1 dia)" : `Atrasada (${atraso} dias)`,
      classe: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
      diasDiferenca: diffDias,
      atrasada: true,
      venceHoje: false,
    };
  }

  if (diffDias === 0) {
    return {
      texto: "Vence Hoje!",
      classe: "bg-amber-100 text-amber-900 border-amber-300 font-black animate-pulse",
      diasDiferenca: 0,
      atrasada: false,
      venceHoje: true,
    };
  }

  if (diffDias === 1) {
    return {
      texto: "Vence Amanhã",
      classe: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
      diasDiferenca: 1,
      atrasada: false,
      venceHoje: false,
    };
  }

  if (diffDias <= 5) {
    return {
      texto: `Vence em ${diffDias} dias`,
      classe: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
      diasDiferenca: diffDias,
      atrasada: false,
      venceHoje: false,
    };
  }

  return {
    texto: `Vence em ${diffDias} dias`,
    classe: "bg-slate-50 text-slate-600 border-slate-200 font-medium",
    diasDiferenca: diffDias,
    atrasada: false,
    venceHoje: false,
  };
}

export function ordenarContasPorUrgencia<T extends { vencimento: string; pago: boolean }>(
  itens: T[]
): T[] {
  return [...itens].sort((a, b) => {
    // 1. Contas não pagas sempre vêm antes das pagas (topo da lista)
    if (a.pago !== b.pago) {
      return a.pago ? 1 : -1;
    }
    // 2. Entre não pagas (ou entre pagas):
    // Ordena por data de vencimento (as mais antigas / mais próximas de hoje primeiro)
    return a.vencimento.localeCompare(b.vencimento);
  });
}
