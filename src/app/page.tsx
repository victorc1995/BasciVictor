import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { fetchRawSheetsData } from '@/lib/sheets';
import {
  parseGerenciador,
  parseCardsData,
  parseSalaries,
  parsePoupanca,
  calculateMonthSummary,
  calculateFutureReleases,
} from '@/lib/finance-rules';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (!isAuthenticated()) {
    redirect('/login');
  }

  // Busca dados diretamente no servidor para renderização imediata
  const targetMonth = '11/2026'; // Padrão
  const rawRes = await fetchRawSheetsData();

  const transactions = parseGerenciador(rawRes.data.gerenciador);
  const cards = parseCardsData(rawRes.data.fatura_sicredi, rawRes.data.fatura_c6);
  const salaries = parseSalaries(rawRes.data.salario_v, rawRes.data.salario_l);
  const poupanca = parsePoupanca(rawRes.data.poupanca);

  const monthsSet = new Set<string>();
  for (const t of transactions) {
    if (t.mesPagamento) monthsSet.add(t.mesPagamento);
  }
  monthsSet.add('10/2026');
  monthsSet.add('11/2026');
  monthsSet.add('12/2026');
  monthsSet.add('01/2027');

  const availableMonths = Array.from(monthsSet).sort((a, b) => {
    const [mA, yA] = a.split('/').map(Number);
    const [mB, yB] = b.split('/').map(Number);
    if (yA !== yB) return yA - yB;
    return mA - mB;
  });

  const selectedSummary = calculateMonthSummary(
    targetMonth,
    transactions,
    cards,
    salaries,
    poupanca.totalEmConta
  );

  const futureReleases = calculateFutureReleases(cards);

  const initialData = {
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
    transactions: transactions.filter((t) => t.mesPagamento === targetMonth),
  };

  return <DashboardClient initialData={initialData} />;
}
