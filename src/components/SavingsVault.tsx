'use client';

import React from 'react';
import { SavingsItem } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import {
  Vault,
  ShieldCheck,
  Car,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';

interface SavingsVaultProps {
  poupanca: {
    items: SavingsItem[];
    totalEmConta: number;
    reservaEmergencia: number;
    saldoLivre: number;
    carroMeta: {
      valorCarro: number;
      entrada: number;
      financiamento: number;
      ipva: number;
    };
  };
}

export const SavingsVault: React.FC<SavingsVaultProps> = ({ poupanca }) => {
  const { totalEmConta, reservaEmergencia, saldoLivre, items, carroMeta } = poupanca;

  // Percentual da Reserva em relação ao total
  const percentEmergencia = totalEmConta > 0 ? Math.min(100, Math.round((reservaEmergencia / totalEmConta) * 100)) : 0;
  const percentLivre = 100 - percentEmergencia;

  // Itens Difa Banrisul (Compensações)
  const difaItems = items.filter((i) => i.isDifa);

  // Entradas Futuras Programadas
  const futureIncomes = items.filter((i) => i.isEntrada && !i.isEmergencia);

  // Saídas Programadas (Metas e Obras)
  const futureExpenses = items.filter((i) => !i.isEntrada && !i.isDifa);

  return (
    <div className="bg-slate-800/90 rounded-2xl border border-slate-700/90 shadow-xl overflow-hidden space-y-6">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Vault className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-semibold text-white text-base">
              Cofre & Metas da Poupança
            </h3>
            <p className="text-xs text-slate-400">
              Reserva de Emergência intocável, Saldo Livre Operacional, Metas do Carro e Compensações Difa
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Termômetro da Reserva de Emergência vs Saldo Livre */}
        <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Termômetro de Blindagem da Poupança
              </span>
              <div className="text-xl font-bold text-white mt-0.5">
                Total em Conta: {formatCurrency(totalEmConta)}
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-rose-300 font-semibold">
                  Reserva Intocável ({formatCurrency(reservaEmergencia)})
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-amber-300 font-semibold">
                  Saldo Livre ({formatCurrency(saldoLivre)})
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Bicolor */}
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex p-0.5">
            <div
              style={{ width: `${percentEmergencia}%` }}
              className="h-full bg-gradient-to-r from-rose-600 to-rose-500 rounded-l-full relative group transition-all duration-500"
              title={`Reserva de Emergência: ${formatCurrency(reservaEmergencia)}`}
            />
            <div
              style={{ width: `${percentLivre}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full relative group transition-all duration-500"
              title={`Saldo Livre Operacional: ${formatCurrency(saldoLivre)}`}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-rose-400 inline" />
              <span>Trava de Segurança: R$ 5.000,00 blindados para emergências reais</span>
            </span>
            <span>{percentLivre}% livre para metas e investimentos</span>
          </div>
        </div>

        {/* Card da Meta do Carro & Custos Associados */}
        <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/70">
          <div className="flex items-center space-x-2 mb-4">
            <Car className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className="font-semibold text-white text-sm">
                Projeto Veículo & Planejamento Financeiro
              </h4>
              <p className="text-xs text-slate-400">Projeção da compra, entrada da poupança e parcelas</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 block">Valor do Carro</span>
              <span className="text-base font-bold text-white">{formatCurrency(carroMeta.valorCarro)}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-emerald-400 block">Entrada Programada</span>
              <span className="text-base font-bold text-emerald-300">
                {formatCurrency(carroMeta.entrada)}
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-amber-400 block">Saldo a Financiar</span>
              <span className="text-base font-bold text-amber-300">
                {formatCurrency(carroMeta.financiamento)}
              </span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-purple-400 block">IPVA (c/ Descontos)</span>
              <span className="text-base font-bold text-purple-300">
                {formatCurrency(carroMeta.ipva)}
              </span>
            </div>
          </div>
        </div>

        {/* Cronograma de Entradas Futuras & Compensações Difa Banrisul */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lado Esquerdo: Entradas Futuras (13º, Diárias de Verão) */}
          <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                  Entradas Programadas (13º & Diárias de Verão)
                </h4>
              </div>

              <div className="space-y-2">
                {futureIncomes.slice(0, 8).map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{inc.descricao}</div>
                      <div className="text-[10px] text-slate-400">{inc.data}</div>
                    </div>
                    <div className="font-bold text-emerald-400 flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{formatCurrency(inc.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lado Direito: Compensações Difa Banrisul (Operação Verão) */}
          <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                  Compensações Difa Banrisul (~R$ 1.562,01)
                </h4>
              </div>

              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                Nos meses de Operação Verão sem substituição de sargento, o valor de <strong>R$ 1.562,01</strong> é
                compensado automaticamente das diárias acumuladas na Poupança, mantendo o restante blindado.
              </p>

              <div className="space-y-2">
                {difaItems.slice(0, 8).map((difa) => (
                  <div
                    key={difa.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{difa.descricao}</div>
                      <div className="text-[10px] text-slate-400">{difa.data}</div>
                    </div>
                    <div className="font-bold text-amber-400 flex items-center space-x-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>{formatCurrency(difa.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Saídas e Benfeitorias Programadas (Obras, Ar Condicionado, etc.) */}
        <div className="pb-6">
          <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
            Outras Saídas Programadas (Obras, Financiamento, IPVA, Família)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {futureExpenses.slice(0, 9).map((exp) => (
              <div
                key={exp.id}
                className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/50 text-xs flex justify-between items-center"
              >
                <div>
                  <div className="font-medium text-slate-300 truncate max-w-[160px]">{exp.descricao}</div>
                  <div className="text-[10px] text-slate-500">{exp.data}</div>
                </div>
                <div className="font-semibold text-rose-300">{formatCurrency(exp.valor)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
