import { CartaoBanco, CompraCartao } from "./finance-engine";

// Extrator inteligente de texto de Faturas PDF (C6 Bank e Sicredi)
export async function extrairComprasDePDF(
  file: File,
  banco: CartaoBanco,
  mesFatura: string
): Promise<Omit<CompraCartao, "id">[]> {
  // Carrega pdfjs dinamicamente apenas no navegador
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

  return parsearLinhasFatura(textoCompleto, banco, mesFatura);
}

export function parsearLinhasFatura(
  texto: string,
  banco: CartaoBanco,
  mesFatura: string
): Omit<CompraCartao, "id">[] {
  const resultados: Omit<CompraCartao, "id">[] = [];

  // Regex para capturar padrões comuns em faturas C6 Bank e Sicredi:
  // Ex: "27/02/2026 OTICAS CAROL - Parcela 8/10 156,10" ou "12 set ASICS LOJA R$ 102,77"
  const regexLinha = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+([A-Za-z0-9\s*\-\/\.]+?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;

  let match;
  let titularAtual = banco === "C6 Bank" ? "Victor / Letícia" : "Sicredi Master";

  while ((match = regexLinha.exec(texto)) !== null) {
    const dataStr = match[1];
    let descricao = match[2].trim();
    const valorStr = match[3].replace(/\./g, "").replace(",", ".");
    const valor = parseFloat(valorStr);

    // Ignora linhas de pagamento de fatura ou subtotal
    const descUpper = descricao.toUpperCase();
    if (
      descUpper.includes("PAGAMENTO") ||
      descUpper.includes("SALDO ANTERIOR") ||
      descUpper.includes("TOTAL DA FATURA") ||
      valor <= 0
    ) {
      continue;
    }

    // Identifica parcela se houver (ex: 8/10 ou Parcela 2/5)
    const parcelaMatch = descricao.match(/(?:Parcela\s*)?(\d{1,2}\/\d{1,2})/i);
    const parcelaInfo = parcelaMatch ? parcelaMatch[1] : undefined;

    // Classificação inteligente inicial baseada no histórico de vocês
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
