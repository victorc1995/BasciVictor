import { getAccessToken, getSheetId } from "../src/lib/google-sheets-db";

async function main() {
  const token = await getAccessToken();
  const sheetId = getSheetId();

  // 1. Get spreadsheet metadata to see all sheet titles
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  console.log("SHEETS FOUND:", meta.sheets?.map((s: any) => s.properties?.title));

  for (const s of meta.sheets || []) {
    const title = s.properties?.title;
    if (title === "_DB_JSON_") continue;
    console.log(`\n=================== TAB: ${title} ===================`);
    const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A1:Z50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const valJson = await valRes.json();
    console.log("Total rows:", valJson.values?.length || 0);
    if (valJson.values) {
      valJson.values.slice(0, 35).forEach((row: any[], idx: number) => {
        console.log(`Row ${idx + 1}:`, JSON.stringify(row));
      });
    }
  }

  // Also check _DB_JSON_
  console.log(`\n=================== TAB: _DB_JSON_ ===================`);
  const dbRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/_DB_JSON_!A:A`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dbJson = await dbRes.json();
  const fullStr = (dbJson.values || []).map((r: any) => r[0] || "").join("");
  console.log("DB_JSON length:", fullStr.length);
  if (fullStr.length > 0) {
    try {
      const parsed = JSON.parse(fullStr);
      console.log("DB_JSON keys:", Object.keys(parsed));
      console.log("updatedAt:", parsed.updatedAt);
      const data = parsed.data || parsed;
      console.log("data keys:", Object.keys(data));
      if (data.poupanca) {
        console.log("poupanca saldoAtual:", data.poupanca.saldoAtual);
        console.log("poupanca movimentacoes count:", data.poupanca.movimentacoes?.length);
        console.log("poupanca movimentacoes sample:", data.poupanca.movimentacoes?.slice(0, 5));
      }
      if (data.contasCasa) {
        console.log("contasCasa count:", data.contasCasa?.length);
      }
      if (data.cartoes) {
        console.log("cartoes:", data.cartoes?.map((c: any) => ({ nome: c.nome, comprasCount: c.compras?.length })));
      }
    } catch (e: any) {
      console.error("Error parsing _DB_JSON_:", e.message);
    }
  }
}

main().catch(console.error);
