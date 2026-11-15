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

// Caminho absoluto para o arquivo de banco de dados central
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "financas_db.json");

function ensureDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
    ensureDirectory();
    if (!fs.existsSync(DB_FILE)) {
      const initialPayload = getInitialDatabasePayload();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialPayload, null, 2), "utf-8");
      return NextResponse.json({
        success: true,
        data: initialPayload.data,
        updatedAt: initialPayload.updatedAt,
        seeded: true,
      });
    }

    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      success: true,
      data: parsed.data || parsed,
      updatedAt: parsed.updatedAt || null,
    });
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
    ensureDirectory();
    const body = await request.json();

    const payload = {
      updatedAt: new Date().toISOString(),
      data: body,
    };

    // Gravação segura e atômica
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);

    return NextResponse.json({
      success: true,
      updatedAt: payload.updatedAt,
    });
  } catch (error) {
    console.error("Erro ao salvar banco de dados de finanças:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar dados no servidor" },
      { status: 500 }
    );
  }
}
