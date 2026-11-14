import { NextRequest, NextResponse } from 'next/server';
import { fetchRawSheetsData } from '@/lib/sheets';
import {
  parseGerenciador,
  parseCardsData,
  parseSalaries,
  parsePoupanca,
  calculateMonthSummary,
  calculateFutureReleases,
} from '@/lib/finance-rules';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verificação de autenticação
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetMonth = searchParams.get('month') || '11/2026';
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Busca os dados brutos (API ou Snapshot)
    const rawRes = await fetchRawSheetsData(forceRefresh);

    // 2. Parse dos módulos
    const transactions = parseGerenciador(rawRes.data.gerenciador);
    const cards = parseCardsData(rawRes.data.fatura_sicredi, rawRes.data.fatura_c6);
    const salaries = parseSalaries(rawRes.data.salario_v, rawRes.data.salario_l);
    const poupanca = parsePoupanca(rawRes.data.poupanca);

    // 3. Descobre todos os meses disponíveis no Gerenciador
    const monthsSet = new Set<string>();
    for (const t of transactions) {
      if (t.mesPagamento) {
        monthsSet.add(t.mesPagamento);
      }
    }

    // Se o targetMonth não estiver no set, adiciona
    monthsSet.add(targetMonth);
    monthsSet.add('10/2026');
    monthsSet.add('11/2026');
    monthsSet.add('12/2026');
    monthsSet.add('01/2027');

    // Ordenação cronológica dos meses (MM/YYYY)
    const availableMonths = Array.from(monthsSet).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yA - yB;
      return mA - mB;
    });

    // 4. Calcula o sumário do mês selecionado
    const selectedSummary = calculateMonthSummary(
      targetMonth,
      transactions,
      cards,
      salaries,
      poupanca.totalEmConta
    );

    // 5. Radar de parcelas futuras
    const futureReleases = calculateFutureReleases(cards);

    return NextResponse.json({
      success: true,
      source: rawRes.source,
      fetchedAt: rawRes.fetchedAt,
      errorNotice: rawRes.error,
      selectedMonth: targetMonth,
      availableMonths,
      summary: selectedSummary,
      salaries,
      poupanca,
      cards,
      futureReleases,
      transactions: transactions.filter(t => t.mesPagamento === targetMonth),
    });
  } catch (err: any) {
    console.error('Erro ao processar dados financeiros:', err);
    return NextResponse.json(
      { error: 'Erro ao processar dados financeiros', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
