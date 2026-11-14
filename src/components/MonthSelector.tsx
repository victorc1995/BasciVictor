'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { getMonthYearLabel } from '@/lib/utils';

interface MonthSelectorProps {
  selectedMonth: string;
  availableMonths: string[];
  onSelectMonth: (month: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  availableMonths,
  onSelectMonth,
}) => {
  return (
    <div className="flex items-center space-x-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
      <div className="pl-2 pr-1 text-slate-400 flex items-center">
        <Calendar className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <select
        value={selectedMonth}
        onChange={(e) => onSelectMonth(e.target.value)}
        className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2 py-1"
      >
        {availableMonths.map((m) => (
          <option key={m} value={m} className="bg-slate-900 text-white">
            {getMonthYearLabel(m)}
          </option>
        ))}
      </select>
    </div>
  );
};
