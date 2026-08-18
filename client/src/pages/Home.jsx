import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, MapPin, Calendar, Sparkles, CheckCircle2, Ticket } from 'lucide-react';
import { eventsApi } from '../api/events';
import { EventCard } from '../components/events/EventCard';

export const Home = () => {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [createdBanner, setCreatedBanner] = useState(location.state?.eventCreated);
  const createdTitle = location.state?.title;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await eventsApi.list({
        search: search || undefined,
        city: city || undefined,
        status: 'PUBLISHED',
      });
      if (res.success && res.data) {
        setEvents(Array.isArray(res.data) ? res.data : (res.data.events || []));
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, city]);

  return (
    <div className="space-y-10 pb-12">
      {/* Banner de Evento Publicado */}
      {createdBanner && (
        <div className="glass-panel p-4 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-sm flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">Evento publicado com sucesso!</p>
              <p className="text-xs text-emerald-400">
                "{createdTitle || 'Seu evento'}" já está no ar e disponível para compra na lista abaixo.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreatedBanner(false)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden glass-panel p-8 sm:p-12 border border-slate-800 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Check-in em tempo real via QR Code
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Viva experiências inesquecíveis nos melhores <span className="text-indigo-400">eventos</span>.
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            Compre seus ingressos com segurança, receba o PDF com QR Code e acompanhe suas entradas diretamente pelo celular.
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar evento, show, conferência..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <MapPin className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar por Cidade"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Event List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-400" />
            Eventos Disponíveis
          </h2>
          <span className="text-xs text-slate-400">
            {events.length} {events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-3xl glass-card animate-pulse" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-12 text-center border border-slate-800 space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum evento encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente alterar os termos de busca ou remover o filtro por cidade.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
