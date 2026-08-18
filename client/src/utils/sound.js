// Web Audio API sintetizado para respostas sonoras instantâneas na portaria
class SoundManager {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  playSuccess() {
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // Note A5 (Bip agudo)
      osc.frequency.exponentialRampToValueAtTime(1320, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);

      // Vibração no celular se suportado
      if (navigator.vibrate) {
        navigator.vibrate([100]);
      }
    } catch (e) {
      console.warn('Erro ao reproduzir áudio:', e);
    }
  }

  playError() {
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.audioCtx.currentTime); // Bip grave de erro
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);

      // Vibração dupla no celular
      if (navigator.vibrate) {
        navigator.vibrate([150, 100, 150]);
      }
    } catch (e) {
      console.warn('Erro ao reproduzir áudio:', e);
    }
  }
}

export const soundManager = new SoundManager();
