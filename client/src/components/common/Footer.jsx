import React from 'react';
import { Ticket, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="hidden md:block bg-slate-950 border-t border-slate-900 py-10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Ticket className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white">
              plus<span className="text-indigo-500">Ticket</span>
            </span>
          </div>

          <p className="text-sm text-slate-500 flex items-center gap-1">
            Plataforma de gestão de eventos e check-in em tempo real
          </p>

          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} plusTicket. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
