import { CartaoBanco, CompraCartao, ContaCasa } from "./finance-engine";

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

// Extrai todo o texto de qualquer PDF no navegador usando pdfjs-dist
export async function extrairTextoDePDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let textoCompleto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    textoCompleto += strings.join(" ") + "\n";
  }

  return textoCompleto;
}

// Analisa qualquer PDF de boleto/conta e descobre automaticamente:
// - Valor total a pagar
// - Data de vencimento
// - Categoria (Luz, Água, Internet, Telefone, Aluguel, Carro, Fatura Cartão, Outros)
// - Descrição do emissor
export async function extrairDadosQualquerPDF(file: File): Promise<DadosContaDetectada> {
  const texto = await extrairTextoDePDF(file);
  return analisarTextoBoletoOuConta(texto);
}

export function analisarTextoBoletoOuConta(texto: string): DadosContaDetectada {
  let valor = 0;
  let vencimento = "";
  let categoria: ContaCasa["categoria"] = "Outros";
  let descricao = "Conta / Boleto";
  let isFaturaCartao = false;
  let bancoCartao: CartaoBanco | undefined = undefined;

  const upper = texto.toUpperCase();

  // 1. Identificação Inteligente da Categoria e Emissor
  if (
    upper.includes("CEEE") ||
    upper.includes("EQUATORIAL") ||
    upper.includes("ENERGIA") ||
    upper.includes("ELETRICA") ||
    upper.includes("ELÉTRICA") ||
    upper.includes("RGE") ||
    upper.includes("LUZ") ||
    upper.includes("CPFL") ||
    upper.includes("ENEL")
  ) {
    categoria = "Luz";
    descricao = "Conta de Energia Elétrica (Luz)";
  } else if (
    upper.includes("CORSAN") ||
    upper.includes("AGUA") ||
    upper.includes("ÁGUA") ||
    upper.includes("SANEAMENTO") ||
    upper.includes("DMAE") ||
    upper.includes("SAMAE") ||
    upper.includes("SABESP")
  ) {
    categoria = "Água";
    descricao = "Conta de Água / Saneamento (Corsan)";
  } else if (
    upper.includes("VERO") ||
    upper.includes("INTERNET") ||
    upper.includes("FIBRA") ||
    upper.includes("BANDA LARGA")
  ) {
    categoria = "Internet";
    descricao = "Internet Residencial (Vero)";
  } else if (
    upper.includes("VIVO") ||
    upper.includes("CLARO") ||
    upper.includes("TIM") ||
    upper.includes("TELEFONE") ||
    upper.includes("CELULAR")
  ) {
    categoria = "Telefone";
    descricao = upper.includes("VIVO") ? "Telefonia Vivo" : "Telefone / Celular";
  } else if (
    upper.includes("ALUGUEL") ||
    upper.includes("CONDOMINIO") ||
    upper.includes("CONDOMÍNIO") ||
    upper.includes("IPTU") ||
    upper.includes("IMOBILIARIA") ||
    upper.includes("IMOBILIÁRIA")
  ) {
    categoria = "Aluguel";
    descricao = "Aluguel / IPTU / Condomínio";
  } else if (
    upper.includes("FINANCIAMENTO") ||
    upper.includes("PARCELA VEICULO") ||
    upper.includes("VEÍCULO") ||
    upper.includes("CARRO") ||
    upper.includes("SEGURO AUTO") ||
    upper.includes("IPVA")
  ) {
    categoria = "Carro";
    descricao = "Parcela / Despesa Veículo";
  } else if (
    upper.includes("C6 BANK") ||
    upper.includes("SICREDI") ||
    upper.includes("FATURA DO CARTÃO") ||
    upper.includes("FATURA DE CARTÃO") ||
    upper.includes("NUBANK")
  ) {
    categoria = "Fatura Cartão";
    isFaturaCartao = true;
    if (upper.includes("SICREDI")) {
      bancoCartao = "Sicredi";
      descricao = "Fatura Sicredi";
    } else {
      bancoCartao = "C6 Bank";
      descricao = "Fatura C6 Bank";
    }
  }

  // 2. Extração da Data de Vencimento (DD/MM/AAAA -> YYYY-MM-DD)
  const vencRegexes = [
    /(?:VENCIMENTO|VENCE EM|DATA DE VENCIMENTO|PAGAR AT[EÉ]|DT\.?\s*VENC\.?)\s*[:\s]?\s*(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/i,
    /(?:VENCIMENTO|VENCE EM|DATA DE VENCIMENTO|PAGAR AT[EÉ]|DT\.?\s*VENC\.?)\s*[:\s]?\s*(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2})/i,
    /(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/
  ];

  for (const regex of vencRegexes) {
    const match = texto.match(regex);
    if (match) {
      const dia = match[1];
      const mes = match[2];
      let ano = match[3];
      if (ano.length === 2) ano = `20${ano}`;
      vencimento = `${ano}-${mes}-${dia}`;
      break;
    }
  }

  if (!vencimento) {
    vencimento = new Date().toISOString().slice(0, 10);
  }

  const mesAno = vencimento.slice(0, 7);

  // 3. Extração do Valor Total a Pagar
  const valorRegexes = [
    /(?:VALOR\s+(?:A\s+PAGAR|DO\s+DOCUMENTO|TOTAL|COBRADO)|TOTAL\s+A\s+PAGAR|TOTAL\s+DA\s+FATURA|VALOR\s+LIQUIDO|VALOR\s+LÍQUIDO)\s*[:\s]?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g,
  ];

  const matchExplicit = texto.match(valorRegexes[0]);
  if (matchExplicit) {
    valor = parseFloat(matchExplicit[1].replace(/\./g, "").replace(",", "."));
  } else {
    const reg = new RegExp(/(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g);
    const vals: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = reg.exec(texto)) !== null) {
      const v = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(v) && v > 0) {
        vals.push(v);
      }
    }
    if (vals.length > 0) {
      // Normalmente o valor total é o último valor impresso no boleto/fatura
      valor = vals[vals.length - 1];
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

// Extrator específico para compras itemizadas de Faturas PDF (C6 Bank e Sicredi)
export async function extrairComprasDePDF(
  file: File,
  banco: CartaoBanco,
  mesFatura: string
): Promise<Omit<CompraCartao, "id">[]> {
  const textoCompleto = await extrairTextoDePDF(file);
  return parsearLinhasFatura(textoCompleto, banco, mesFatura);
}

export function parsearLinhasFatura(
  texto: string,
  banco: CartaoBanco,
  mesFatura: string
): Omit<CompraCartao, "id">[] {
  const resultados: Omit<CompraCartao, "id">[] = [];

  const regexLinha = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+([A-Za-z0-9\s*\-\/\.]+?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;

  let match;
  let titularAtual = banco === "C6 Bank" ? "Victor / Letícia" : "Sicredi Master";

  while ((match = regexLinha.exec(texto)) !== null) {
    const dataStr = match[1];
    let descricao = match[2].trim();
    const valorStr = match[3].replace(/\./g, "").replace(",", ".");
    const valor = parseFloat(valorStr);

    const descUpper = descricao.toUpperCase();
    if (
      descUpper.includes("PAGAMENTO") ||
      descUpper.includes("SALDO ANTERIOR") ||
      descUpper.includes("TOTAL DA FATURA") ||
      valor <= 0
    ) {
      continue;
    }

    const parcelaMatch = descricao.match(/(?:Parcela\s*)?(\d{1,2}\/\d{1,2})/i);
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
      descricao,
      parcelaInfo,
      valor,
      quemPaga,
    });
  }

  return resultados;
}
