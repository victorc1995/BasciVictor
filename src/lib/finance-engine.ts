export type Pagador = "VIC" | "LE" | "DIV";
export type CartaoBanco = "C6 Bank" | "Sicredi";

export interface ContaCasa {
  id: string;
  mesAno: string; // Ex: "2026-11"
  descricao: string;
  categoria: "Luz" | "Água" | "Internet" | "Telefone" | "Aluguel" | "Carro" | "Fatura Cartão" | "Outros";
  valor: number;
  vencimento: string;
  quemPaga: Pagador;
  pago: boolean;
  status?: "CONFIRMADO" | "PREVISTO";
  recorrente?: boolean;
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

export interface ContrachequeConfirmadoMes {
  victorConfirmado: boolean;
  victorValorReal: number;
  leticiaConfirmada: boolean;
  leticiaValorReal: number;
}

export interface ProjecaoMesContas {
  mesAno: string;
  label: string;
  totalContasFixas: number;
  totalFaturaC6: number;
  totalFaturaSicredi: number;
  totalGeral: number;
  isConfirmado: boolean;
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

export function calcularProjecao6Meses(
  mesBase: string,
  contas: ContaCasa[],
  compras: CompraCartao[]
): ProjecaoMesContas[] {
  const resultado: ProjecaoMesContas[] = [];

  // Contas recorrentes base (ex: mês selecionado)
  const contasBase = contas.filter((c) => c.mesAno === mesBase && c.categoria !== "Fatura Cartão");

  for (let offset = 0; offset < 6; offset++) {
    const mesAlvo = somarMeses(mesBase, offset);
    const label = formatarMesAnoLabel(mesAlvo);

    // Contas cadastradas para este mês específico
    let contasDoMes = contas.filter((c) => c.mesAno === mesAlvo && c.categoria !== "Fatura Cartão");
    
    // Se for mês futuro e não houver contas cadastradas, projeta as fixas da base como PREVISTO
    if (contasDoMes.length === 0 && offset > 0) {
      contasDoMes = contasBase.map((c) => ({
        ...c,
        id: `proj-${mesAlvo}-${c.id}`,
        mesAno: mesAlvo,
        vencimento: `${mesAlvo}-${c.vencimento.slice(8) || "10"}`,
        status: "PREVISTO" as const,
        pago: false,
      }));
    }

    const totalContasFixas = contasDoMes.reduce((acc, c) => acc + c.valor, 0);

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
        parcelasProjetadas.push({
          id: c.id,
          descricao: c.descricao,
          banco: c.banco,
          titularCartao: c.titularCartao,
          parcelaAtual: pInfo ? pInfo.atual : 1,
          totalParcelas: pInfo ? pInfo.total : 1,
          valor: c.valor,
          quemPaga: c.quemPaga,
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
            parcelasProjetadas.push({
              id: `${c.id}-off${offset}`,
              descricao: c.descricao,
              banco: c.banco,
              titularCartao: c.titularCartao,
              parcelaAtual: parcelaFutura,
              totalParcelas: pInfo.total,
              valor: c.valor,
              quemPaga: c.quemPaga,
            });
          }
        }
      }
    }

    // Se o usuário adicionou explicitamente uma conta de Fatura Cartão confirmada no mês
    const faturasCadastradas = contas.filter(
      (c) => c.mesAno === mesAlvo && c.categoria === "Fatura Cartão"
    );
    const hasFaturaConfirmada = faturasCadastradas.length > 0;
    const valorFaturaCadastrada = faturasCadastradas.reduce((acc, f) => acc + f.valor, 0);

    const totalCartoes = hasFaturaConfirmada
      ? valorFaturaCadastrada
      : totalFaturaC6 + totalFaturaSicredi;

    resultado.push({
      mesAno: mesAlvo,
      label,
      totalContasFixas,
      totalFaturaC6,
      totalFaturaSicredi,
      totalGeral: totalContasFixas + totalCartoes,
      isConfirmado: offset === 0 || hasFaturaConfirmada,
      contas: contasDoMes,
      parcelasProjetadas,
    });
  }

  return resultado;
}
