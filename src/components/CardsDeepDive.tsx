'use client';

import React, { useState, useMemo } from 'react';
import { CardTransaction, FutureInstallmentRelease, Payer } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Search,
  Filter,
  TrendingDown,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface CardsDeepDiveProps {
  cards: CardTransaction[];
  futureReleases: FutureInstallmentRelease[];
}

export const CardsDeepDive: React.FC<CardsDeepDiveProps> = ({ cards, futureReleases }) => {
  const [filterCard, setFilterCard] = useState<string>('all');
  const [filterPayer, setFilterPayer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lista única de nomes de cartões
  const uniqueCards = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.cartao) set.add(c.cartao);
    });
    return Array.from(set);
  }, [cards]);

  // Transações filtradas
  const filteredTransactions = useMemo(() => {
    return cards.filter((item) => {
      // Filtro de cartão
      if (filterCard !== 'all' && item.cartao !== filterCard) {
        return false;
      }
      // Filtro de pagador
      if (filterPayer !== 'all' && item.quem !== filterPayer) {
        return false;
      }
      // Busca por estabelecimento / descrição
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = item.descricao.toLowerCase().includes(q);
        const matchesCard = item.cartao.toLowerCase().includes(q);
        const matchesPayer = item.quem.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCard && !matchesPayer) {
          return false;
        }
      }
      return true;
    });
  }, [cards, filterCard, filterPayer, searchQuery]);

  // Totais rápidos
  const totalGeralFiltrado = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + curr.valor, 0);
  }, [filteredTransactions]);

  const totalVIC = useMemo(() => {
    return filteredTransactions.filter((c) => c.quem === 'VIC').reduce((acc, curr) => acc + curr.valor, 0);
  }, [filteredTransactions]);

  const totalLE = useMemo(() => {
    return filteredTransactions.filter((c) => c.quem === 'LE').reduce((acc, curr) => acc + curr.valor, 0);
  }, [filteredTransactions]);

  const totalDIV = useMemo(() => {
    return filteredTransactions.filter((c) => c.quem === 'DIV').reduce((acc, curr) => acc + curr.valor, 0);
  }, [filteredTransactions]);

  // Dados para o gráfico do Radar de Parcelas Futuras
  const releaseChartData = futureReleases.map((f) => ({
    mesAno: f.mesAno,
    Liberado: Math.round(f.valorLiberadoTotal),
    Restante: Math.round(f.valorRestanteFaturas),
  }));

  return (
    <div className="bg-slate-800/90 rounded-2xl border border-slate-700/90 shadow-xl overflow-hidden space-y-6">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-semibold text-white text-base">
              Raio-X de Cartões & Radar de Parcelas Futuras
            </h3>
            <p className="text-xs text-slate-400">
              Lançamentos Sicredi & C6 Bank, divisão (LE / VIC / DIV) e projeção de faturas liberadas
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Radar de Parcelas Futuras (Alívio de Limite Mês a Mês) */}
        <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/70">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span>Radar de Parcelas Futuras (Alívio no Orçamento)</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores de parcelas em término que serão liberados do fluxo mensal nos próximos meses
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={releaseChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="mesAno" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `R$${val}`}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Bar dataKey="Liberado" fill="#10b981" name="Valor Liberado (R$)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Busca por estabelecimento */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por estabelecimento..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Filtro de Cartão */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <select
              value={filterCard}
              onChange={(e) => setFilterCard(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer py-1"
            >
              <option value="all" className="bg-slate-900">Todos os Cartões</option>
              {uniqueCards.map((c) => (
                <option key={c} value={c} className="bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Pagador */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterPayer}
              onChange={(e) => setFilterPayer(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer py-1"
            >
              <option value="all" className="bg-slate-900">Todos os Pagadores (LE / VIC / DIV)</option>
              <option value="VIC" className="bg-slate-900">100% Victor (VIC)</option>
              <option value="LE" className="bg-slate-900">100% Letícia (LE)</option>
              <option value="DIV" className="bg-slate-900">Compartilhado (DIV 50/50)</option>
            </select>
          </div>
        </div>

        {/* Cards de Métricas do Filtro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Filtrado</span>
            <span className="text-base font-bold text-white">{formatCurrency(totalGeralFiltrado)}</span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-blue-400 block">Total Victor (VIC)</span>
            <span className="text-base font-bold text-blue-300">{formatCurrency(totalVIC)}</span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-purple-400 block">Total Letícia (LE)</span>
            <span className="text-base font-bold text-purple-300">{formatCurrency(totalLE)}</span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-amber-400 block">Compartilhado (DIV)</span>
            <span className="text-base font-bold text-amber-300">{formatCurrency(totalDIV)}</span>
          </div>
        </div>

        {/* Tabela de Lançamentos dos Cartões */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 pb-6">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-700">
              <tr>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Cartão</th>
                <th className="px-4 py-2.5">Descrição</th>
                <th className="px-4 py-2.5 text-center">Parcela</th>
                <th className="px-4 py-2.5">Pagador</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5">Pgto Fatura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-2.5 font-medium text-slate-400">{item.data}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                        {item.cartao}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-100">{item.descricao}</td>
                    <td className="px-4 py-2.5 text-center">
                      {item.parcelaTexto ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                          {item.parcelaTexto}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.quem === 'VIC'
                            ? 'bg-blue-500/20 text-blue-300'
                            : item.quem === 'LE'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.quem}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-white">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">{item.dataPagamento || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
