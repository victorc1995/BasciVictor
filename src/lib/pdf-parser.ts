import { CartaoBanco, CompraCartao, ContaCasa, Pagador } from "./finance-engine";

// Polyfill para navegadores ou ambientes sem Promise.withResolvers
if (typeof Promise !== "undefined" && !(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

interface ItemTextoPDF {
  str: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface DadosContaDetectada {
  descricao: string;
  categoria: ContaCasa["categoria"];
  valor: number;
  vencimento: string; // YYYY-MM-DD
  mesAno: string; // YYYY-MM
  isFaturaCartao: boolean;
  bancoCartao?: CartaoBanco;
  textoCompleto: string;
}

const MESES_MAP: Record<string, string> = {
  jan: "01",
  janeiro: "01",
  fev: "02",
  fevereiro: "02",
  mar: "03",
  marco: "03",
  março: "03",
  abr: "04",
  abril: "04",
  mai: "05",
  maio: "05",
  jun: "06",
  junho: "06",
  jul: "07",
  julho: "07",
  ago: "08",
  agosto: "08",
  set: "09",
  setembro: "09",
  out: "10",
  outubro: "10",
  nov: "11",
  novembro: "11",
  dez: "12",
  dezembro: "12",
};

/**
 * Extrai todo o texto de qualquer PDF no navegador usando pdfjs-dist
 * com suporte resiliente a workers locais / CDN e senhas padrão de faturas
 */
export async function extrairTextoDePDF(file: File, senhaUsuario?: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Configuração resiliente do worker do PDF.js (local primeiro, CDN como fallback)
  if (typeof window !== "undefined") {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    } catch {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      } catch {}
    }
  }

  const arrayBuffer = await file.arrayBuffer();

  // Senhas candidatas comuns em faturas protegidas no Brasil (iniciais de CPF de Victor ou Letícia)
  const senhasCandidatas: (string | undefined)[] = [
    senhaUsuario,
    undefined,
    "032252",
    "017474",
    "03225244074",
    "01747499021",
    "181126",
    "2026",
  ].filter((s, idx, arr) => s !== undefined ? arr.indexOf(s) === idx : true);

  let doc: any = null;
  let ultimoErro: any = null;

  for (const pass of senhasCandidatas) {
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: pass,
      });
      doc = await loadingTask.promise;
      if (doc) break;
    } catch (err: any) {
      ultimoErro = err;
      if (err?.name === "PasswordException") {
        // Tenta próxima senha
        continue;
      }
      break;
    }
  }

  if (!doc) {
    if (ultimoErro?.name === "PasswordException") {
      throw new Error(
        "Este PDF está protegido com senha pelo banco. Por favor, remova a proteção ou informe a senha correta (geralmente os primeiros dígitos do CPF)."
      );
    }
    throw ultimoErro || new Error("Não foi possível carregar o arquivo PDF.");
  }

  let textoCompleto = "";
  const totalPaginas = doc.numPages;

  for (let i = 1; i <= totalPaginas; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: ItemTextoPDF[] = content.items
      .map((it: any) => ({
        str: (it.str || "").trim(),
        x: it.transform?.[4] || 0,
        y: it.transform?.[5] || 0,
        w: it.width || 0,
        h: it.height || 0,
      }))
      .filter((it: any) => it.str.length > 0);

    // Agrupa e ordena itens em linhas visuais reais (Y decrescente, X crescente)
    const linesMap: { y: number; items: ItemTextoPDF[] }[] = [];
    for (const it of items) {
      let line = linesMap.find((l) => Math.abs(l.y - it.y) <= 4);
      if (!line) {
        line = { y: it.y, items: [] };
        linesMap.push(line);
      }
      line.items.push(it);
    }
    linesMap.sort((a, b) => b.y - a.y);
    for (const line of linesMap) {
      line.items.sort((a, b) => a.x - b.x);
      let lineStr = "";
      let lastRight: number | null = null;
      for (const it of line.items) {
        if (it.str === " ") {
          if (!lineStr.endsWith(" ")) lineStr += " ";
          lastRight = it.x + (it.w || 0);
          continue;
        }
        // Se houver espaçamento real (>= 1.2px) entre o fim do caractere anterior e o atual, adiciona espaço
        if (lastRight !== null && (it.x - lastRight >= 1.2)) {
          if (!lineStr.endsWith(" ")) lineStr += " ";
        }
        lineStr += it.str;
        lastRight = it.x + (it.w || 0);
      }
      if (lineStr.trim().length > 0) {
        textoCompleto += lineStr.trim() + "\n";
      }
    }
  }

  return textoCompleto;
}

/**
 * Extrai os dados essenciais de qualquer PDF de conta ou boleto
 */
