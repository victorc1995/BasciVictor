'use client';

import React, { useState } from 'react';
import { DailyCashFlow, Transaction } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CashFlowTimelineProps {
  timeline: DailyCashFlow[];
  transactions: Transaction[];
  selectedMonth: string;
}

export const CashFlowTimeline: React.FC<CashFlowTimelineProps> = ({
  timeline,
  transactions,
  selectedMonth,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Filtra dados para o gráfico (dias 1 a 31)
  const chartData = timeline.map((d) => ({
    dia: d.dia,
    dataStr: `Dia ${d.dia}`,
    saldoAcumulado: Math.round(d.saldoAcumulado),
    entradas: Math.round(d.entradas),
    saidas: Math.round(d.saidas),
    temAlerta: d.temAlertaNegativo,
  }));

  // Agrupamento por períodos da rotina financeira
  const p1 = transactions.filter((t) => (t.diaVencimento || 1) <= 4);
  const p5 = transactions.filter((t) => (t.diaVencimento || 1) >= 5 && (t.diaVencimento || 1) <= 9);
  const p10 = transactions.filter((t) => (t.diaVencimento || 1) >= 10 && (t.diaVencimento || 1) <= 19);
  const p20 = transactions.filter((t) => (t.diaVencimento || 1) >= 20);

  const selectedDayItems = selectedDay ? timeline.find((t) => t.dia === selectedDay)?.itens || [] : [];

  return (
    <div className="bg-slate-800/90 rounded-2xl border border-slate-700/90 shadow-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <CalendarDays className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-white text-base">
              Fluxo de Caixa por Data de Vencimento
            </h3>
            <p className="text-xs text-slate-400">
              Cronograma diário: Dia 01 Faturas, Dia 05 Aluguel, Dia 10-15 Fixas, Dia 20 Vale-Refeição + Água/Luz
            </p>
          </div>
        </div>

        {/* Marcadores de Rotina */}
        <div className="flex items-center space-x-1.5 text-[11px] overflow-x-auto pb-1 md:pb-0">
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
            D01 Faturas
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
            D05 Aluguel
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            D10-15 Fixas
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            D20 Vale-Refeição
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Gráfico de Área do Saldo Acumulado Dia a Dia */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="dataStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                        <div className="font-bold text-white border-b border-slate-800 pb-1">
                          {data.dataStr} de {selectedMonth}
                        </div>
                        <div className="flex justify-between space-x-4">
                          <span className="text-slate-400">Saldo Acumulado:</span>
                          <span
                            className={`font-semibold ${
                              data.saldoAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatCurrency(data.saldoAcumulado)}
                          </span>
                        </div>
                        {data.entradas > 0 && (
                          <div className="flex justify-between space-x-4 text-emerald-300">
                            <span>Entradas:</span>
                            <span>+{formatCurrency(data.entradas)}</span>
                          </div>
                        )}
                        {data.saidas > 0 && (
                          <div className="flex justify-between space-x-4 text-rose-300">
                            <span>Saídas:</span>
                            <span>-{formatCurrency(data.saidas)}</span>
                          </div>
                        )}
                        {data.temAlerta && (
                          <div className="text-rose-400 font-semibold pt-1 text-[11px]">
                            ⚠️ Alerta de saldo negativo antes do dia 20!
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Linha Zero */}
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'R$ 0', fill: '#ef4444', fontSize: 10 }} />
              {/* Linha do Dia 20 (Entrada do Vale) */}
              <ReferenceLine x="Dia 20" stroke="#10b981" strokeWidth={2} label={{ value: 'Dia 20 (VR)', fill: '#10b981', fontSize: 10, position: 'top' }} />
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo das 4 Etapas do Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Etapa 1: Dia 01 */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-400">01 a 04 / Mês</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                Faturas + Salários
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>{p1.length} lançamentos</div>
              <div className="text-slate-400">
                Total saídas: {formatCurrency(p1.filter((t) => t.tipo === 'Saída').reduce((a, c) => a + c.valor, 0))}
              </div>
            </div>
          </div>

          {/* Etapa 2: Dia 05 */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-400">05 a 09 / Mês</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                Aluguel + IPTU
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>{p5.length} lançamentos</div>
              <div className="text-slate-400">
                Total saídas: {formatCurrency(p5.filter((t) => t.tipo === 'Saída').reduce((a, c) => a + c.valor, 0))}
              </div>
            </div>
          </div>

          {/* Etapa 3: Dia 10 a 19 */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400">10 a 19 / Mês</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Contas Fixas
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>{p10.length} lançamentos</div>
              <div className="text-slate-400">
                Total saídas: {formatCurrency(p10.filter((t) => t.tipo === 'Saída').reduce((a, c) => a + c.valor, 0))}
              </div>
            </div>
          </div>

          {/* Etapa 4: Dia 20 em diante */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400">20 ao Fim</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Vale-Refeição + Água/Luz
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>{p20.length} lançamentos</div>
              <div className="text-slate-400">
                Total saídas: {formatCurrency(p20.filter((t) => t.tipo === 'Saída').reduce((a, c) => a + c.valor, 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle para lista detalhada de despesas do mês */}
        <div className="border-t border-slate-700/70 pt-4">
          <button
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <span>{showAllTransactions ? 'Ocultar Lançamentos do Mês' : 'Ver Todos os Lançamentos do Mês'} ({transactions.length})</span>
            {showAllTransactions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAllTransactions && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-2.5">Vencimento</th>
                    <th className="px-4 py-2.5">Tipo</th>
                    <th className="px-4 py-2.5">Categoria</th>
                    <th className="px-4 py-2.5">Descrição</th>
                    <th className="px-4 py-2.5">Quem</th>
                    <th className="px-4 py-2.5 text-right">Valor</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transactions
                    .sort((a, b) => (a.diaVencimento || 1) - (b.diaVencimento || 1))
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-2 font-medium text-slate-200">
                          {t.dataVenc || t.data}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              t.tipo === 'Recebimento'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {t.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400">{t.categoria}</td>
                        <td className="px-4 py-2 text-slate-200">{t.descricao}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              t.quem === 'VIC'
                                ? 'bg-blue-500/20 text-blue-300'
                                : t.quem === 'LE'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {t.quem}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            t.tipo === 'Recebimento' ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {formatCurrency(t.valor)}
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-[11px]">{t.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
