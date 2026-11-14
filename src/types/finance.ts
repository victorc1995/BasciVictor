export type Payer = 'VIC' | 'LE' | 'DIV' | 'RP' | 'OUTROS';

export interface Transaction {
  id: string;
  tipo: 'Recebimento' | 'Saída';
  categoria: string;
  data: string;
  descricao: string;
  valor: number;
  parcelas: string;
  formato: string;
  dataVenc: string;
  dataPgto: string;
  status: string;
  quem: Payer;
  mesCompra?: string;
  mesPagamento?: string;
  diaVencimento?: number;
}

export interface CardTransaction {
  id: string;
  origem: 'Sicredi' | 'C6';
  cartao: string;
  data: string;
  cidade?: string;
  tipoCompra?: string;
  descricao: string;
  valor: number;
  quem: Payer;
  dataPagamento: string;
  parcelaTexto?: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  parcelasRestantes?: number;
}

export interface SalaryMonthData {
  mes: string;
  mesIndex: number;
  subsidio: number;
  substituicao: number;
  ferias: number;
  horasExtras: number;
  decimoRetroativo: number;
  diarias: number;
  totalVantagens: number;
  totalDescontos: number;
  impostoRenda: number;
  ipeSaude: number;
  ipePrev: number;
  ipePrevRetroativo: number;
  auxilioRefeicao: number;
  consignados: number;
  gboex: number;
  liquido: number;
}

export interface SavingsItem {
  id: string;
  descricao: string;
  data: string;
  valor: number;
  previsao?: number;
  isEmergencia: boolean;
  isDifa: boolean;
  isCarro: boolean;
  isIpva: boolean;
  isEntrada: boolean;
}

export interface AcertoMensal {
  gastoDiretoVictor: number;
  gastoDiretoLeticia: number;
  cotaVictor: number;
  cotaLeticia: number;
  saldoVictor: number;
  saldoLeticia: number;
  devedor: 'Victor' | 'Letícia' | 'Nenhum';
  credor: 'Victor' | 'Letícia' | 'Nenhum';
  valorTransferencia: number;
  explicacao: string;
}

export interface MonthSummary {
  mesAno: string; // MM/YYYY
  label: string; // Ex: Novembro 2026
  receitaVictor: number;
  receitaLeticia: number;
  receitaTotal: number;
  saidasTotal: number;
  saidasVIC: number;
  saidasLE: number;
  saidasDIV: number;
  saldoComVR: number;
  saldoSemVR: number;
  vrVictor: number;
  vrLeticia: number;
  vrTotal: number;
  acerto: AcertoMensal;
  poupancaTotal: number;
  reservaEmergencia: number;
  poupancaLivre: number;
  timelineDays: DailyCashFlow[];
  hasNegativeBeforeDay20: boolean;
  lowestBalanceBeforeDay20: number;
  dayLowestBalance: number;
}

export interface DailyCashFlow {
  dia: number;
  dataStr: string;
  entradas: number;
  saidas: number;
  saldoDia: number;
  saldoAcumulado: number;
  itens: Transaction[];
  temAlertaNegativo: boolean;
}

export interface FutureInstallmentRelease {
  mesAno: string;
  label: string;
  valorLiberadoTotal: number;
  valorRestanteFaturas: number;
  itensConcluidos: {
    descricao: string;
    valor: number;
    cartao: string;
    quem: Payer;
  }[];
}

export interface SimulationParams {
  adicionarSubstituicaoVictor: boolean;
  tipoSubstituicaoVictor: '1Sgt' | '2Sgt' | '1Ten';
  valorSubstituicaoCustom: number;
  adicionarHEleticia: boolean;
  horasExtrasLeticiaQtd: number;
  valorHoraExtraLeticia: number;
  simularDiarias: boolean;
  valorDiarias: number;
}
