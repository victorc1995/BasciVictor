import { Payer } from '@/types/finance';

/**
 * Formata um número para moeda brasileira (BRL).
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte strings de valores monetários da planilha (ex: "R$ 1.234,56", "-R$ 499,00") para number.
 */
export function parseCurrency(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  let s = String(val).trim();
  let isNegative = false;
  if (s.startsWith('-') || s.includes('(') && s.includes(')')) {
    isNegative = true;
  }
  
  // Remove R$, espaços, parênteses e caracteres não numéricos exceto vírgula, ponto e sinal
  s = s.replace(/[R$\s()]/g, '');
  if (s.startsWith('-')) {
    isNegative = true;
    s = s.substring(1);
  }
  
  // Trata formato brasileiro: ponto como milhar, vírgula como decimal
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

/**
 * Normaliza o pagador / divisão da despesa.
 */
export function normalizePayer(rawPayer: any): Payer {
  if (!rawPayer) return 'DIV';
  const clean = String(rawPayer).trim().toLowerCase();

  if (clean.includes('vic') || clean === 'v' || clean.includes('victor')) {
    return 'VIC';
  }
  if (clean.includes('leh') || clean.includes('le') || clean.includes('leticia') || clean.includes('letícia')) {
    return 'LE';
  }
  if (clean.includes('div') || clean === 'd' || clean.includes('compartilhado')) {
    return 'DIV';
  }
  if (clean.includes('rp')) {
    return 'RP';
  }
  return 'DIV';
}

/**
 * Extrai informações de parcelas de textos como "OTICAS CAROL - Parcela 9/10", "04/06", "3x6", etc.
 */
export function extractInstallments(text: string, fallbackCol?: string): {
  atual: number;
  total: number;
  texto: string;
  restantes: number;
} | null {
  const combined = `${text} ${fallbackCol || ''}`.trim();

  // Caso 1: "Parcela 9/10" ou "(Parcela 2/4)"
  const regexParcela = /Parcela\s*(\d+)\s*\/\s*(\d+)/i;
  const match1 = combined.match(regexParcela);
  if (match1) {
    const atual = parseInt(match1[1], 10);
    const total = parseInt(match1[2], 10);
    if (!isNaN(atual) && !isNaN(total) && total > 0) {
      return {
        atual,
        total,
        texto: `${atual}/${total}`,
        restantes: Math.max(0, total - atual),
      };
    }
  }

  // Caso 2: Padrão "04/06" isolado
  const regexSlash = /(?:^|\s|\()(\d{1,2})\/(\d{1,2})(?:$|\s|\))/;
  const match2 = combined.match(regexSlash);
  if (match2) {
    const atual = parseInt(match2[1], 10);
    const total = parseInt(match2[2], 10);
    // Validação para evitar confundir com datas como 12/06
    if (!isNaN(atual) && !isNaN(total) && total > 1 && total <= 72 && atual <= total) {
      return {
        atual,
        total,
        texto: `${atual}/${total}`,
        restantes: Math.max(0, total - atual),
      };
    }
  }

  // Caso 3: Padrão "3x6" (ex: passagem SP 3x6)
  const regexX = /(\d{1,2})\s*x\s*(\d{1,2})/i;
  const match3 = combined.match(regexX);
  if (match3) {
    const atual = parseInt(match3[1], 10);
    const total = parseInt(match3[2], 10);
    if (!isNaN(atual) && !isNaN(total) && total > 1 && atual <= total) {
      return {
        atual,
        total,
        texto: `${atual}/${total}`,
        restantes: Math.max(0, total - atual),
      };
    }
  }

  return null;
}

/**
 * Converte data em string ("DD/MM/YYYY" ou "DD/mes") para formato seguro ou extrai dia e mês/ano.
 */
export function parseDateComponents(dateStr: string | null | undefined): {
  dia: number;
  mes: number;
  ano: number;
  mesAno: string; // "MM/YYYY"
} | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();

  // Padrão DD/MM/YYYY
  const parts = s.split(/[\/\-\.]/);
  if (parts.length >= 3) {
    const dia = parseInt(parts[0], 10);
    const mes = parseInt(parts[1], 10);
    let ano = parseInt(parts[2], 10);
    if (ano < 100) ano += 2000;
    if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
      const mesPad = String(mes).padStart(2, '0');
      return {
        dia,
        mes,
        ano,
        mesAno: `${mesPad}/${ano}`,
      };
    }
  }

  return null;
}

/**
 * Nome por extenso do mês/ano (ex: "11/2026" -> "Novembro/2026").
 */
export function getMonthYearLabel(mesAno: string): string {
  const [mes, ano] = mesAno.split('/');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const idx = parseInt(mes, 10) - 1;
  if (idx >= 0 && idx < 12) {
    return `${meses[idx]} de ${ano}`;
  }
  return mesAno;
}
