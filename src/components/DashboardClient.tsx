'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { OverviewKPIs } from './OverviewKPIs';
import { CashFlowTimeline } from './CashFlowTimeline';
import { SalaryAnalysis } from './SalaryAnalysis';
import { CardsDeepDive } from './CardsDeepDive';
import { SavingsVault } from './SavingsVault';
import {
  LayoutDashboard,
  CalendarDays,
  Calculator,
  CreditCard,
  Vault,
  Loader2,
} from 'lucide-react';

interface DashboardClientProps {
  initialData: any;
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ initialData }) => {
  const router = useRouter();
  const [data, setData] = useState<any>(initialData);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialData?.selectedMonth || '11/2026'
  );
  const [activeTab, setActiveTab] = useState<
    'overview' | 'timeline' | 'salaries' | 'cards' | 'savings'
  >('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Busca dados quando o mês selecionado muda
  const fetchMonthData = async (month: string, forceRefresh = false) => {
    setIsLoading(true);
    try {
      const url = `/api/finance?month=${encodeURIComponent(month)}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        setSelectedMonth(month);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do mês:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMonth = (month: string) => {
    fetchMonthData(month, false);
  };

  const handleRefresh = async () => {
    await fetchMonthData(selectedMonth, true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      router.push('/login');
    }
  };

  if (!data || !data.summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const {
    source,
    fetchedAt,
    errorNotice,
    availableMonths,
    summary,
    salaries,
    poupanca,
    cards,
    futureReleases,
    transactions,
  } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegação Superior */}
      <Navbar
        source={source}
        fetchedAt={fetchedAt}
        errorNotice={errorNotice}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths || ['10/2026', '11/2026', '12/2026', '01/2027']}
        onSelectMonth={handleSelectMonth}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Barra de Navegação por Módulos / Abas */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>1. Visão Geral (KPIs & Acerto)</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'timeline'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>2. Fluxo de Caixa (Cronograma)</span>
          </button>

          <button
            onClick={() => setActiveTab('salaries')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'salaries'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>3. Contracheques & Simulador</span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'cards'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Raio-X de Cartões & Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('savings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'savings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Vault className="w-4 h-4" />
            <span>5. Cofre & Metas (Poupança)</span>
          </button>
        </div>

        {/* Loading overlay discreto ao trocar de mês */}
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-xs text-blue-400 space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Atualizando dados do mês...</span>
          </div>
        )}

        {/* Exibição Condicional do Módulo Ativo */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <OverviewKPIs summary={summary} />
            <CashFlowTimeline
              timeline={summary.timelineDays}
              transactions={transactions || []}
              selectedMonth={selectedMonth}
            />
          </div>
        )}

        {activeTab === 'timeline' && (
          <CashFlowTimeline
            timeline={summary.timelineDays}
            transactions={transactions || []}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'salaries' && (
          <SalaryAnalysis salaries={salaries} selectedMonth={selectedMonth} />
        )}

        {activeTab === 'cards' && (
          <CardsDeepDive cards={cards} futureReleases={futureReleases} />
        )}

        {activeTab === 'savings' && <SavingsVault poupanca={poupanca} />}
      </main>

      {/* Rodapé Moderno */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>Dashboard Basic Victor © 2026 — Integração Google Sheets API (6 Abas) & Competência Antecipada</p>
      </footer>
    </div>
  );
};
