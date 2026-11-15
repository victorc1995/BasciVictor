import { CartaoBanco, CompraCartao, ContaCasa } from "./finance-engine";

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

  // Configuração resiliente do worker do PDF.js
  if (typeof window !== "undefined") {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    } catch {
      // fallback sem worker se bloqueado
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
    const strings = content.items.map((item: any) => item.str);
    textoCompleto += strings.join(" ") + "\n";
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
  if (upper.includes("SICREDI")) {
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
    upper.includes("C6 CARBON")
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
 * meses por extenso e padrão invertido (data antes da palavra)
 */
export function extrairVencimento(texto: string): string {
  // 1. Data diretamente após a palavra VENCIMENTO (ex: "Vencimento: 01/11/2026")
  const regexAposDireto =
    /VENCIMENTO\s*[:\s\-]{1,15}(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2,4})/i;
  const matchAposDireto = texto.match(regexAposDireto);
  if (matchAposDireto) {
    let ano = matchAposDireto[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${matchAposDireto[2]}-${matchAposDireto[1]}`;
  }

  // 2. Vencimento com nome do mês (ex: "Vencimento 03/out" ou "Vencimento 03/nov" da Sicredi)
  const regexMesTexto =
    /VENCIMENTO\s*[:\s\-]{1,30}(\d{1,2})\s*(?:\/|\s+DE\s+)\s*([A-Za-zç]{3,9})(?:\s*(?:\/|\s+DE\s+)\s*(\d{2,4}))?/i;
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
      let ano = matchMesTexto[3] || "2026";
      if (ano.length === 2) ano = "20" + ano;
      return `${ano}-${mesNum}-${dia}`;
    }
  }

  // 3. Vencimento em layouts colunados (ex: CEEE "VENCIMENTO ... 20.11.2026", até 60 chars)
  const regexColunado =
    /VENCIMENTO[^\d\n\r]{0,60}?(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2,4})/i;
  const matchColunado = texto.match(regexColunado);
  if (matchColunado) {
    let ano = matchColunado[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${matchColunado[2]}-${matchColunado[1]}`;
  }

  // 4. Data ANTES da palavra Vencimento (ex: "15/10/2026 Vencimento" da Vero)
  const regexAntes =
    /(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2,4})\s*[:\s\-]{0,20}(?:M[EÊ]S\s+DE\s+[^\n]{0,30})?VENCIMENTO/i;
  const matchAntes = texto.match(regexAntes);
  if (matchAntes) {
    let ano = matchAntes[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${matchAntes[2]}-${matchAntes[1]}`;
  }

  // 5. "Pagar até DD/MM/AAAA" ou "Data de Vencimento"
  const regexPagarAte =
    /(?:PAGAR\s+AT[EÉ]|DATA\s+DE\s+VENCIMENTO|DT\.?\s*VENC\.?)\s*[:\s\-]{1,30}(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2,4})/i;
  const matchPagar = texto.match(regexPagarAte);
  if (matchPagar) {
    let ano = matchPagar[3];
    if (ano.length === 2) ano = "20" + ano;
    return `${ano}-${matchPagar[2]}-${matchPagar[1]}`;
  }

  // 6. Data próxima ao valor no recibo de pagamento / ficha de compensação
  const regexSlip = /R\$\s*[\d\.\,]+\s+(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/;
  const matchSlip = texto.match(regexSlip);
  if (matchSlip) {
    return `${matchSlip[3]}-${matchSlip[2]}-${matchSlip[1]}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Extração de Valor Total a Pagar, blindada contra armadilhas de "Pagamento Mínimo"
 */
export function extrairValor(texto: string): number {
  // Padrões explícitos com prioridade máxima
  const explicitRegexes = [
    /(?:TOTAL\s+DA\s+(?:SUA\s+)?FATURA|TOTAL\s+FATURA\s+DE\s+[A-Za-zç]+|PAGAMENTO\s+TOTAL(?:\s*\(R\$\))?|VALOR\s+A\s+PAGAR|TOTAL\s+A\s+PAGAR|\(=\)\s*VALOR\s+(?:DO\s+DOCUMENTO|COBRADO)|VALOR\s+L[IÍ]QUIDO)\s*[:\s\-]{0,25}(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /(?:VALOR|TOTAL)\s+(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TOTAL|VENCIMENTO|PAGÁVEL)/i,
    /\(=\)\s*VALOR\s+DO\s+DOCUMENTO[^\d\n\r]{0,40}?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
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
  const valor = extrairValor(texto);
  const mesAno = vencimento.slice(0, 7);

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

  // 1. Padrão Sicredi: DD/ mmm HH:mm ... R$ XX,XX
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
 * Extrai o valor líquido e titular do PDF de contracheque (militar RS / Banrisul / Procergs / BMRS / CBMRS)
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
  const texto = await extrairTextoDePDF(file);
  const upper = texto.toUpperCase();

  // 1. Detectar titular
  let titularDetectado: "Victor" | "Leticia" | undefined = titularPadrao;
  if (upper.includes("VICTOR") || upper.includes("ROQUE")) {
    titularDetectado = "Victor";
  } else if (upper.includes("LETICIA") || upper.includes("LETÍCIA") || upper.includes("RIBEIRO")) {
    titularDetectado = "Leticia";
  }

  // 2. Detectar competência / mês (ex: 10/2026, 11/2026, OUT/2026)
  let competencia: string | undefined;
  const matchComp = texto.match(/(\d{2}\/20\d{2})/);
  if (matchComp) {
    competencia = matchComp[1];
  }

  // 3. Detectar valor líquido
  let valorLiquido = 0;

  // Regex prioritários para contracheques RS
  const regexes = [
    /(?:L[IÍ]QUIDO\s+(?:A\s+RECEBER|TOTAL|FOLHA|PAGAR)|VALOR\s+L[IÍ]QUIDO|TOTAL\s+L[IÍ]QUIDO|VL\.?\s*L[IÍ]QUIDO|VLR\.?\s*L[IÍ]QUIDO)\s*[:\s\-]{0,20}(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /(?:L[IÍ]QUIDO\s+A\s+RECEBER|TOTAL\s+L[IÍ]QUIDO|VALOR\s+L[IÍ]QUIDO)[\s\S]{1,60}?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /(?:TOTAL\s+L[IÍ]QUIDO|L[IÍ]QUIDO)[\s\S]{1,40}?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
  ];

  for (const rx of regexes) {
    const match = upper.match(rx);
    if (match && match[1]) {
      const v = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      if (v > 0 && v < 50000) {
        valorLiquido = v;
        break;
      }
    }
  }

  // Fallback se não encontrou pelo regex específico: procura por padrão de valor próximo da palavra LIQUIDO
  if (valorLiquido === 0) {
    const linhas = texto.split("\n");
    for (const linha of linhas) {
      const lUp = linha.toUpperCase();
      if (lUp.includes("LIQUIDO") || lUp.includes("LÍQUIDO")) {
        const valMatch = linha.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        if (valMatch) {
          const v = parseFloat(valMatch[1].replace(/\./g, "").replace(",", "."));
          if (v > 0 && v < 50000) {
            valorLiquido = v;
            break;
          }
        }
      }
    }
  }

  return {
    valorLiquido,
    titularDetectado,
    competencia,
    textoCompleto: texto,
  };
}
