import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, CheckCircle2, XCircle, ArrowLeft, Volume2, ShieldCheck, MapPin, Camera } from 'lucide-react';
import { checkInApi } from '../api/checkin';
import { eventsApi } from '../api/events';
import { soundManager } from '../utils/sound';
import { Modal } from '../components/common/Modal';

export const CheckInScanner = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [myEvents, setMyEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('eventId') || '');
  const [gate, setGate] = useState('Portão Principal');
  const [manualCode, setManualCode] = useState('');
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { success: boolean, message: string, data: object }
  const [checkInHistory, setCheckInHistory] = useState([]);

  // Carregar eventos do organizador
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventsApi.getMyEvents();
        const list = Array.isArray(res.data) ? res.data : (res.data?.events || []);
        if (res.success && list.length > 0) {
          setMyEvents(list);
          if (!selectedEventId) {
            setSelectedEventId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar eventos:', err);
      }
    };
    fetchEvents();
  }, []);

  // Inicializar o HTML5 QR Code Scanner
  useEffect(() => {
    if (!selectedEventId) return;

    let scanner = null;
    const scannerElementId = 'qr-reader';

    try {
      scanner = new Html5QrcodeScanner(
        scannerElementId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          handleScannedCode(decodedText);
        },
        (errorMessage) => {
          // Ignorar erros normais de busca de frames sem QR
        }
      );
    } catch (err) {
      console.warn('Erro ao inicializar leitor de câmera:', err);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((error) => console.error('Erro ao limpar leitor:', error));
      }
    };
  }, [selectedEventId, gate]);

  const handleScannedCode = async (codeToProcess) => {
    if (processing || !codeToProcess) return;
    setProcessing(true);

    let lat = null;
    let lng = null;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        },
        () => {},
        { timeout: 2000 }
      );
    }

    try {
      const payload = {
        code: codeToProcess.trim(),
        eventId: selectedEventId,
        gate: gate || 'Portão Principal',
        latitude: lat || undefined,
        longitude: lng || undefined,
      };

      const res = await checkInApi.checkIn(payload);

      if (res.success) {
        soundManager.playSuccess();
        const successObj = {
          success: true,
          message: 'CHECK-IN CONFIRMADO!',
          data: res.data,
          time: new Date().toLocaleTimeString('pt-BR'),
        };
        setLastResult(successObj);
        setCheckInHistory((prev) => [successObj, ...prev]);
      } else {
        soundManager.playError();
        setLastResult({
          success: false,
          message: res.message || 'INGRESSO INVÁLIDO OU JÁ UTILIZADO',
          time: new Date().toLocaleTimeString('pt-BR'),
        });
      }
    } catch (err) {
      soundManager.playError();
      setLastResult({
        success: false,
        message: err.message || 'CÓDIGO NÃO ENCONTRADO',
        time: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      setProcessing(false);
      setManualModalOpen(false);
      setManualCode('');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => soundManager.playSuccess()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300"
            title="Testar Som de Confirmação"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Gate Control Panel */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black text-white flex items-center justify-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-400" />
            Portaria & Leitor QR Code
          </h1>
          <p className="text-xs text-slate-400">Validador de ingressos para celular/tablet</p>
        </div>

        {/* Config: Event & Gate selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Evento Ativo</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            >
              {myEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Identificação do Portão</label>
            <input
              type="text"
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              placeholder="Ex: Portão A VIP"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* RESULT BANNER OVERLAY (SUCCESS GREEN / ERROR RED) */}
      {lastResult && (
        <div
          className={`rounded-3xl p-6 text-center space-y-3 border-2 shadow-2xl transition-all animate-in zoom-in-95 ${
            lastResult.success
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500 text-rose-300'
          }`}
        >
          {lastResult.success ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                {lastResult.message}
              </h2>
              <div className="text-xs space-y-1 bg-emerald-900/40 p-3 rounded-2xl border border-emerald-500/30 max-w-sm mx-auto text-emerald-200">
                <p><strong>Titular:</strong> {lastResult.data?.ticket?.holderName || 'Participante'}</p>
                <p><strong>Tipo:</strong> {lastResult.data?.ticket?.ticketType?.name || 'Ingresso'}</p>
                <p className="font-mono"><strong>Código:</strong> #{lastResult.data?.ticket?.code}</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-rose-400 mx-auto" />
              <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                {lastResult.message}
              </h2>
              <p className="text-xs text-rose-300">
                Atenção: Este ingresso não pode ser liberado na portaria.
              </p>
            </>
          )}

          <button
            onClick={() => setLastResult(null)}
            className="px-6 py-2 rounded-xl bg-slate-950/80 text-white font-bold text-xs hover:bg-slate-900 transition-colors"
          >
            Próximo Escaneamento
          </button>
        </div>
      )}

      {/* QR Code Scanner Box */}
      <div className="glass-panel rounded-3xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" />
            Câmera do Dispositivo
          </span>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            Digitar Código
          </button>
        </div>

        {/* Div onde o html5-qrcode injeta a câmera */}
        <div
          id="qr-reader"
          className="overflow-hidden rounded-2xl border-2 border-slate-700/80 bg-slate-950 min-h-[280px]"
        />
      </div>

      {/* Manual Input Modal */}
      <Modal isOpen={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Digitação Manual de Código">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Digite o código do ingresso (ex: 8 caracteres) para realizar a validação:
          </p>
          <input
            type="text"
            autoFocus
            placeholder="EX: TCK-894A"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center tracking-widest text-indigo-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleScannedCode(manualCode)}
            disabled={!manualCode || processing}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all disabled:opacity-50"
          >
            {processing ? 'Validando...' : 'Validar Ingresso'}
          </button>
        </div>
      </Modal>

      {/* Recent Scan History */}
      {checkInHistory.length > 0 && (
        <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Histórico desta Sessão ({checkInHistory.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {checkInHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white">
                    {item.data?.ticket?.holderName || 'Participante'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
