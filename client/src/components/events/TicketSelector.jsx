import React from 'react';
import { Plus, Minus, Ticket, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const TicketSelector = ({ ticketType, quantity, onQuantityChange }) => {
  const available = ticketType.quantity - ticketType.sold;
  const isSoldOut = available <= 0;

  return (
    <div className={`p-4 rounded-2xl glass-card border transition-all ${
      quantity > 0 ? 'border-indigo-500/60 bg-indigo-950/20' : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white">{ticketType.name}</h4>
            {quantity > 0 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
          </div>
          {ticketType.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ticketType.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-extrabold text-indigo-400">
              {formatCurrency(ticketType.price)}
            </span>
            <span className="text-[11px] text-slate-500">
              {isSoldOut ? 'Esgotado' : `${available} disponíveis`}
            </span>
          </div>
        </div>

        {/* Counter controls */}
        {!isSoldOut ? (
          <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80">
            <button
              onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              className="w-8 h-8 rounded-lg bg-slate-800 disabled:opacity-30 hover:bg-slate-700 flex items-center justify-center text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm text-white">{quantity}</span>
            <button
              onClick={() => onQuantityChange(Math.min(ticketType.maxPerUser || 5, available, quantity + 1))}
              disabled={quantity >= Math.min(ticketType.maxPerUser || 5, available)}
              className="w-8 h-8 rounded-lg bg-indigo-600 disabled:opacity-30 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold">
            Esgotado
          </span>
        )}
      </div>
    </div>
  );
};
