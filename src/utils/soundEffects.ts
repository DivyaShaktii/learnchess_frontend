// Web Audio API Synthesizer & Speech Voice Controller for Smart Chess

class ChessSoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  // Classic wooden piece movement sound
  playMove() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.065);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // AudioContext fallback
    }
  }

  // Classic wooden piece capture sound
  playCapture() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Primary wood knock
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(480, now);
      osc1.frequency.exponentialRampToValueAtTime(75, now + 0.09);

      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.09);

      // Secondary wood slap
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(240, now + 0.01);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.08);

      gain2.gain.setValueAtTime(0.6, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now + 0.01);
      osc2.stop(now + 0.08);
    } catch {
      // AudioContext fallback
    }
  }
}

export const chessSounds = new ChessSoundEngine();

let subtitleTimeout: NodeJS.Timeout | null = null;

export function clearSubtitleAfter(ms: number) {
  if (subtitleTimeout) clearTimeout(subtitleTimeout);
  subtitleTimeout = setTimeout(() => {
    dispatchSubtitle('');
  }, ms);
}

export function dispatchSubtitle(text: string) {
  if (typeof window !== 'undefined') {
    if (subtitleTimeout) clearTimeout(subtitleTimeout);
    const event = new CustomEvent('coach-subtitle', { detail: { text } });
    window.dispatchEvent(event);
  }
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

// Web Speech API Voice Controller for Coach Feedback
export function speakCoachMessage(text: string, onEnd?: () => void, playAudio: boolean = true) {
  if (typeof window === 'undefined' || !text) {
    return;
  }
  dispatchSubtitle(text);

  if (!playAudio || !('speechSynthesis' in window)) {
    clearSubtitleAfter(5000);
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance; // Keep a reference to prevent garbage collection
    const voices = window.speechSynthesis.getVoices();

    // Prioritize explicitly male-sounding or male-named voices installed on the OS
    const preferredVoice =
      voices.find((v) => /en/i.test(v.lang) && /male|man|david|mark|guy|matthew|brian|george|arthur|james/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang) && /natural|google us english/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang)) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      clearSubtitleAfter(2000);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    // SpeechSynthesis fallback
  }
}
