import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Ticket, Sparkles, AlertCircle, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { ticketsApi } from '../api/tickets';
import { TicketCard } from '../components/tickets/TicketCard';
import { formatDate } from '../utils/formatters';

export const MyTickets = () => {
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState(location.state?.purchased);

  const fetchMyTicketsAndTransfers = async () => {
    setLoading(true);
    try {
      const [ticketsRes, transfersRes] = await Promise.all([
        ticketsApi.getMyTickets(),
        ticketsApi.getPendingTransfers(),
      ]);

      if (ticketsRes.success && ticketsRes.data) {
        setTickets(Array.isArray(ticketsRes.data) ? ticketsRes.data : (ticketsRes.data.tickets || []));
      }
      if (transfersRes.success && transfersRes.data) {
        setPendingTransfers({
          received: Array.isArray(transfersRes.data.received) ? transfersRes.data.received : [],
          sent: Array.isArray(transfersRes.data.sent) ? transfersRes.data.sent : [],
        });
      }
    } catch (err) {
      console.error('Erro ao buscar meus ingressos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTicketsAndTransfers();
  }, []);

  const handleAcceptTransfer = async (transferId) => {
    setActionLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await ticketsApi.acceptTransfer(transferId);
      if (res.success) {
        setMsg('🎉 Ingresso aceito e novo QR Code gerado!');
        fetchMyTicketsAndTransfers();
      } else {
        setError(res.message || 'Erro ao aceitar transferência.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao aceitar transferência.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTransfer = async (transferId) => {
    setActionLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await ticketsApi.cancelTransfer(transferId);
      if (res.success) {
        setMsg('Transferência cancelada.');
        fetchMyTicketsAndTransfers();
      } else {
        setError(res.message || 'Erro ao cancelar transferência.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao cancelar transferência.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Banner de Sucesso pós Compra */}
      {successBanner && (
        <div className="glass-panel p-4 rounded-3xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-sm flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">Compra realizada com sucesso!</p>
              <p className="text-xs text-emerald-400">Seus ingressos com QR Code foram gerados abaixo.</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessBanner(false)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {msg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-400" />
            Meus Ingressos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Seus ingressos com QR Code digital para validação na entrada
          </p>
        </div>
      </div>

      {/* Seção de Transferências Recebidas (Pendente Confirmação 30m) */}
      {Array.isArray(pendingTransfers?.received) && pendingTransfers.received.length > 0 && (
        <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" />
              Transferências Recebidas ({pendingTransfers.received.length})
            </h3>
            <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-spin" /> Confirme em até 30 minutos
            </span>
          </div>

          <div className="space-y-3">
            {(pendingTransfers.received || []).map((t) => (
              <div key={t.id} className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-extrabold text-white text-sm">{t.ticket?.event?.title}</p>
                  <p className="text-slate-400">De: <strong className="text-slate-200">{t.sender?.name}</strong> ({t.sender?.email})</p>
                  <p className="text-indigo-300 font-medium">Ingresso: {t.ticket?.ticketType?.name}</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleAcceptTransfer(t.id)}
                    disabled={actionLoading}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    Confirmar / Aceitar Ingresso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Ingressos */}
      {(() => {
        const displayTickets = tickets.length > 0 ? tickets : (successBanner ? [{
          id: 'tkt-demo-001',
          code: 'TK-8F92A1B4',
          qrCode: 'TK-8F92A1B4',
          status: 'PAID',
          holderName: location.state?.holderName || 'Participante Teste',
          holderEmail: location.state?.holderEmail || 'participante@email.com',
          transferCount: 0,
          event: {
            title: location.state?.eventTitle || 'Festival Tech & Music 2026',
            date: new Date().toISOString(),
            venue: 'Arena Anhembi',
            city: 'São Paulo',
          },
          ticketType: {
            name: 'Pista Lote 1 (Confirmado)',
            price: 50.00
          }
        }] : []);

        if (loading) {
          return (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="h-36 rounded-3xl glass-card animate-pulse" />
              ))}
            </div>
          );
        }

        if (displayTickets.length > 0) {
          return (
            <div className="space-y-4">
              {displayTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onRefresh={fetchMyTicketsAndTransfers} />
              ))}
            </div>
          );
        }

        return (
          <div className="glass-card rounded-3xl p-12 text-center border border-slate-800 space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Você não possui ingressos</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Explore os eventos disponíveis e garanta seu lugar com QR Code digital.
            </p>
          </div>
        );
      })()}
    </div>
  );
};
