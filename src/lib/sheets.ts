import { google } from 'googleapis';
import { SNAPSHOT_DATA, SheetSnapshotData } from './snapshot-data';

export interface RawSheetsResponse {
  source: 'google-sheets-api' | 'snapshot-fallback';
  fetchedAt: string;
  data: SheetSnapshotData;
  error?: string;
}

// Cache em memória para evitar chamadas excessivas à API
let cachedData: RawSheetsResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Normaliza e limpa a chave privada do Google Service Account
 */
function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  // Substitui \n literais por quebras de linha reais caso tenha sido passado como string de linha única
  let cleaned = key.replace(/\\n/g, '\n');
  // Remove aspas adicionais nas extremidades se houver
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  return cleaned;
}

/**
 * Busca dados da API do Google Sheets ou retorna o snapshot como fallback
 */
export async function fetchRawSheetsData(forceRefresh = false): Promise<RawSheetsResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  const sheetId = process.env.GOOGLE_SHEET_ID || '1y2HOD3PuJqpHhoR6j_hs8sweZ09lVX4PZHOptR-5W84';
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  // Se não houver credenciais configuradas, usa o snapshot fiel imediatamente
  if (!clientEmail || !privateKey) {
    const fallbackRes: RawSheetsResponse = {
      source: 'snapshot-fallback',
      fetchedAt: new Date().toISOString(),
      data: SNAPSHOT_DATA,
      error: 'Variáveis GOOGLE_SERVICE_ACCOUNT_EMAIL ou GOOGLE_PRIVATE_KEY não configuradas. Exibindo dados sincronizados do snapshot.',
    };
    cachedData = fallbackRes;
    lastFetchTime = now;
    return fallbackRes;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Primeiro lista as abas para encontrar os títulos exatos
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const existingTitles = meta.data.sheets?.map(s => s.properties?.title || '') || [];

    // Mapeador resiliente para encontrar os nomes com ou sem underscore/espaço
    const findTitle = (candidates: string[]): string => {
      for (const cand of candidates) {
        const found = existingTitles.find(t => t.toLowerCase() === cand.toLowerCase());
        if (found) return found;
      }
      return candidates[0];
    };

    const titleSalarioV = findTitle(['Salario V', 'Salario_V']);
    const titleSalarioL = findTitle(['Salario L', 'Salario_L']);
    const titleGerenciador = findTitle(['Gerenciador']);
    const titlePoupanca = findTitle(['Poupança', 'Poupanca']);
    const titleFaturaSicredi = findTitle(['Fatura Sicredi', 'Fatura_Sicredi']);
    const titleFaturaC6 = findTitle(['Fatura C6', 'Fatura_01-11-2026', 'Fatura_C6']);

    // Faz as leituras em paralelo
    const [resSalarioV, resSalarioL, resGerenciador, resPoupanca, resSicredi, resC6] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${titleSalarioV}'!A1:M25` }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${titleSalarioL}'!A1:M25` }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${titleGerenciador}'!A6:P750` }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${titlePoupanca}'!A1:M60` }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${titleFaturaSicredi}'!A1:J40` }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${titleFaturaC6}'!A1:F50` }),
    ]);

    const liveData: SheetSnapshotData = {
      salario_v: (resSalarioV.data.values as (string | number | null)[][]) || SNAPSHOT_DATA.salario_v,
      salario_l: (resSalarioL.data.values as (string | number | null)[][]) || SNAPSHOT_DATA.salario_l,
      gerenciador: (resGerenciador.data.values as (string | number | null)[][]) || SNAPSHOT_DATA.gerenciador,
      poupanca: (resPoupanca.data.values as (string | number | null)[][]) || SNAPSHOT_DATA.poupanca,
      fatura_sicredi: (resSicredi.data.values as (string | number | null)[][]) || SNAPSHOT_DATA.fatura_sicredi,
      fatura_c6: (resC6.data.values as (string | number | null)[][]) || SNAPSHOT_DATA.fatura_c6,
    };

    const successRes: RawSheetsResponse = {
      source: 'google-sheets-api',
      fetchedAt: new Date().toISOString(),
      data: liveData,
    };

    cachedData = successRes;
    lastFetchTime = now;
    return successRes;
  } catch (err: any) {
    console.error('Erro ao conectar ao Google Sheets API:', err?.message || err);
    // Em caso de erro na API do Google (ex: permissão negada, credencial inválida), não quebra a aplicação: cai para o snapshot
    const errorFallback: RawSheetsResponse = {
      source: 'snapshot-fallback',
      fetchedAt: new Date().toISOString(),
      data: SNAPSHOT_DATA,
      error: `Falha na API Google Sheets (${err?.message || 'Erro desconhecido'}). Utilizando dados do snapshot.`,
    };
    cachedData = errorFallback;
    lastFetchTime = now;
    return errorFallback;
  }
}
