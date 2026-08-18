import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Ticket, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { eventsApi } from '../api/events';
import { ticketsApi } from '../api/tickets';

export const CreateEvent = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState(500);
  const [imageUrl, setImageUrl] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  // Lotes de ingressos
  const [ticketTypes, setTicketTypes] = useState([
    { name: 'Pista Lote 1', price: '50.00', quantity: 300, maxPerUser: 5 },
    { name: 'VIP Lote 1', price: '120.00', quantity: 100, maxPerUser: 4 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      { name: `Novo Lote ${ticketTypes.length + 1}`, price: '100.00', quantity: 50, maxPerUser: 5 },
    ]);
  };

  const handleRemoveTicketType = (index) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const handleTicketTypeChange = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index][field] = value;
    setTicketTypes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !date || !venue || !city) {
      setError('Por favor, preencha todos os campos obrigatórios do evento.');
      return;
    }

    if (ticketTypes.length === 0) {
      setError('Adicione ao menos um tipo de ingresso.');
      return;
    }

    setSubmitting(true);

    try {
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      // Imagem padrão genérica caso o usuário deixe o campo vazio
      const defaultImage = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80';

      const eventPayload = {
        title,
        slug,
        description,
        venue,
        address: address || venue,
        city,
        state,
        date: new Date(date).toISOString(),
        capacity: parseInt(capacity),
        // Se imageUrl estiver vazio, usa a imagem padrão
        imageUrl: imageUrl || defaultImage,
        isOnline,
        status: 'PUBLISHED',
      };

      // 1. Criar o evento
      const eventRes = await eventsApi.create(eventPayload);

      if (eventRes.success && eventRes.data) {
        const eventId = eventRes.data.id;

        // 2. Criar os lotes de ingresso via loop
        for (const type of ticketTypes) {
          await ticketsApi.createTicketType(eventId, {
            name: type.name,
            price: parseFloat(type.price),
            quantity: parseInt(type.quantity),
            maxPerUser: parseInt(type.maxPerUser || 5),
          });
        }

        // 3. Garantir publicação
        try {
          await eventsApi.publish(eventId);
        } catch (e) {
          console.error("Erro na publicação:", e);
        }

        // 4. Ir para a tela inicial
        navigate('/', { state: { eventCreated: true, title } });
      } else {
        setError(eventRes.message || 'Erro ao cadastrar evento.');
      }
    } catch (err) {
      console.error(err);
      const msgErro = err.message || 'Erro ao conectar ao servidor.';
      setError(msgErro);
      
      // Alerta na tela para substituir o erro silencioso no console
      alert(`Não foi possível cadastrar o evento.\n\nVerifique se você preencheu tudo corretamente de acordo com as regras (ex: Descrição com no mínimo 10 letras).\n\nDetalhe do erro: ${msgErro}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Criar Novo Evento</h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre os detalhes do evento e configure as opções de ingressos com QR Code
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 border-b border-slate-800 pb-2">
              1. Detalhes Gerais
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Título do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Festival de Verão 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Descrição Completa</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes, programação, atrações..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Capacidade Total *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Local / Casa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Arena Anhembi"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Cidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">URL da Banner Image (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Tipos de Ingressos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-indigo-400">
                2. Configuração dos Lotes de Ingressos
              </h3>
              <button
                type="button"
                onClick={handleAddTicketType}
                className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Lote
              </button>
            </div>

            <div className="space-y-3">
              {ticketTypes.map((type, idx) => (
                <div key={idx} className="p-4 rounded-2xl glass-card border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Lote #{idx + 1}</span>
                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTicketType(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1 text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Nome do Lote</label>
                      <input
                        type="text"
                        required
                        value={type.name}
                        onChange={(e) => handleTicketTypeChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={type.price}
                        onChange={(e) => handleTicketTypeChange(idx, 'price', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Quantidade Disponível</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={type.quantity}
                        onChange={(e) => handleTicketTypeChange(idx, 'quantity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {submitting ? 'Publicando Evento...' : 'Publicar Evento'}
          </button>
        </form>
      </div>
    </div>
  );
};
