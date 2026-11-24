import crypto from "crypto";

const TAB_NAME = "_DB_JSON_";
const CHUNK_SIZE = 30000;

// Configurações padrão seguras para persistência de dados em produção (Google Sheets)
const DEFAULT_SHEET_ID = "1y2HOD3PuJqpHhoR6j_hs8sweZ09lVX4PZHOptR-5W84";
const DEFAULT_SERVICE_ACCOUNT_EMAIL = "sheets-reader@nice-script-319613.iam.gserviceaccount.com";
const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+jO5I/pO1gtCT\n4z9DkQnDIcmQQYA5CEGZK/eYnwkcgMsoMHTX+1Tjbd9p6sXXgfLv9/xYnTvAb2CJ\nlh0u+74UIaw9UB3La4p64rVOeopDUZTAbVuE5vSe1nkv3gWkeVhQqRcwZJV43jQt\n/cf8WvSqjZBp6q62+1GPi4R58C9opxN+mVW9Q5QbngBGj2etDYWUOjXgt5kl7isc\n8oPTKlf0gknBkvbyHpmKCV4ve074BmO+pjQLw8e5tOW98rDlIuBymU0LQl1wn2h6\nbwLBJ59qc2xjuuXdv1npJMXSrDCmNCdeD9TsQ7MteaXwBeo8A9hPlh8Cv3RPCWRy\n9h2/lPaVAgMBAAECggEAIW/BcHWbncIyr4C03TpaKC+JmxKjWV6lhCc+7z0Y8DN5\ncrfuCOhFYRMqnP9hcAuRgaJWWYZdscrZecspm9D47bdq7eddExDv39hgUEEYee+a\n1plZ8dxFGIoyAcBH5TCV2rGRLCC6SddT+K4LpbCgNj1ZFfzkY59+FF47BNqstwQs\n0H6QACKNI47rNoqKmKWHYMmaVA2bR7BRdAVSnHtklktrM2qnQwealHZjaoWBGBqN\n0wbTFY72vVl/f2GAIixzNZbmKOyqECVGU/UU/ZSJAbhRSrexz93h1b29yGkJnZRp\nfyYUOJJ+KaqWwNZYBRR574G5aVBXN3nZvtHbN3KOAQKBgQDjJZMiFXwmtAEYCmlr\n2+uviP/hd0lTVdbRErR5IsVnUNbgOOrzZAPo+vVCVWF82PUfSxWJaZVGiY7u3p8q\nNozIRwhRN0Wrji4IWQrJVLelRNLXA+7Cht+JwhnZvUqTqNG5O4gKU0PMH8CFCmWt\nGEEjbmAfzgp+VwEE531ucNoa9QKBgQDWwU7ZqVMygAJxr4J5ebBOHKiV0moaPeQJ\niYNCTRDyvSLJSA76QdG6LJMtMfdemJ6gIYqnVJRGUsfqYv/WBueJ1VNIOzbzq23C\nOpqb2K4pM2ZIMesGO13cXB88FfEbMfbMFeVNE41U7gHHVP6x43XLf0VKvHWM0AdH\nCv2U1SVpIQKBgGAyapR1uuV9ODVhO3JVagQmJg/rf99OLDLRFCN1KVru7oF5OW+o\nfMtvdO0J0caY7364Qr+2OmTsHt9k4s1y2r567rfOi6/y/+XDKAFJ4piYhB5RaQ1z\nJzplPKNtOic8yM0EvEF7L+xDyjnNxG/BJN0HgqgVj3YgDKtyCjn6izP9AoGAcsjt\n8U8cxfA/3i32KiGNx6JvxWyrA42zFhnnC4gPl/7Z2gXm44JMrBrpK436bxhaKLLk\n3l1Jx3C1pCT4I5ibJ0PbeM8VpxYo21jhjI07QZBUiiAMQ891crPWihIcRfHlvN2z\nKwhZUVzJnJZkcAZozrUe/zxOBE6opSNNuMBYd6ECgYAJpnRil53gwOBdVqjrN9tw\npEsOsxCafTmcNdwRpTsDQKgJ9NYWJzV0pZBtzE1iDrZ97vJ2rvV50IbRAfJ80eWR\nOuu/0lZH7fRSI6Ven4moJamrl/6xOAOOx51x0RU115MeYlOuO7Hgimdlj+7S8LQA\nQtb0BmsxpU/0aH0y61ohpQ==\n-----END PRIVATE KEY-----\n`;

let cachedToken: { token: string; expiresAt: number } | null = null;

export function getSheetId(): string {
  return process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
}

export function getServiceAccountEmail(): string {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SERVICE_ACCOUNT_EMAIL;
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    getSheetId() &&
    getServiceAccountEmail() &&
    (process.env.GOOGLE_PRIVATE_KEY || DEFAULT_PRIVATE_KEY)
  );
}

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;
  // Trata quebras de linha escapadas comuns em variáveis de ambiente
  return raw.replace(/\\n/g, "\n");
}

function createJWT(email: string, key: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claimSet = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
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

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const email = getServiceAccountEmail();
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

  const sheetId = getSheetId();
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

  const sheetId = getSheetId();
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
