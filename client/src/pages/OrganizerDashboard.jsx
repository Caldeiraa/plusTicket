import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Ticket, DollarSign, Activity, Radio, QrCode, Calendar, MapPin, RefreshCw } from 'lucide-react';
import { eventsApi } from '../api/events';
import { dashboardApi } from '../api/dashboard';
import { useSocket } from '../context/SocketContext';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';
import { Link } from 'react-router-dom';

export const OrganizerDashboard = () => {
  const { socket, connected, joinEventRoom, leaveEventRoom } = useSocket();

  const [myEvents, setMyEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar eventos do organizador
  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        const res = await eventsApi.getMyEvents();
        const list = Array.isArray(res.data) ? res.data : (res.data?.events || []);
        if (res.success && list.length > 0) {
          setMyEvents(list);
          setSelectedEventId(list[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar eventos do organizador:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyEvents();
  }, []);

  // Carregar dados ao vivo e escutar WebSockets quando um evento for selecionado
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchLiveStats = async () => {
      try {
        const res = await dashboardApi.getLiveData(selectedEventId);
        if (res.success && res.data) {
          setLiveData(res.data);
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas ao vivo:', err);
      }
    };

    fetchLiveStats();

    // Entrar na sala do evento no Socket.IO
    joinEventRoom(selectedEventId);

    if (socket) {
      const handleCheckInNew = (data) => {
        console.log('⚡ Novo check-in recebido via Socket:', data);
        setLiveData((prev) => {
          if (!prev) return prev;
          const newCheckInsCount = prev.checkIns.total + 1;
          const newRate = prev.capacity > 0 ? ((newCheckInsCount / prev.capacity) * 100).toFixed(1) : 0;
          return {
            ...prev,
            checkIns: {
              ...prev.checkIns,
              total: newCheckInsCount,
              rate: parseFloat(newRate),
            },
            recentCheckIns: [data, ...(prev.recentCheckIns || [])].slice(0, 10),
          };
        });
      };

      const handleTicketSold = (data) => {
        console.log('⚡ Novo ingresso vendido via Socket:', data);
        fetchLiveStats();
      };

      socket.on('checkin:new', handleCheckInNew);
      socket.on('ticket:sold', handleTicketSold);

      return () => {
        socket.off('checkin:new', handleCheckInNew);
        socket.off('ticket:sold', handleTicketSold);
        leaveEventRoom(selectedEventId);
      };
    }
  }, [selectedEventId, socket]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 space-y-6">
        <div className="h-20 rounded-3xl glass-card animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-3xl glass-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (myEvents.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 glass-panel rounded-3xl p-8 border border-slate-800">
        <LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Nenhum evento cadastrado</h2>
        <p className="text-xs text-slate-400">
          Crie seu primeiro evento para acompanhar as vendas e validar QR Codes na portaria ao vivo.
        </p>
        <Link
          to="/organizer/create-event"
          className="inline-block px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
        >
          Criar Primeiro Evento
        </Link>
      </div>
    );
  }

  const selectedEvent = myEvents.find((e) => e.id === selectedEventId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header & Event Switcher */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-400" />
              Painel do Organizador
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
              connected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              <Radio className="w-3 h-3 animate-pulse" />
              {connected ? 'Ao Vivo' : 'Desconectado'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Acompanhe vendas e entradas em tempo real</p>
        </div>

        {/* Event Select Dropdown */}
        <div className="w-full sm:w-72">
          <label className="text-[11px] text-slate-400 block mb-1">Selecione o Evento</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
          >
            {myEvents.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={`/organizer/scanner?eventId=${selectedEventId}`}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
        >
          <QrCode className="w-4 h-4" />
          Abrir Leitor QR Code da Portaria
        </Link>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Entradas / Check-ins */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Entradas Realizadas</span>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {liveData?.checkIns?.total || 0}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span>Capacidade Total</span>
            <span className="font-bold text-slate-200">{liveData?.capacity || selectedEvent?.capacity || 0} pessoas</span>
          </div>
        </div>

        {/* Card 2: Taxa de Ocupação */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ocupação da Casa</span>
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-400">
            {liveData?.checkIns?.rate || 0}%
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, liveData?.checkIns?.rate || 0)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Ingressos Vendidos */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ingressos Vendidos</span>
            <Ticket className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {liveData?.tickets?.paid || 0}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span>Total Gerados</span>
            <span className="font-bold text-slate-200">{liveData?.tickets?.total || 0}</span>
          </div>
        </div>

        {/* Card 4: Receita Bruta */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Total</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {formatCurrency(liveData?.financials?.totalRevenue || 0)}
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            Vendas confirmadas
          </div>
        </div>
      </div>

      {/* Live Check-in Stream Feed */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Feed de Entradas na Portaria ao Vivo
          </h3>
          <span className="text-xs text-slate-500">Atualização automática via Socket.IO</span>
        </div>

        {liveData?.recentCheckIns?.length > 0 ? (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
            {liveData.recentCheckIns.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-2xl glass-card border border-slate-800 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-white">{item.holderName || item.ticket?.holderName || 'Participante'}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Código: #{item.ticketCode || item.ticket?.code || '---'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium block">
                    {item.gate || 'Portão Principal'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatTime(item.checkedAt || new Date())}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            Nenhuma entrada registrada no feed recente. As entradas aparecerão aqui em tempo real assim que os ingressos forem validados na portaria.
          </div>
        )}
      </div>
    </div>
  );
};
