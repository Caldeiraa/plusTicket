import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, Users, ArrowRight } from 'lucide-react';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

export const EventCard = ({ event }) => {
  if (!event) return null;

  const lowestPrice = Array.isArray(event?.ticketTypes) && event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((t) => parseFloat(t.price)))
    : null;

  const defaultImage = 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group glass-card rounded-3xl overflow-hidden border border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-full">
      {/* Thumbnail */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-900">
        <img
          src={event.imageUrl || defaultImage}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = defaultImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        
        {/* City Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold glass-panel text-white shadow-lg backdrop-blur-md border border-white/10 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-400" />
            {event.city}
          </span>
        </div>

        {/* Date Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-xs font-medium text-indigo-300 border border-slate-800 flex items-center gap-1.5 backdrop-blur-md">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {formatDate(event.date)} às {formatTime(event.date)}
          </span>
          {event.isOnline && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Online
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {event.shortDesc || event.description}
          </p>
        </div>

        {/* Info Grid */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">A partir de</span>
            <span className="text-base font-extrabold text-indigo-400">
              {lowestPrice !== null ? formatCurrency(lowestPrice) : 'Sob Consulta'}
            </span>
          </div>

          <Link
            to={`/events/${event.id}`}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 group-hover:shadow-lg group-hover:shadow-indigo-600/20"
          >
            Garantir Vaga
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
