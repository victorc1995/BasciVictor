import { NextResponse } from 'next/server';
import { fetchRawSheetsData } from '@/lib/sheets';
import { isAuthenticated } from '@/lib/auth';

export async function POST() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const rawRes = await fetchRawSheetsData(true);
    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso',
      source: rawRes.source,
      fetchedAt: rawRes.fetchedAt,
      errorNotice: rawRes.error,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Falha ao sincronizar dados', details: err?.message }, { status: 500 });
  }
}
