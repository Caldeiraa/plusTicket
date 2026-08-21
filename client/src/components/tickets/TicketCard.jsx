import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Calendar, MapPin, AlertCircle, Send, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { formatDate, formatTime, formatCurrency, getStatusBadgeClass, translateStatus } from '../../utils/formatters';
import { ticketsApi } from '../../api/tickets';
import { Modal } from '../common/Modal';

/**
 * Calcula a porcentagem de reembolso com base na data de compra do ingresso.
 * Até 7 dias → 100% | Após 7 dias → 50%
 */
const calculateRefundInfo = (createdAt, price) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const percent = diffDays <= 7 ? 100 : 50;
  const originalAmount = typeof price === 'string' ? parseFloat(price) : Number(price);
  const refundAmount = (originalAmount * percent) / 100;
  return { diffDays, percent, originalAmount, refundAmount };
};

export const TicketCard = ({ ticket, onRefresh }) => {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!ticket) return null;

  const event = ticket.event;
  const isUsed = ticket.status === 'USED';
  const isPaid = ticket.status === 'PAID';
  const isRefunded = ticket.status === 'REFUNDED';
  const transferCount = ticket.transferCount || 0;
  const pendingTransfer = Array.isArray(ticket?.transfers) && ticket.transfers.length > 0 ? ticket.transfers[0] : null;

  // Verificar se falta menos de 2h para o evento
  const hoursUntilEvent = event?.date ? (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60) : 999;
  const canTransfer = isPaid && !isUsed && transferCount < 2 && hoursUntilEvent >= 2 && !pendingTransfer;

  // Verificar se pode solicitar devolução
  const canRefund = isPaid && !isUsed && !pendingTransfer && !ticket.refund;

  // Info de reembolso (para exibir no modal)
  const refundInfo = ticket.ticketType?.price && ticket.createdAt
    ? calculateRefundInfo(ticket.createdAt, ticket.ticketType.price)
    : null;

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

  const handleRequestRefund = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await ticketsApi.requestRefund(ticket.id, refundReason.trim() || undefined);
      if (res.success) {
        const data = res.data;
        setSuccessMsg(
          `✅ Reembolso de ${data.refundPercent}% processado! ` +
          `Valor: ${formatCurrency(data.refundAmount)}`
        );
        setRefundReason('');
        setTimeout(() => {
          setRefundModalOpen(false);
          setSuccessMsg('');
          if (onRefresh) onRefresh();
        }, 3000);
      } else {
        setError(res.message || 'Erro ao solicitar reembolso.');
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

          {/* Badge se ingresso foi reembolsado */}
          {isRefunded && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span>Este ingresso foi devolvido e o reembolso foi processado.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 flex-wrap">
          {!isRefunded && (
            <button
              onClick={() => setQrModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4" />
              Exibir QR Code
            </button>
          )}

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

          {canRefund && (
            <button
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setRefundReason('');
                setRefundModalOpen(true);
              }}
              className="px-3 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Solicitar devolução"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Devolver</span>
            </button>
          )}

          {!isRefunded && (
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
          )}
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

      {/* Modal de Devolução / Reembolso */}
      <Modal isOpen={refundModalOpen} onClose={() => setRefundModalOpen(false)} title="Solicitar Devolução do Ingresso">
        <form onSubmit={handleRequestRefund} className="space-y-4 py-2">
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

          {/* Resumo do Ingresso */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 text-slate-300">
            <p className="font-bold text-white mb-1">Detalhes do Ingresso:</p>
            <p>🎫 <strong>Evento:</strong> {event?.title}</p>
            <p>🏷️ <strong>Tipo:</strong> {ticket.ticketType?.name}</p>
            <p>💰 <strong>Valor pago:</strong> {formatCurrency(ticket.ticketType?.price)}</p>
          </div>

          {/* Cálculo do Reembolso */}
          {refundInfo && (
            <div className={`p-4 rounded-2xl border text-sm ${
              refundInfo.percent === 100
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${
                  refundInfo.percent === 100 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {refundInfo.percent === 100 ? '✅ Reembolso Integral' : '⚠️ Reembolso Parcial'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold ${
                  refundInfo.percent === 100
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {refundInfo.percent}%
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-slate-400">
                  Comprado há <strong className="text-slate-200">{refundInfo.diffDays} dia{refundInfo.diffDays !== 1 ? 's' : ''}</strong>
                  {refundInfo.percent === 100
                    ? ' — dentro do prazo de 7 dias para reembolso integral.'
                    : ' — prazo de 7 dias expirado. Reembolso de 50% do valor.'}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 mt-2">
                  <span className="text-slate-400">Valor a ser reembolsado:</span>
                  <span className={`text-lg font-extrabold ${
                    refundInfo.percent === 100 ? 'text-emerald-300' : 'text-amber-300'
                  }`}>
                    {formatCurrency(refundInfo.refundAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Política de Reembolso */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 text-slate-300">
            <p className="font-bold text-white mb-1">Política de Devolução:</p>
            <p>• 💚 <strong>Até 7 dias</strong> após a compra → reembolso de <strong>100%</strong> do valor.</p>
            <p>• 🟡 <strong>Após 7 dias</strong> → reembolso de <strong>50%</strong> do valor.</p>
            <p>• ❌ Ingressos já utilizados (check-in) <strong>não podem</strong> ser devolvidos.</p>
            <p>• ⚠️ Esta ação é <strong>irreversível</strong>.</p>
          </div>

          {/* Campo Motivo (opcional) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Motivo da devolução <span className="text-slate-500">(opcional)</span>
            </label>
            <textarea
              placeholder="Ex: Não poderei comparecer ao evento..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRefundModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {submitting ? 'Processando...' : 'Confirmar Devolução'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
