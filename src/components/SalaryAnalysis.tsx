'use client';

import React, { useState } from 'react';
import { SalaryMonthData, SimulationParams } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import { simulateSalary } from '@/lib/finance-rules';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Calculator,
  UserCheck,
  TrendingUp,
  Percent,
  Sliders,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface SalaryAnalysisProps {
  salaries: {
    victorMonths: SalaryMonthData[];
    leticiaMonths: SalaryMonthData[];
  };
  selectedMonth: string;
}

export const SalaryAnalysis: React.FC<SalaryAnalysisProps> = ({ salaries, selectedMonth }) => {
  const [activeTab, setActiveTab] = useState<'Victor' | 'Leticia'>('Victor');

  // Parâmetros do Simulador
  const [simParams, setSimParams] = useState<SimulationParams>({
    adicionarSubstituicaoVictor: false,
    tipoSubstituicaoVictor: '1Sgt',
    valorSubstituicaoCustom: 0,
    adicionarHEleticia: false,
    horasExtrasLeticiaQtd: 32,
    valorHoraExtraLeticia: 46.37,
    simularDiarias: false,
    valorDiarias: 6200.0,
  });

  const monthsList = activeTab === 'Victor' ? salaries.victorMonths : salaries.leticiaMonths;

  // Mapeia para o gráfico comparativo mês a mês
  const chartData = monthsList.map((m) => ({
    mes: m.mes,
    Bruto: Math.round(m.totalVantagens),
    DescontosLegais: Math.round(m.impostoRenda + m.ipeSaude + m.ipePrev),
    Consignados: Math.round(m.consignados),
    Liquido: Math.round(m.liquido),
  }));

  // Pega o mês corrente ou o último mês de contracheque
  const [currM, currY] = selectedMonth.split('/');
  const mesIndex = parseInt(currM, 10);
  const currentBaseSalary = monthsList[mesIndex - 1] || monthsList[monthsList.length - 1] || monthsList[0];

  // Aplica simulação
  const simulatedSalary = currentBaseSalary
    ? simulateSalary(currentBaseSalary, simParams, activeTab)
    : null;

  const diffLiquido = simulatedSalary ? simulatedSalary.liquido - currentBaseSalary.liquido : 0;

  return (
    <div className="bg-slate-800/90 rounded-2xl border border-slate-700/90 shadow-xl overflow-hidden">
      {/* Cabeçalho com Abas Victor / Letícia */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white text-base">
              Análise de Contracheques & Simulador Interativo
            </h3>
            <p className="text-xs text-slate-400">
              Controle de Bruto, Descontos Legais (IPE Prev, IPE Saúde, IRRF), Consignados e Projeções
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('Victor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'Victor'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Victor (Salario_V)</span>
          </button>
          <button
            onClick={() => setActiveTab('Leticia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'Leticia'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Letícia (Salario_L)</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Banner Explicativo de Regras: Defasagem N-1 e Banrisul */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/60 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white block mb-0.5">Defasagem de Variáveis (Mês N-1):</span>
              Horas-Extras (Letícia) e Substituições de Sargento (Victor) trabalhadas no mês anterior refletem no
              contracheque pago no fim do mês corrente para abastecer o mês seguinte.
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/60 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white block mb-0.5">Regra Substituição vs. Banrisul (Victor):</span>
              O valor da Substituição de Sgt (~R$ 1.903,00) cobre o desconto do empréstimo Banrisul (~R$ 1.562,01). Nos
              meses de Operação Verão (sem substituição), o sistema compensa via Difa na Poupança.
            </div>
          </div>
        </div>

        {/* Gráfico Comparativo Anual */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Evolução Mensal do Contracheque ({activeTab})
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend />
                <Bar dataKey="Bruto" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DescontosLegais" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Consignados" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Liquido" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seção do Simulador Interativo */}
        <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center space-x-2 mb-4">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h4 className="font-semibold text-white text-sm">
              Simulador de Cenários Futuros ({activeTab})
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controles do Simulador */}
            <div className="lg:col-span-2 space-y-4">
              {activeTab === 'Victor' ? (
                <>
                  {/* Toggle Substituição */}
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-200">
                        Adicionar Substituição de Sargento / Oficial
                      </span>
                      <input
                        type="checkbox"
                        checked={simParams.adicionarSubstituicaoVictor}
                        onChange={(e) =>
                          setSimParams({ ...simParams, adicionarSubstituicaoVictor: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                      />
                    </label>

                    {simParams.adicionarSubstituicaoVictor && (
                      <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSimParams({ ...simParams, tipoSubstituicaoVictor: '1Sgt' })}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                            simParams.tipoSubstituicaoVictor === '1Sgt'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          1º Sgt (~R$ 1.903,76)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimParams({ ...simParams, tipoSubstituicaoVictor: '2Sgt' })}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                            simParams.tipoSubstituicaoVictor === '2Sgt'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          2º Sgt (~R$ 1.393,78)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimParams({ ...simParams, tipoSubstituicaoVictor: '1Ten' })}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                            simParams.tipoSubstituicaoVictor === '1Ten'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          1º Ten (~R$ 3.584,09)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Toggle Diárias */}
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-200">
                        Simular Diárias (Operação Verão)
                      </span>
                      <input
                        type="checkbox"
                        checked={simParams.simularDiarias}
                        onChange={(e) =>
                          setSimParams({ ...simParams, simularDiarias: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                      />
                    </label>

                    {simParams.simularDiarias && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Valor estimado de diárias:</span>
                          <span className="text-white font-semibold">{formatCurrency(simParams.valorDiarias)}</span>
                        </div>
                        <input
                          type="range"
                          min={1000}
                          max={8000}
                          step={200}
                          value={simParams.valorDiarias}
                          onChange={(e) =>
                            setSimParams({ ...simParams, valorDiarias: parseFloat(e.target.value) })
                          }
                          className="w-full accent-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Controles Letícia: Horas Extras */}
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-200">
                        Adicionar Horas-Extras no Mês
                      </span>
                      <input
                        type="checkbox"
                        checked={simParams.adicionarHEleticia}
                        onChange={(e) =>
                          setSimParams({ ...simParams, adicionarHEleticia: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                      />
                    </label>

                    {simParams.adicionarHEleticia && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                            <span>Quantidade de Horas Extras:</span>
                            <span className="font-bold text-purple-400">
                              {simParams.horasExtrasLeticiaQtd} horas
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={60}
                            step={1}
                            value={simParams.horasExtrasLeticiaQtd}
                            onChange={(e) =>
                              setSimParams({
                                ...simParams,
                                horasExtrasLeticiaQtd: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-purple-500"
                          />
                        </div>

                        <div className="text-xs text-slate-400 flex justify-between items-center">
                          <span>Valor/Hora Base:</span>
                          <span className="text-slate-200 font-medium">
                            {formatCurrency(simParams.valorHoraExtraLeticia)} (Total:{' '}
                            {formatCurrency(
                              simParams.horasExtrasLeticiaQtd * simParams.valorHoraExtraLeticia
                            )}
                            )
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Resultado da Simulação */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Projeção Simulada
                </span>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Líquido Base:</span>
                    <span className="text-slate-200">{formatCurrency(currentBaseSalary?.liquido)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Novo Bruto Estimado:</span>
                    <span className="text-slate-200">{formatCurrency(simulatedSalary?.totalVantagens)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Descontos Estimados:</span>
                    <span className="text-rose-300">{formatCurrency(simulatedSalary?.totalDescontos)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-white">Novo Líquido:</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {formatCurrency(simulatedSalary?.liquido)}
                    </span>
                  </div>
                </div>
              </div>

              {diffLiquido !== 0 && (
                <div
                  className={`mt-4 p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    diffLiquido > 0
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  <span>Impacto Líquido:</span>
                  <span>
                    {diffLiquido > 0 ? '+' : ''}
                    {formatCurrency(diffLiquido)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
