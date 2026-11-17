import crypto from "crypto";

const TAB_NAME = "_DB_JSON_";
const CHUNK_SIZE = 30000;

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY || "";
  // Trata quebras de linha escapadas comuns em variáveis de ambiente
  return raw.replace(/\\n/g, "\n");
}

function createJWT(email: string, key: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claimSet = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${claimSet}`);
  const signature = sign.sign(key, "base64url");
  return `${header}.${claimSet}.${signature}`;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const key = getPrivateKey();
  const jwt = createJWT(email, key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao autenticar com Google Service Account: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

async function ensureDbSheetExists(sheetId: string, token: string): Promise<void> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const exists = meta.sheets?.some((s: any) => s.properties?.title === TAB_NAME);
    if (exists) return;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: TAB_NAME },
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn("Aviso ao verificar/criar aba _DB_JSON_ no Google Sheets:", err);
  }
}

export async function readDatabaseFromGoogleSheets(): Promise<{
  success: boolean;
  data: any;
  updatedAt: string | null;
} | null> {
  if (!isGoogleSheetsConfigured()) return null;

  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const token = await getAccessToken();

  await ensureDbSheetExists(sheetId, token);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${TAB_NAME}!A:A`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Erro ao ler dados da planilha: ${res.status}`);
  }

  const json = await res.json();
  const rows = json.values as string[][] | undefined;
  if (!rows || rows.length === 0) {
    return null;
  }

  const fullStr = rows.map((r) => r[0] || "").join("");
  if (!fullStr.trim()) return null;

  const parsed = JSON.parse(fullStr);
  return {
    success: true,
    data: parsed.data || parsed,
    updatedAt: parsed.updatedAt || null,
  };
}

export async function saveDatabaseToGoogleSheets(body: any): Promise<{
  success: boolean;
  updatedAt: string;
}> {
  if (!isGoogleSheetsConfigured()) {
    throw new Error("Google Sheets não configurado.");
  }

  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const token = await getAccessToken();

  await ensureDbSheetExists(sheetId, token);

  const payload = {
    updatedAt: new Date().toISOString(),
    data: body,
  };

  const str = JSON.stringify(payload);
  const chunks: string[][] = [];
  for (let i = 0; i < str.length; i += CHUNK_SIZE) {
    chunks.push([str.slice(i, i + CHUNK_SIZE)]);
  }

  // Limpa as primeiras 20 linhas para evitar sobras de payloads anteriores maiores
  const rowsToWrite = [...chunks];
  while (rowsToWrite.length < 15) {
    rowsToWrite.push([""]);
  }

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${TAB_NAME}!A1:A${rowsToWrite.length}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rowsToWrite,
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Erro ao gravar dados na planilha Google: ${writeRes.status} - ${errText}`);
  }

  return {
    success: true,
    updatedAt: payload.updatedAt,
  };
}
