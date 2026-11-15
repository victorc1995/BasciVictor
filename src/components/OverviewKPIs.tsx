'use client';

import React from 'react';
import { MonthSummary } from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  ArrowRightLeft,
  Utensils,
  CheckCircle2,
  Users,
  AlertTriangle,
  Building2,
  Send,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

interface OverviewKPIsProps {
  summary: MonthSummary;
}

export const OverviewKPIs: React.FC<OverviewKPIsProps> = ({ summary }) => {
  const {
    receitaVictor,
    receitaLeticia,
    receitaTotal,
    saidasTotal,
    saidasVIC,
    saidasLE,
    saidasDIV,
    saldoComVR,
    saldoSemVR,
    vrTotal,
    poupancaTotal,
    reservaEmergencia,
    poupancaLivre,
    acerto,
    hasNegativeBeforeDay20,
    lowestBalanceBeforeDay20,
    dayLowestBalance,
    contaRealVictor,
    despesasReaisFamilia,
  } = summary;

  return (
    <div className="space-y-6">
      {/* CARD DE DESTAQUE: MINHA CONTA BANCÁRIA REAL (VICTOR - FORMATO "CONTA") */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-6 border-2 border-blue-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Minha Conta Bancária Real (Victor)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Formato "Conta"
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Movimentação líquida real da sua conta corrente no mês
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-700/70">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Saldo Líquido da Conta
              </span>
              <span
                className={`text-2xl font-black ${
                  contaRealVictor.saldoFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(contaRealVictor.saldoFinal)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Detalhamento da Conta Real do Victor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          {/* Entradas */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Entradas na Conta</span>
              <span className="text-emerald-400 font-bold">
                +{formatCurrency(contaRealVictor.entradasTotal)}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subsídio:</span>
                <span className="text-slate-200">{formatCurrency(contaRealVictor.subsidio)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vale-Refeição (Dia 20):</span>
                <span className="text-slate-200">{formatCurrency(contaRealVictor.valeAlimentacao)}</span>
              </div>
            </div>
          </div>

          {/* Transferência para Letícia (Pacote de Contas) */}
          <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between text-xs text-blue-300 mb-2">
              <span className="font-bold flex items-center space-x-1">
                <Send className="w-3.5 h-3.5" />
                <span>Transferido p/ Letícia</span>
              </span>
              <span className="text-white font-bold">
                -{formatCurrency(contaRealVictor.transferenciaLeticia)}
              </span>
            </div>
            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              Valor transferido para a conta da Letícia para pagar as contas da casa (luz, água, carro, aluguel e faturas).
            </p>
          </div>

          {/* Outros Débitos em Conta */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Outros Débitos Diretos</span>
              <span className="text-rose-300 font-bold">
                -{formatCurrency(contaRealVictor.saidasTotal - contaRealVictor.transferenciaLeticia)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Fatura C6 débito em conta, reenquadramento e tarifas debitadas diretamente da sua conta.
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Caixa Crítico se houver risco real antes do dia 20 */}
      {hasNegativeBeforeDay20 && (
        <div className="rounded-2xl p-4 bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-bold text-rose-200">Atenção ao Fluxo de Caixa da 1ª Quinzena: </span>
            A projeção indica que a conta atingirá saldo negativo de{' '}
            <strong className="text-white underline">{formatCurrency(lowestBalanceBeforeDay20)}</strong> no dia{' '}
            {dayLowestBalance} do mês, antes do reforço do Vale-Refeição no dia 20.
          </div>
        </div>
      )}

      {/* Grid de 4 Cards: Visão Consolidada Familiar (Sem Duplicidade) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Receita Familiar Real */}
        <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Receita Familiar Real
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{formatCurrency(receitaTotal)}</div>
            <div className="mt-2 text-xs text-slate-400 flex flex-col space-y-0.5 border-t border-slate-700/50 pt-2">
              <div className="flex justify-between">
                <span>Victor:</span>
                <span className="text-slate-200 font-medium">{formatCurrency(receitaVictor)}</span>
              </div>
              <div className="flex justify-between">
                <span>Letícia:</span>
                <span className="text-slate-200 font-medium">{formatCurrency(receitaLeticia)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Despesas Reais da Casa (Sem duplicar o pacote de transferência) */}
        <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-rose-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Despesas da Casa
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(despesasReaisFamilia || saidasTotal)}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex flex-col space-y-0.5 border-t border-slate-700/50 pt-2">
              <div className="flex justify-between">
                <span>VIC: {formatCurrency(saidasVIC)}</span>
                <span>LE: {formatCurrency(saidasLE)}</span>
              </div>
              <div className="flex justify-between text-blue-300 font-medium">
                <span>Compartilhado (DIV):</span>
                <span>{formatCurrency(saidasDIV)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Saldo Líquido Familiar */}
        <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Saldo Líquido Familiar
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold tracking-tight ${
                saldoComVR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(saldoComVR)}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex flex-col space-y-1 border-t border-slate-700/50 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sem VR do dia 20:</span>
                <span
                  className={`font-semibold ${
                    saldoSemVR >= 0 ? 'text-slate-200' : 'text-rose-300'
                  }`}
                >
                  {formatCurrency(saldoSemVR)}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-400/90 text-[11px]">
                <span>+ Reforço VR dia 20:</span>
                <span>{formatCurrency(vrTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Cofre da Poupança & Saldo Livre */}
        <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Saldo Livre Operacional
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300 tracking-tight">
              {formatCurrency(poupancaLivre)}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex flex-col space-y-0.5 border-t border-slate-700/50 pt-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Total no Cofre:</span>
                <span className="text-slate-200 font-medium">{formatCurrency(poupancaTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-300">
                <span className="flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-rose-400 inline" />
                  <span>Trava Emergência:</span>
                </span>
                <span className="font-semibold">{formatCurrency(reservaEmergencia)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card de Fechamento Individual & Acerto Mensal (Victor vs. Letícia) */}
      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/90 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white text-base">
              Fechamento Individual & Acerto de Contas
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Regra 50% DIV + 100% gastos pessoais (VIC / LE)
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Lado Victor */}
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/60 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-blue-400 text-sm tracking-wide">VICTOR ROQUE</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                  VIC
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Salário Líquido Real:</span>
                  <span className="font-semibold text-white">{formatCurrency(receitaVictor)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gastos Próprios (VIC):</span>
                  <span className="font-medium text-slate-200">{formatCurrency(saidasVIC)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sua Cota do Compartilhado (50% DIV):</span>
                  <span className="font-medium text-slate-200">{formatCurrency(saidasDIV / 2)}</span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex justify-between text-slate-300 font-medium">
                  <span>Total Cota Devida:</span>
                  <span className="text-rose-300 font-bold">{formatCurrency(acerto.cotaVictor)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Desembolsado Diretamente:</span>
                  <span className="text-slate-300">{formatCurrency(acerto.gastoDiretoVictor)}</span>
                </div>
              </div>
            </div>

            {/* Centro: Transferência de Acerto */}
            <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900/40 to-slate-950/60 rounded-xl border border-slate-700 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Acerto do Mês
              </div>
              {acerto.valorTransferencia > 0.05 ? (
                <>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                    {formatCurrency(acerto.valorTransferencia)}
                  </div>
                  <div className="mt-2 text-xs text-slate-300 max-w-xs leading-relaxed px-2 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                    <strong className="text-amber-300 font-semibold">{acerto.devedor}</strong> deve transferir para{' '}
                    <strong className="text-emerald-300 font-semibold">{acerto.credor}</strong>
                  </div>
                </>
              ) : (
                <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Contas 100% equilibradas</span>
                </div>
              )}
            </div>

            {/* Lado Letícia */}
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/60 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-purple-400 text-sm tracking-wide">LETÍCIA RIBEIRO</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                  LE
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Salário Líquido Real:</span>
                  <span className="font-semibold text-white">{formatCurrency(receitaLeticia)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gastos Próprios (LE):</span>
                  <span className="font-medium text-slate-200">{formatCurrency(saidasLE)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sua Cota do Compartilhado (50% DIV):</span>
                  <span className="font-medium text-slate-200">{formatCurrency(saidasDIV / 2)}</span>
                </div>
                <div className="border-t border-slate-700/60 pt-2 flex justify-between text-slate-300 font-medium">
                  <span>Total Cota Devida:</span>
                  <span className="text-rose-300 font-bold">{formatCurrency(acerto.cotaLeticia)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Desembolsado Diretamente:</span>
                  <span className="text-slate-300">{formatCurrency(acerto.gastoDiretoLeticia)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
