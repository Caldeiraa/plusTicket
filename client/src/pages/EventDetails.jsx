import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Globe, ArrowLeft, ShieldCheck, Ticket } from 'lucide-react';
import { eventsApi } from '../api/events';
import { ticketsApi } from '../api/tickets';
import { formatDate, formatTime, formatCurrency } from '../utils/formatters';
import { TicketSelector } from '../components/events/TicketSelector';
import { useAuth } from '../context/AuthContext';

export const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isOrganizer } = useAuth();

  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState({});

  useEffect(() => {
    const loadEventData = async () => {
      setLoading(true);
      try {
        const [eventRes, ticketsRes] = await Promise.all([
          eventsApi.getById(id),
          ticketsApi.getTicketTypes(id),
        ]);

        if (eventRes.success) {
          setEvent(eventRes.data);
        }
        if (ticketsRes.success) {
          setTicketTypes(ticketsRes.data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar evento:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadEventData();
    }
  }, [id]);

  const handleQuantityChange = (ticketTypeId, qty) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: qty,
    }));
  };

  const totalTicketsSelected = Object.values(selectedQuantities).reduce((acc, q) => acc + q, 0);

  const totalPrice = ticketTypes.reduce((acc, type) => {
    const qty = selectedQuantities[type.id] || 0;
    return acc + qty * parseFloat(type.price);
  }, 0);

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    const selectedItems = Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => {
        const type = ticketTypes.find((t) => t.id === ticketTypeId);
        return {
          ticketTypeId,
          quantity,
          name: type.name,
          unitPrice: parseFloat(type.price),
        };
      });

    if (selectedItems.length === 0) return;

    navigate('/checkout', {
      state: {
        event,
        items: selectedItems,
        totalPrice,
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-6">
        <div className="h-64 rounded-3xl glass-card animate-pulse" />
        <div className="h-32 rounded-3xl glass-card animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-white">Evento não encontrado</h2>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  const defaultBanner = 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-800">
        <div className="h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
          <img
            src={event.imageUrl || defaultBanner}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = defaultBanner;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
            {event.city} - {event.state}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {event.title}
          </h1>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              {formatDate(event.date)} às {formatTime(event.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-400" />
              {event.venue}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col: Details & Description */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Sobre o Evento
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white">Localização</h3>
            <p className="text-xs text-slate-300">{event.address}</p>
            <p className="text-xs text-slate-400">{event.city}, {event.state} {event.zipCode ? `- ${event.zipCode}` : ''}</p>
            {event.isOnline && event.onlineUrl && (
              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400">
                <Globe className="w-4 h-4" />
                Evento Transmitido Online
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Ticket Selector & Purchase Box */}
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 sticky top-20 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-400" />
                Ingressos
              </h3>
            </div>

            {isOrganizer ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="text-sm">⚠️</span> Modo Organizador
                </p>
                <p className="text-slate-300">
                  Sua conta é de <strong>Organizador</strong>. Para comprar ingressos como cliente, entre com uma conta de participante.
                </p>
              </div>
            ) : (
              <>
                {ticketTypes.length > 0 ? (
                  <div className="space-y-3">
                    {ticketTypes.map((type) => (
                      <TicketSelector
                        key={type.id}
                        ticketType={type}
                        quantity={selectedQuantities[type.id] || 0}
                        onQuantityChange={(qty) => handleQuantityChange(type.id, qty)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nenhum lote de ingresso disponível no momento.
                  </p>
                )}

                {/* Total Footer */}
                {totalTicketsSelected > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Total ({totalTicketsSelected} ingressos)</span>
                      <span className="text-xl font-extrabold text-indigo-400">
                        {formatCurrency(totalPrice)}
                      </span>
                    </div>

                    <button
                      onClick={handleProceedToCheckout}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Ir para Pagamento
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
