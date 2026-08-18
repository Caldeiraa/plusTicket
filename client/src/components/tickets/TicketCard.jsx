import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Calendar, MapPin, AlertCircle, Send, CheckCircle2, Clock } from 'lucide-react';
import { formatDate, formatTime, getStatusBadgeClass, translateStatus } from '../../utils/formatters';
import { ticketsApi } from '../../api/tickets';
import { Modal } from '../common/Modal';

export const TicketCard = ({ ticket, onRefresh }) => {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!ticket) return null;

  const event = ticket.event;
  const isUsed = ticket.status === 'USED';
  const isPaid = ticket.status === 'PAID';
  const transferCount = ticket.transferCount || 0;
  const pendingTransfer = Array.isArray(ticket?.transfers) && ticket.transfers.length > 0 ? ticket.transfers[0] : null;

  // Verificar se falta menos de 2h para o evento
  const hoursUntilEvent = event?.date ? (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60) : 999;
  const canTransfer = isPaid && !isUsed && transferCount < 2 && hoursUntilEvent >= 2 && !pendingTransfer;

  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!targetEmail.trim()) {
      setError('Por favor, informe o e-mail do destinatário.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ticketsApi.initiateTransfer(ticket.id, targetEmail.trim());
      if (res.success) {
        setSuccessMsg('Transferência enviada! O destinatário tem 30 minutos para confirmar.');
        setTargetEmail('');
        setTimeout(() => {
          setTransferModalOpen(false);
          setSuccessMsg('');
          if (onRefresh) onRefresh();
        }, 2000);
      } else {
        setError(res.message || 'Erro ao iniciar transferência.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="glass-card rounded-3xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Ticket Header & Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeClass(ticket.status)}`}>
              {translateStatus(ticket.status)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              #{ticket.code}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-semibold">
              {ticket.ticketType?.name || 'Ingresso'}
            </span>
            {transferCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                {transferCount}/2 Transferências
              </span>
            )}
          </div>

          <h3 className="text-lg font-extrabold text-white tracking-tight">
            {event?.title || 'Evento'}
          </h3>

          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              {formatDate(event?.date)} às {formatTime(event?.date)}
            </span>
            {event?.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                {event.venue} ({event.city})
              </span>
            )}
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Titular: <strong className="text-slate-300 font-medium">{ticket.holderName}</strong></span>
          </div>

          {/* Aviso se houver transferência pendente enviada */}
          {pendingTransfer && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0 animate-spin" />
              <span>Aguardando confirmação de <strong>{pendingTransfer.receiver?.email}</strong> (Expira em 30m).</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 flex-wrap">
          <button
            onClick={() => setQrModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <QrCode className="w-4 h-4" />
            Exibir QR Code
          </button>

          {canTransfer && (
            <button
              onClick={() => setTransferModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Transferir para outro e-mail"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Transferir</span>
            </button>
          )}

          <a
            href={ticketsApi.getDownloadPdfUrl(ticket.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            title="Baixar PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </a>
        </div>

      </div>

      {/* QR Code Modal */}
      <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Ingresso Digital">
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-indigo-500/30 relative flex items-center justify-center min-w-[240px] min-h-[240px]">
            {ticket.qrCode && ticket.qrCode.startsWith('data:image') ? (
              <img
                src={ticket.qrCode}
                alt={`QR Code ${ticket.code}`}
                className="w-52 h-52 object-contain"
              />
            ) : (
              <QRCodeSVG
                value={ticket.code || 'TICKET'}
                size={220}
                level="H"
                includeMargin={true}
              />
            )}
            {isUsed && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-rose-400 p-2">
                <AlertCircle className="w-12 h-12 mb-1" />
                <span className="font-extrabold text-sm uppercase">Já Utilizado</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="font-mono text-sm font-bold tracking-wider text-indigo-400">
              {ticket.code}
            </p>
            <p className="text-xs text-slate-400">
              Apresente este código na portaria do evento para validação instantânea.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
            <p><strong>Evento:</strong> {event?.title}</p>
            <p><strong>Tipo:</strong> {ticket.ticketType?.name}</p>
            <p><strong>Titular:</strong> {ticket.holderName} ({ticket.holderEmail})</p>
          </div>
        </div>
      </Modal>

      {/* Modal de Transferência */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transferir Ingresso por E-mail">
        <form onSubmit={handleInitiateTransfer} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 text-slate-300">
            <p className="font-bold text-white mb-1">Regras de Transferência Anti-Golpe:</p>
            <p>• ✉️ <strong>Apenas contas cadastradas:</strong> O e-mail de destino deve ter conta no site.</p>
            <p>• ⏳ <strong>Prazo de 30 minutos:</strong> O destinatário tem 30 min para aceitar. Se expirar, o ingresso é estornado para você.</p>
            <p>• 🔄 <strong>Limite:</strong> Máximo de 2 transferências por ingresso ({transferCount}/2 realizadas).</p>
            <p>• ⏰ <strong>Permitido até 2 horas</strong> antes do início do evento.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              E-mail do Destinatário no plusTicket
            </label>
            <input
              type="email"
              required
              placeholder="amigo@email.com"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Enviando...' : 'Enviar Transferência'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
