import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Ticket, QrCode, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BottomNav = () => {
  const location = useLocation();
  const { isAuthenticated, isOrganizer } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-slate-800/80 px-2 py-1.5 backdrop-blur-xl">
      <div className="flex items-center justify-around">

        {/* Eventos */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/') ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">Eventos</span>
        </Link>

        {/* Meus Ingressos (Apenas para Participante) */}
        {!isOrganizer && (
          <Link
            to={isAuthenticated ? "/my-tickets" : "/login"}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/my-tickets') ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Ticket className="w-5 h-5" />
            <span className="text-[10px]">Ingressos</span>
          </Link>
        )}

        {/* Scanner / Portaria (Organizador) */}
        {isOrganizer && (
          <Link
            to="/organizer/scanner"
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/organizer/scanner') ? 'text-emerald-400 font-bold scale-105' : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
          >
            <div className="w-10 h-10 -mt-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-slate-950">
              <QrCode className="w-5 h-5 font-extrabold" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-400">Portaria</span>
          </Link>
        )}

        {/* Dashboard do Organizador */}
        {isOrganizer && (
          <Link
            to="/organizer/dashboard"
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/organizer/dashboard') ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">Painel</span>
          </Link>
        )}

        {/* Perfil / Login */}
        <Link
          to={isAuthenticated ? (isOrganizer ? "/organizer/dashboard" : "/my-tickets") : "/login"}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/login') || isActive('/register') ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{isAuthenticated ? 'Conta' : 'Entrar'}</span>
        </Link>

      </div>
    </nav>
  );
};