export async function extrairDadosQualquerPDF(
  file: File,
  senha?: string
): Promise<DadosContaDetectada> {
  const texto = await extrairTextoDePDF(file, senha);
  return analisarTextoBoletoOuConta(texto);
}

/**
 * Identifica Categoria e Emissor com regras e prioridades rigorosas
 */
export function identificarCategoriaEEmissor(texto: string): {
  categoria: ContaCasa["categoria"];
  descricao: string;
  isFaturaCartao: boolean;
  bancoCartao?: CartaoBanco;
} {
  const upper = texto.toUpperCase();

  // 1. FATURAS DE CARTÃO DE CRÉDITO (PRIORIDADE MÁXIMA)
  // Devem vir antes para evitar que "Sicredi Caminho das Águas" caia em Água
  // ou que opções de "Financiamento de fatura" caiam em Carro.
  if (
    upper.includes("SICREDI") ||
    (upper.includes("CARTÃO") && upper.includes("CIDADE") && upper.includes("QUEM")) ||
    (upper.includes("CARTAO") && upper.includes("CIDADE") && upper.includes("QUEM"))
  ) {
    return {
      categoria: "Fatura Cartão",
      descricao: "Fatura Sicredi",
      isFaturaCartao: true,
      bancoCartao: "Sicredi",
    };
  }

  if (
    upper.includes("C6 BANK") ||
    upper.includes("BANCO C6") ||
    upper.includes("C6BANK") ||
    upper.includes("C6 CARBON") ||
    (upper.includes("DESCRIÇÃO DA COMPRA") && upper.includes("QUEM PAGA")) ||
    (upper.includes("DESCRICAO DA COMPRA") && upper.includes("QUEM PAGA")) ||
    (upper.includes("LETICIA RIBEIRO") && upper.includes("VICTOR ROQUE"))
  ) {
    return {
      categoria: "Fatura Cartão",
      descricao: "Fatura C6 Bank",
      isFaturaCartao: true,
      bancoCartao: "C6 Bank",
    };
  }

  if (upper.includes("PICPAY")) {
    return {
      categoria: "Fatura Cartão",
      descricao: "Fatura PicPay",
      isFaturaCartao: true,
      bancoCartao: "C6 Bank",
    };
  }

  if (upper.includes("NUBANK") || upper.includes("NU PAGAMENTOS")) {
    return {
      categoria: "Fatura Cartão",
      descricao: "Fatura Nubank",
      isFaturaCartao: true,
      bancoCartao: "C6 Bank",
    };
  }

  if (
    (upper.includes("TOTAL DA FATURA") ||
      upper.includes("TOTAL FATURA") ||
      upper.includes("PAGAMENTO TOTAL") ||
      upper.includes("FATURA DO CARTÃO") ||
      upper.includes("FATURA DE CARTÃO")) &&
    (upper.includes("MASTERCARD") ||
      upper.includes("VISA") ||
      upper.includes("CARTÃO") ||
      upper.includes("CARTAO") ||
      upper.includes("MELHOR DIA DE COMPRA") ||
      upper.includes("FECHAMENTO DA FATURA"))
  ) {
    return {
      categoria: "Fatura Cartão",
      descricao: "Fatura Cartão de Crédito",
      isFaturaCartao: true,
      bancoCartao: "C6 Bank",
    };
  }

  // 2. ENERGIA ELÉTRICA / LUZ
  if (
    upper.includes("CEEE") ||
    upper.includes("EQUATORIAL") ||
    upper.includes("DISTRIBUIÇÃO ELÉTRICA") ||
    upper.includes("DISTRIBUICAO ELETRICA") ||
    upper.includes("RGE") ||
    upper.includes("CPFL") ||
    upper.includes("ENEL") ||
    upper.includes("CONSUMO KWH") ||
    upper.includes("MD59719010") ||
    (upper.includes("ENERGIA") &&
      (upper.includes("ELETRICA") || upper.includes("ELÉTRICA") || upper.includes("LUZ")))
  ) {
    const desc =
      upper.includes("CEEE") ||
      upper.includes("EQUATORIAL") ||
      upper.includes("DISTRIBUIÇÃO ELÉTRICA")
        ? "Conta de Energia Elétrica (CEEE Equatorial)"
        : "Conta de Energia Elétrica (Luz)";
    return {
      categoria: "Luz",
      descricao: desc,
      isFaturaCartao: false,
    };
  }

  // 3. ÁGUA E SANEAMENTO (CORSAN / DMAE)
  if (
    upper.includes("CORSAN") ||
    upper.includes("DMAE") ||
    upper.includes("SAMAE") ||
    upper.includes("SABESP") ||
    upper.includes("COMPANHIA DE SANEAMENTO") ||
    upper.includes("SERVIÇO DE ÁGUA") ||
    upper.includes("CONTA DE AGUA") ||
    upper.includes("CONTA DE ÁGUA")
  ) {
    return {
      categoria: "Água",
      descricao: upper.includes("CORSAN") ? "Conta de Água (Corsan)" : "Conta de Água / Saneamento",
      isFaturaCartao: false,
    };
  }

  // 4. INTERNET RESIDENCIAL (VERO / FIBRA)
  if (
    upper.includes("VERO") ||
    upper.includes("VERO SA") ||
    upper.includes("VERO FIBRA") ||
    upper.includes("PROVEDOR DE INTERNET") ||
    upper.includes("INTERNET RESIDENCIAL") ||
    upper.includes("BANDA LARGA")
  ) {
    return {
      categoria: "Internet",
      descricao: upper.includes("VERO") ? "Internet Residencial (Vero)" : "Internet Residencial",
      isFaturaCartao: false,
    };
  }

  // 5. TELEFONIA / CELULAR (VIVO / CLARO / TIM)
  if (
    upper.includes("VIVO") ||
    upper.includes("TELEFÔNICA BRASIL") ||
    upper.includes("TELEFONICA BRASIL") ||
    upper.includes("CLARO S.A") ||
    upper.includes("TIM S/A") ||
    upper.includes("TELEFONIA")
  ) {
    return {
      categoria: "Telefone",
      descricao: upper.includes("VIVO")
        ? "Telefonia Móvel (Vivo)"
        : upper.includes("CLARO")
        ? "Telefonia (Claro)"
        : "Telefone / Celular",
      isFaturaCartao: false,
    };
  }

  // 6. ALUGUEL / CONDOMÍNIO / IPTU
  if (
    upper.includes("CONDOMINIO") ||
    upper.includes("CONDOMÍNIO") ||
    upper.includes("TAXA CONDOMINIAL") ||
    upper.includes("IPTU") ||
    upper.includes("ALUGUEL RESIDENCIAL") ||
    upper.includes("LOCAÇÃO RESIDENCIAL") ||
    upper.includes("IMOBILIARIA") ||
    upper.includes("IMOBILIÁRIA")
  ) {
    return {
      categoria: "Aluguel",
      descricao:
        upper.includes("CONDOMINIO") || upper.includes("CONDOMÍNIO")
          ? "Condomínio Residencial"
          : upper.includes("IPTU")
          ? "IPTU Residencial"
          : "Aluguel Residencial",
      isFaturaCartao: false,
    };
  }

  // 7. CARRO / IPVA / FINANCIAMENTO VEICULAR
  // Só pontua veículo se não for crédito rotativo de cartão
  if (
    upper.includes("IPVA") ||
    upper.includes("LICENCIAMENTO") ||
    upper.includes("DETRAN") ||
    upper.includes("SEGURO AUTO") ||
    upper.includes("FINANCIAMENTO VEICULAR") ||
    upper.includes("PARCELA DO CARRO") ||
    upper.includes("PARCELA VEICULO") ||
    upper.includes("PARCELA VEÍCULO")
  ) {
    return {
      categoria: "Carro",
      descricao: upper.includes("IPVA")
        ? "IPVA / Licenciamento Veículo"
        : "Despesa Veículo / Financiamento",
      isFaturaCartao: false,
    };
  }

  return {
    categoria: "Outros",
    descricao: "Conta / Boleto Bancário",
    isFaturaCartao: false,
  };
}

