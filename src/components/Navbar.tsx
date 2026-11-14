'use client';

import React, { useState } from 'react';
import { RefreshCw, LogOut, ShieldCheck, Database, Calendar, AlertCircle } from 'lucide-react';
import { MonthSelector } from './MonthSelector';

interface NavbarProps {
  source: 'google-sheets-api' | 'snapshot-fallback';
  fetchedAt: string;
  errorNotice?: string;
  selectedMonth: string;
  availableMonths: string[];
  onSelectMonth: (m: string) => void;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  source,
  fetchedAt,
  errorNotice,
  selectedMonth,
  availableMonths,
  onSelectMonth,
  onRefresh,
  onLogout,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Título */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Dashboard Basic Victor
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30">
                  2026
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Gestão Financeira Pessoal & Acordo Familiar</p>
            </div>
          </div>

          {/* Filtro de Mês e Controles Centrais/Direita */}
          <div className="flex items-center space-x-3">
            {/* Seletor de Mês */}
            <MonthSelector
              selectedMonth={selectedMonth}
              availableMonths={availableMonths}
              onSelectMonth={onSelectMonth}
            />

            {/* Badge de Origem dos Dados */}
            <div className="hidden lg:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
              {source === 'google-sheets-api' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 font-medium">Google Sheets Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-400 font-medium" title={errorNotice || 'Snapshot local ativo'}>
                    Snapshot Ativo
                  </span>
                </>
              )}
              {formattedTime && <span className="text-slate-400">({formattedTime})</span>}
            </div>

            {/* Botão Atualizar */}
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
              title="Sincronizar com Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden md:inline">Atualizar</span>
            </button>

            {/* Botão Sair */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
              title="Sair da aplicação"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aviso informativo de Snapshot se não houver credenciais */}
      {source === 'snapshot-fallback' && errorNotice && (
        <div className="bg-amber-500/10 border-t border-b border-amber-500/20 px-4 py-1.5 text-center text-xs text-amber-300 flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}
    </header>
  );
};
