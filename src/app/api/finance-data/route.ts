import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  INITIAL_CONTAS_CASA,
  INITIAL_POUPANCA,
  INITIAL_SALARIO_VICTOR,
  INITIAL_SALARIO_LETICIA,
  INITIAL_COMPRAS_CARTAO,
  INITIAL_CONTRACHEQUES,
} from "@/lib/initial-data";
import {
  isGoogleSheetsConfigured,
  readDatabaseFromGoogleSheets,
  saveDatabaseToGoogleSheets,
} from "@/lib/google-sheets-db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Headers padrão para desabilitar cache em CDN, Vercel e navegadores móveis
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// Caminho absoluto para o arquivo de banco de dados central (cache local)
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "financas_db.json");

function ensureDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignora se estiver em ambiente read-only como Vercel Lambda
  }
}

function getInitialDatabasePayload() {
  return {
    updatedAt: new Date().toISOString(),
    data: {
      contasCasa: INITIAL_CONTAS_CASA,
      poupanca: INITIAL_POUPANCA,
      salVictor: INITIAL_SALARIO_VICTOR,
      salLeticia: INITIAL_SALARIO_LETICIA,
      comprasCartao: INITIAL_COMPRAS_CARTAO,
      contracheques: INITIAL_CONTRACHEQUES,
      faturasPagas: {
        "2026-11-c6-vic": true,
        "2026-11-c6-le": true,
        "2026-11-sicredi-vic": true,
        "2026-11-sicredi-le": true,
      },
      contasExcluidas: [],
    },
  };
}

export async function GET() {
  try {
    // 1. Tenta carregar do Google Sheets (Nuvem em tempo real persistente)
    if (isGoogleSheetsConfigured()) {
      try {
        const fromSheets = await readDatabaseFromGoogleSheets();
        if (fromSheets && fromSheets.data) {
          const cleanData = fromSheets.data?.contasCasa
            ? fromSheets.data
            : (fromSheets.data?.data?.contasCasa ? fromSheets.data.data : fromSheets.data);

          // Atualiza o arquivo local como cache quando possível
          try {
            ensureDirectory();
            fs.writeFileSync(DB_FILE, JSON.stringify({ updatedAt: fromSheets.updatedAt, data: cleanData }, null, 2), "utf-8");
          } catch {}

          return NextResponse.json(
            {
              success: true,
              data: cleanData,
              updatedAt: fromSheets.updatedAt,
              source: "google_sheets",
            },
            { headers: NO_CACHE_HEADERS }
          );
        }
      } catch (sheetsErr) {
        console.warn("Aviso ao ler do Google Sheets, tentando fallback local:", sheetsErr);
      }
    }

    // 2. Fallback: Arquivo local
    ensureDirectory();
    if (!fs.existsSync(DB_FILE)) {
      const initialPayload = getInitialDatabasePayload();
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialPayload, null, 2), "utf-8");
      } catch {}
      return NextResponse.json(
        {
          success: true,
          data: initialPayload.data,
          updatedAt: initialPayload.updatedAt,
          seeded: true,
          source: "initial",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const diskData = parsed.data?.contasCasa ? parsed.data : (parsed.contasCasa ? parsed : parsed.data || parsed);
    return NextResponse.json(
      {
        success: true,
        data: diskData,
        updatedAt: parsed.updatedAt || null,
        source: "local_file",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Erro ao ler banco de dados de finanças:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao ler dados no servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanData = body?.contasCasa
      ? body
      : (body?.data?.contasCasa ? body.data : body);

    let savedToCloud = false;
    let cloudUpdatedAt: string | null = null;

    // 1. Grava no Google Sheets (Nuvem em tempo real, persistente no Vercel)
    if (isGoogleSheetsConfigured()) {
      try {
        const cloudRes = await saveDatabaseToGoogleSheets(cleanData);
        savedToCloud = cloudRes.success;
        cloudUpdatedAt = cloudRes.updatedAt;
      } catch (sheetsErr) {
        console.error("Erro ao salvar no Google Sheets:", sheetsErr);
      }
    }

    // 2. Grava no arquivo local (quando ambiente permitir escrita, como dev ou VPS)
    let savedToLocal = false;
    try {
      ensureDirectory();
      const payload = {
        updatedAt: cloudUpdatedAt || new Date().toISOString(),
        data: cleanData,
      };
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf-8");
      fs.renameSync(tempFile, DB_FILE);
      savedToLocal = true;
    } catch {
      // No Vercel serverless o sistema de arquivos é read-only, o que é esperado
    }

    if (!savedToCloud && !savedToLocal) {
      return NextResponse.json(
        { success: false, error: "Não foi possível salvar os dados nem na nuvem nem em disco" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        updatedAt: cloudUpdatedAt || new Date().toISOString(),
        savedToCloud,
        savedToLocal,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Erro ao processar salvamento de finanças:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar dados no servidor" },
      { status: 500 }
    );
  }
}