/**
 * Extração de Data de Vencimento com suporte a formatos colunados,
 * meses por extenso, múltiplos padrões e priorização da data de vencimento real
 */
export function extrairVencimento(texto: string): string {
  // 1. Data diretamente após a palavra VENCIMENTO (mesma linha ou linha seguinte, até 40 chars)
  const regexAposDireto =
    /VENCIMENTO[\s\S]{0,35}?(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/i;
  const matchAposDireto = texto.match(regexAposDireto);
  if (matchAposDireto) {
    const dia = matchAposDireto[1].padStart(2, "0");
    const mes = matchAposDireto[2].padStart(2, "0");
    let ano = matchAposDireto[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${mes}-${dia}`;
  }

  // 2. Vencimento com nome do mês (ex: "Vencimento 10/dez", "Vencimento 03/nov", "10 de dezembro de 2026")
  const regexMesTexto =
    /VENCIMENTO[\s\S]{0,40}?(\d{1,2})\s*(?:\/|\s+DE\s+|\s+)\s*([A-Za-zç]{3,9})(?:\s*(?:\/|\s+DE\s+|\s+)\s*(\d{2,4}))?/i;
  const matchMesTexto = texto.match(regexMesTexto);
  if (matchMesTexto) {
    const dia = matchMesTexto[1].padStart(2, "0");
    const mesNome = matchMesTexto[2]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .slice(0, 3);
    const mesNum = MESES_MAP[mesNome];
    if (mesNum) {
      let ano = matchMesTexto[3] || (["01", "02", "03", "04"].includes(mesNum) ? "2027" : "2026");
      if (ano.length === 2) ano = "20" + ano;
      return `${ano}-${mesNum}-${dia}`;
    }
  }

  // 3. Data de pagamento em linhas de tabela de extrato (ex: "R$ 43,89 DIv 03/11/26" ou "R$ 156,10 01/11/2026 LE")
  const regexFaturaRow =
    /R\$\s*[\d\.\,]+\s+(?:(?:DIV|DIv|LE|VIC|VICTOR|LETICIA)\s+)?(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})(?:\s+(?:DIV|DIv|LE|VIC|VICTOR|LETICIA))?/i;
  const matchFaturaRow = texto.match(regexFaturaRow);
  if (matchFaturaRow) {
    const dia = matchFaturaRow[1].padStart(2, "0");
    const mes = matchFaturaRow[2].padStart(2, "0");
    let ano = matchFaturaRow[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${mes}-${dia}`;
  }

  // 3. "Pagar até", "Data de Vencimento", "Vence em", "Venc."
  const regexPagarAte =
    /(?:PAGAR\s+AT[EÉ]|DATA\s+DE\s+VENCIMENTO|DT\.?\s*VENC\.?|VENCE\s+EM|PAG[AÁ]VEL\s+AT[EÉ])[\s\S]{0,35}?(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/i;
  const matchPagar = texto.match(regexPagarAte);
  if (matchPagar) {
    const dia = matchPagar[1].padStart(2, "0");
    const mes = matchPagar[2].padStart(2, "0");
    let ano = matchPagar[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${mes}-${dia}`;
  }

  // 4. Data ANTES da palavra Vencimento (ex: "15/10/2026 Vencimento", "20/12/2026 Vencimento")
  const regexAntes =
    /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})[\s\S]{0,25}?VENCIMENTO/i;
  const matchAntes = texto.match(regexAntes);
  if (matchAntes) {
    const dia = matchAntes[1].padStart(2, "0");
    const mes = matchAntes[2].padStart(2, "0");
    let ano = matchAntes[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${mes}-${dia}`;
  }

  // 5. Linha de pagamento com R$ e data (ex: "R$ 350,00 20/12/2026")
  const regexSlip = /R\$\s*[\d\.\,]+\s+(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/;
  const matchSlip = texto.match(regexSlip);
  if (matchSlip) {
    const dia = matchSlip[1].padStart(2, "0");
    const mes = matchSlip[2].padStart(2, "0");
    let ano = matchSlip[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${mes}-${dia}`;
  }

  // 6. Varredura geral de datas: em contas e boletos, a data de vencimento é a maior data encontrada
  const regexAllDates = /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/g;
  let dMatch: RegExpExecArray | null;
  const datasEncontradas: string[] = [];
  while ((dMatch = regexAllDates.exec(texto)) !== null) {
    const dia = dMatch[1].padStart(2, "0");
    const mes = dMatch[2].padStart(2, "0");
    let ano = dMatch[3];
    if (ano.length === 2) ano = "20" + ano;
    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const anoNum = parseInt(ano, 10);
    if (diaNum >= 1 && diaNum <= 31 && mesNum >= 1 && mesNum <= 12 && anoNum >= 2026 && anoNum <= 2028) {
      datasEncontradas.push(`${ano}-${mes}-${dia}`);
    }
  }

  if (datasEncontradas.length > 0) {
    datasEncontradas.sort();
    return datasEncontradas[datasEncontradas.length - 1];
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Extração de Valor Total a Pagar, blindada contra armadilhas de "Pagamento Mínimo"
 */
export function extrairValor(texto: string): number {
  // Padrões explícitos com prioridade máxima
  const explicitRegexes = [
    /(?:TOTAL\s+DA\s+(?:SUA\s+)?FATURA|TOTAL\s+FATURA\s+DE\s+[A-Za-zç]+|PAGAMENTO\s+TOTAL(?:\s*\(R\$\))?|VALOR\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR|\(=\)\s*VALOR\s+(?:DO\s+DOCUMENTO|COBRADO)|VALOR\s+L[IÍ]QUIDO|VALOR\s+TOTAL)[\s\S]{0,35}?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /(?:VALOR|TOTAL)[\s\S]{0,25}?(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})[\s\S]{0,20}?(?:TOTAL|VENCIMENTO|PAGÁVEL|PAGAR)/i,
    /\(=\)\s*VALOR\s+DO\s+DOCUMENTO[\s\S]{0,40}?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
  ];

  for (const reg of explicitRegexes) {
    const m = texto.match(reg);
    if (m) {
      const v = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(v) && v > 0) return v;
    }
  }

  // Varredura por ocorrências de R$ filtrando ruídos de pagamento mínimo, limites e juros
  const regAll = /(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  let match: RegExpExecArray | null;
  const candidatos: number[] = [];

  while ((match = regAll.exec(texto)) !== null) {
    const val = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
    const preText = texto.slice(Math.max(0, match.index - 50), match.index).toUpperCase();

    if (
      preText.includes("MÍNIMO") ||
      preText.includes("MINIMO") ||
      preText.includes("LIMITE") ||
      preText.includes("JUROS") ||
      preText.includes("MULTA") ||
      preText.includes("ENCARGOS") ||
      preText.includes("IOF") ||
      preText.includes("DESCONTO")
    ) {
      continue;
    }

    if (!isNaN(val) && val > 0) {
      candidatos.push(val);
    }
  }

  if (candidatos.length > 0) {
    // Retorna o maior valor representativo encontrado (que corresponde ao valor total da conta/fatura)
    return Math.max(...candidatos);
  }

  return 0;
}

/**
 * Analisador unificado de qualquer conta / boleto / fatura
 */
export function analisarTextoBoletoOuConta(texto: string): DadosContaDetectada {
  const { categoria, descricao, isFaturaCartao, bancoCartao } = identificarCategoriaEEmissor(texto);
  const vencimento = extrairVencimento(texto);
  let valor = extrairValor(texto);
  const mesAno = vencimento.slice(0, 7);

  // Se for fatura de cartão e o valor retornado for 0 ou menor que a soma dos itens (ex: extratos em tabela),
  // calcula exatamente pela soma das transações detectadas
  if (isFaturaCartao) {
    const comprasDetectadas = parsearLinhasFatura(texto, bancoCartao || "C6 Bank", mesAno);
    if (comprasDetectadas.length > 0) {
      const somaCompras = Math.round(comprasDetectadas.reduce((acc, c) => acc + c.valor, 0) * 100) / 100;
      if (valor <= 0 || (valor < somaCompras && somaCompras > 0)) {
        valor = somaCompras;
      }
    }
  }

  return {
    descricao,
    categoria,
    valor,
    vencimento,
    mesAno,
    isFaturaCartao,
    bancoCartao,
    textoCompleto: texto,
  };
}

/**
 * Extrator de compras de faturas (C6 Bank e Sicredi)
 */
export async function extrairComprasDePDF(
  file: File,
  banco: CartaoBanco,
  mesFatura: string,
  senha?: string
): Promise<Omit<CompraCartao, "id">[]> {
  const textoCompleto = await extrairTextoDePDF(file, senha);
  return parsearLinhasFatura(textoCompleto, banco, mesFatura);
}

/**
 * Parser detalhado de compras itemizadas de faturas de cartão
 */
export function parsearLinhasFatura(
  texto: string,
  banco: CartaoBanco,
  mesFatura: string
): Omit<CompraCartao, "id">[] {
  const resultados: Omit<CompraCartao, "id">[] = [];
  const titularAtual = banco === "C6 Bank" ? "Victor / Letícia" : "Sicredi Master";
  const lines = texto.split("\n");

  // 1. Tabela Extrato Sicredi (Cartão Data Cidade Tipo Descrição Valor (R$) QUEM Data de pagamento)
  const regSicrediTab =
    /^(Cartão\s+(?:Virtual|Físico)\s+\S+)\s+(\d{1,2}\/[a-zA-Zç\.]+)\s+(?:.*?(?:Online|Presencial)\s+)?(.+?)(?:\s+(\d{1,2}\/\d{1,2}))?\s+R\$\s*([\d\.\,]+)\s+([A-Za-z]+)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})$/i;

  for (const line of lines) {
    const m = line.match(regSicrediTab);
    if (m) {
      const q = m[6].toUpperCase();
      const quemPaga: Pagador = q.includes("POUP") ? "POUP" : q.startsWith("VIC") ? "VIC" : q.startsWith("LE") ? "LE" : "DIV";
      const val = parseFloat(m[5].replace(/\./g, "").replace(",", "."));
      if (val > 0) {
        resultados.push({
          mesFatura,
          banco: "Sicredi",
          titularCartao: m[1],
          dataCompra: m[2],
          descricao: m[3].trim(),
          parcelaInfo: m[4] || undefined,
          valor: val,
          quemPaga,
        });
      }
    }
  }

  if (resultados.length > 0) return resultados;

  // 2. Tabela Extrato C6 Bank (Data Cartão Descrição da compra / parcela Valor (R$) Data de pagamento Quem paga)
  const regC6Tab =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(Leticia\s+Ribeiro|Victor\s+Roque|[A-Za-z\s]+?)\s+(.+?)\s+(-?\s*R\$\s*-?[\d\.\,]+)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Za-z]+)$/i;

  for (const line of lines) {
    const m = line.match(regC6Tab);
    if (m) {
      const q = m[6].toUpperCase();
      const quemPaga: Pagador = q.includes("POUP") ? "POUP" : q.startsWith("VIC") ? "VIC" : q.startsWith("LE") ? "LE" : "DIV";
      const rawVal = m[4].replace(/R\$/i, "").replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
      const val = parseFloat(rawVal);
      const descFull = m[3].trim();
      const parcelaMatch = descFull.match(/(?:-\s*Parcela\s*|\(Parcela\s*|\s+)(\d{1,2}\/\d{1,2})\)?/i);
      const parcelaInfo = parcelaMatch ? parcelaMatch[1] : undefined;
      const cleanDesc = descFull.replace(/(?:-\s*Parcela\s*|\(Parcela\s*|\s+)\d{1,2}\/\d{1,2}\)?/i, "").trim();

      if (!isNaN(val) && val !== 0) {
        resultados.push({
          mesFatura,
          banco: "C6 Bank",
          titularCartao: m[2].trim(),
          dataCompra: m[1],
          descricao: cleanDesc || descFull,
          parcelaInfo,
          valor: val,
          quemPaga,
        });
      }
    }
  }

  if (resultados.length > 0) return resultados;

  // 3. Padrão Sicredi Clássico: DD/ mmm HH:mm ... R$ XX,XX
  const regexSicredi =
    /(\d{2})\/\s*([a-zç]{3})\s+(?:\d{2}:\d{2}\s+)?(?:[A-Za-z\s]+?\s+)?(?:Presencial|Online)?\s*(.+?)\s+(?:(\d{1,2}\/\d{1,2})\s+)?(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/gi;

  let m: RegExpExecArray | null;
  while ((m = regexSicredi.exec(texto)) !== null) {
    const dia = m[1];
    const mesNome = m[2]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const mesNum = MESES_MAP[mesNome] || "10";
    const desc = m[3].trim();
    const parcela = m[4];
    const valStr = m[5].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(valStr);

    const descUpper = desc.toUpperCase();
    if (
      descUpper.includes("TOTAL CARTÃO") ||
      descUpper.includes("TOTAL CARTAO") ||
      descUpper.includes("PAGAMENTO") ||
      descUpper.includes("SALDO ANTERIOR") ||
      val <= 0
    ) {
      continue;
    }

    let quemPaga: "VIC" | "LE" | "DIV" = "DIV";
    if (
      descUpper.includes("ASICS") ||
      descUpper.includes("ME.LINDA") ||
      descUpper.includes("CALCADO") ||
      descUpper.includes("ESTACIO")
    ) {
      quemPaga = "LE";
    } else if (
      descUpper.includes("ADIDAS") ||
      descUpper.includes("ADVENTURE") ||
      descUpper.includes("VIVO")
    ) {
      quemPaga = "VIC";
    }

    resultados.push({
      mesFatura,
      banco,
      titularCartao: titularAtual,
      dataCompra: `${dia}/${mesNum}`,
      descricao: desc,
      parcelaInfo: parcela,
      valor: val,
      quemPaga,
    });
  }

  // 2. Padrão Geral / C6 Bank: DD/MM ... R$ XX,XX
  if (resultados.length === 0) {
    const regexGeral =
      /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+([A-Za-z0-9\s*\-\/\.]+?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;

    while ((m = regexGeral.exec(texto)) !== null) {
      const dataStr = m[1];
      const desc = m[2].trim();
      const val = parseFloat(m[3].replace(/\./g, "").replace(",", "."));
      const descUpper = desc.toUpperCase();

      if (
        descUpper.includes("PAGAMENTO") ||
        descUpper.includes("SALDO ANTERIOR") ||
        descUpper.includes("TOTAL DA FATURA") ||
        descUpper.includes("TOTAL FATURA") ||
        val <= 0
      ) {
        continue;
      }

      const parcelaMatch = desc.match(/(?:Parcela\s*)?(\d{1,2}\/\d{1,2})/i);
      const parcelaInfo = parcelaMatch ? parcelaMatch[1] : undefined;

      let quemPaga: "VIC" | "LE" | "DIV" = "DIV";
      if (
        descUpper.includes("ASICS") ||
        descUpper.includes("ME.LINDA") ||
        descUpper.includes("CALCADO") ||
        descUpper.includes("ESTACIO")
      ) {
        quemPaga = "LE";
      } else if (
        descUpper.includes("ADIDAS") ||
        descUpper.includes("ADVENTURE") ||
        descUpper.includes("VIVO")
      ) {
        quemPaga = "VIC";
      }

      resultados.push({
        mesFatura,
        banco,
        titularCartao: titularAtual,
        dataCompra: dataStr,
        descricao: desc,
        parcelaInfo,
        valor: val,
        quemPaga,
      });
    }
  }

  return resultados;
}

/**
 * Extrai o valor do LÍQUIDO A RECEBER e o titular do PDF de contracheque
 * (militar RS / Banrisul / Procergs / BMRS / CBMRS / Estado do RS)
 */
export async function extrairDadosContrachequePDF(
  file: File,
  titularPadrao?: "Victor" | "Leticia"
): Promise<{
  valorLiquido: number;
  titularDetectado?: "Victor" | "Leticia";
  competencia?: string;
  textoCompleto: string;
}> {
  const pdfjsLib = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    } catch {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      } catch {}
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const doc = await loadingTask.promise;

  let valorLiquido = 0;
  let titularDetectado: "Victor" | "Leticia" | undefined = titularPadrao;
  let competencia: string | undefined;
  let textoCompleto = "";

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    // 1. Coleta todos os itens de texto com suas coordenadas geométricas 2D (X, Y)
    const items: ItemTextoPDF[] = content.items
      .map((it: any) => ({
        str: (it.str || "").trim(),
        x: Math.round(it.transform?.[4] || 0),
        y: Math.round(it.transform?.[5] || 0),
        w: Math.round(it.width || 0),
        h: Math.round(it.height || 0),
      }))
      .filter((it: any) => it.str.length > 0);

    // 2. Reconstrói o texto ordenado em linhas visuais reais (Y decrescente, X crescente)
    const linesMap: { y: number; items: ItemTextoPDF[] }[] = [];
    for (const it of items) {
      let line = linesMap.find((l) => Math.abs(l.y - it.y) <= 4);
      if (!line) {
        line = { y: it.y, items: [] };
        linesMap.push(line);
      }
      line.items.push(it);
    }
    linesMap.sort((a, b) => b.y - a.y);
    for (const line of linesMap) {
      line.items.sort((a, b) => a.x - b.x);
      let lineStr = "";
      let lastRight: number | null = null;
      for (const it of line.items) {
        if (it.str === " ") {
          if (!lineStr.endsWith(" ")) lineStr += " ";
          lastRight = it.x + (it.w || 0);
          continue;
        }
        // Se houver espaçamento real (>= 1.2px) entre o fim do caractere anterior e o atual, adiciona espaço
        if (lastRight !== null && (it.x - lastRight >= 1.2)) {
          if (!lineStr.endsWith(" ")) lineStr += " ";
        }
        lineStr += it.str;
        lastRight = it.x + (it.w || 0);
      }
      if (lineStr.trim().length > 0) {
        textoCompleto += lineStr.trim() + "\n";
      }
    }

    const upperPage = textoCompleto.toUpperCase();

    // Detectar titular
    if (!titularDetectado) {
      if (upperPage.includes("VICTOR") || upperPage.includes("ROQUE")) {
        titularDetectado = "Victor";
      } else if (
        upperPage.includes("LETICIA") ||
        upperPage.includes("LETÍCIA") ||
        upperPage.includes("RIBEIRO")
      ) {
        titularDetectado = "Leticia";
      }
    }

    // Detectar competência
    if (!competencia) {
      const matchComp = textoCompleto.match(/(\d{2}\/20\d{2})/);
      if (matchComp) competencia = matchComp[1];
    }

    // 3. ESTRATÉGIA GEOMÉTRICA 2D (PROCERGS / Estado do RS / Militares RS)
    // Procura o rótulo "LÍQUIDO A RECEBER"
    const labelItems = items.filter((it) =>
      /l[ií]quido\s+(?:a\s+)?receber/i.test(it.str) ||
      /valor\s+l[ií]quido/i.test(it.str) ||
      /total\s+l[ií]quido/i.test(it.str)
    );

    for (const label of labelItems) {
      // 3A. Procura número diretamente ABAIXO do rótulo na caixa de valor correspondente
      // (delta Y entre 5 e 45 unidades abaixo, delta X alinhado na coluna)
      const candidatosAbaixo = items.filter(
        (it) =>
          it.y < label.y &&
          it.y >= label.y - 45 &&
          it.x >= label.x - 60 &&
          it.x <= label.x + 220 &&
          /^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(it.str)
      );

      if (candidatosAbaixo.length > 0) {
        // Ordena pela maior proximidade vertical com o rótulo
        candidatosAbaixo.sort((a, b) => (label.y - a.y) - (label.y - b.y));
        const val = parseFloat(candidatosAbaixo[0].str.replace(/\./g, "").replace(",", "."));
        if (val > 100 && val < 60000) {
          valorLiquido = val;
          break;
        }
      }

      // 3B. Procura número diretamente À DIREITA do rótulo na mesma linha
      const candidatosLado = items.filter(
        (it) =>
          Math.abs(it.y - label.y) <= 10 &&
          it.x > label.x &&
          it.x <= label.x + 250 &&
          /^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(it.str)
      );

      if (candidatosLado.length > 0) {
        candidatosLado.sort((a, b) => a.x - b.x);
        const val = parseFloat(candidatosLado[0].str.replace(/\./g, "").replace(",", "."));
        if (val > 100 && val < 60000) {
          valorLiquido = val;
          break;
        }
      }
    }

    if (valorLiquido > 0) break;

    // 4. ESTRATÉGIA POR LINHAS VISUAIS (Quando os labels estão na linha superior e valores na linha imediatamente inferior)
    for (let lIdx = 0; lIdx < linesMap.length - 1; lIdx++) {
      const lineLabel = linesMap[lIdx];
      const labelColIdx = lineLabel.items.findIndex((it) =>
        /l[ií]quido\s+(?:a\s+)?receber/i.test(it.str)
      );
      if (labelColIdx >= 0) {
        const nextLine = linesMap[lIdx + 1];
        // Pega valores numéricos da linha de valores
        const numsNextLine = nextLine.items.filter((it) =>
          /^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(it.str)
        );
        if (numsNextLine.length > 0) {
          // No PROCERGS, LÍQUIDO A RECEBER é a última coluna da linha inferior
          const ultimoNum = numsNextLine[numsNextLine.length - 1];
          const val = parseFloat(ultimoNum.str.replace(/\./g, "").replace(",", "."));
          if (val > 100 && val < 60000) {
            valorLiquido = val;
            break;
          }
        }
      }
    }

    if (valorLiquido > 0) break;
  }

  // 5. ESTRATÉGIA DE FALLBACK POR REGEX NO TEXTO VISUAL RECONSTRUÍDO
  if (valorLiquido === 0) {
    const rxMesmaLinha =
      /(?:VALOR\s+)?L[IÍ]QUIDO\s+(?:A\s+RECEBER|A\s+PAGAR|CREDITAR)[^\d\n\r]{0,35}?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i;
    const matchML = textoCompleto.toUpperCase().match(rxMesmaLinha);
    if (matchML && matchML[1]) {
      const v = parseFloat(matchML[1].replace(/\./g, "").replace(",", "."));
      if (v > 100 && v < 60000) {
        valorLiquido = v;
      }
    }
  }

  // 6. ESTRATÉGIA MATEMÁTICA DA FOLHA (Total Vantagens - Total Descontos = Líquido a Receber)
  if (valorLiquido === 0) {
    const regexValor = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
    const todosValores: number[] = [];
    let mVal: RegExpExecArray | null;
    while ((mVal = regexValor.exec(textoCompleto)) !== null) {
      const num = parseFloat(mVal[1].replace(/\./g, "").replace(",", "."));
      if (num > 0) todosValores.push(num);
    }

    // Procura por triplet {Bruto, Descontos, Liquido} onde Bruto - Descontos = Liquido
    for (let i = 0; i < todosValores.length; i++) {
      for (let j = 0; j < todosValores.length; j++) {
        if (i === j) continue;
        const bruto = todosValores[i];
        const sub = todosValores[j];
        if (bruto > sub && bruto > 1000) {
          const diff = Number((bruto - sub).toFixed(2));
          // Verifica se diff existe na lista de valores
          const encontrouDiff = todosValores.some(
            (v, k) => k !== i && k !== j && Math.abs(v - diff) <= 0.08
          );
          if (encontrouDiff) {
            // Em contracheques militares normais, o Líquido costuma ser a diferença entre Bruto e Descontos
            // Se sub < diff, sub geralmente é Descontos e diff é Líquido
            valorLiquido = Math.max(sub, diff);
            break;
          }
        }
      }
      if (valorLiquido > 0) break;
    }
  }

  return {
    valorLiquido,
    titularDetectado,
    competencia,
    textoCompleto,
  };
}
