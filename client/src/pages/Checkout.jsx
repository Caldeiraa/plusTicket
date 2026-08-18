import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Ticket, ArrowLeft, CheckCircle2, User, Mail, FileText, AlertCircle } from 'lucide-react';
import { ticketsApi } from '../api/tickets';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const checkoutState = location.state;
  const event = checkoutState?.event;
  const items = checkoutState?.items || [];
  const totalPrice = checkoutState?.totalPrice || 0;

  const [holderName, setHolderName] = useState(user?.name || '');
  const [holderEmail, setHolderEmail] = useState(user?.email || '');
  const [holderDoc, setHolderDoc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!event || items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Nenhum ingresso selecionado</h2>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
        >
          Ver Eventos
        </button>
      </div>
    );
  }

  const handleFinishPurchase = async (e) => {
    e.preventDefault();
    setError('');

    if (!holderName || !holderEmail) {
      setError('Por favor, preencha os dados do titular do ingresso.');
      return;
    }

    setSubmitting(true);

    try {
      // Montagem higienizada do Payload
      const payload = {
        eventId: event.id,
        items: items.map((item) => ({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
        })),
        holderName,
        holderEmail,
        paymentMethod,
      };

      // Injeta o documento apenas se ele não estiver vazio (Evita crash no Zod)
      if (holderDoc && holderDoc.trim() !== '') {
        payload.holderDoc = holderDoc;
      }

      const res = await ticketsApi.purchase(payload);
      
      // Redireciona com sucesso para a tela Meus Ingressos
      navigate('/my-tickets', {
        state: { 
          purchased: true, 
          eventTitle: event.title, 
          holderName, 
          holderEmail, 
          orderNumber: res.data?.order?.orderNumber 
        },
      });
    } catch (err) {
      const msgErro = err.message || 'Erro ao processar.';
      setError(msgErro);
      alert(`Falha no Checkout:\n\n${msgErro}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Evento
      </button>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Checkout de Ingressos</h1>
            <p className="text-xs text-slate-400 mt-1">{event.title}</p>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumo do Pedido */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumo da Compra</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.ticketTypeId} className="flex justify-between items-center text-sm">
                <span className="text-slate-200">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-semibold text-white">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal dos Ingressos</span>
              <span className="text-slate-200 font-medium">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-indigo-400">
              <span>Taxa de Serviço da Plataforma (10%)</span>
              <span className="font-medium">{formatCurrency(totalPrice * 0.10)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-extrabold text-indigo-400">
            <span>Total Final</span>
            <span>{formatCurrency(totalPrice * 1.10)}</span>
          </div>
        </div>

        {/* Form Titular & Pagamento */}
        <form onSubmit={handleFinishPurchase} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Dados do Titular
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">E-mail para Receber PDF</label>
                <input
                  type="email"
                  required
                  value={holderEmail}
                  onChange={(e) => setHolderEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">CPF / Documento (Opcional)</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={holderDoc}
                  onChange={(e) => setHolderDoc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Forma de Pagamento
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Cartão de Crédito
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('PIX')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'PIX'
                    ? 'border-emerald-500 bg-emerald-600/20 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                PIX Instantâneo
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? 'Gerando Ingressos e QR Code...' : `Confirmar Pagamento (${formatCurrency(totalPrice * 1.10)})`}
          </button>
        </form>
      </div>
    </div>
  );
};
