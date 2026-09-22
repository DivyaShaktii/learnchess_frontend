// Web Audio API synthesizer and a single, queued coach-audio controller.

class ChessSoundEngine {
  private ctx: AudioContext | null = null;

  private async initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  async playMove() {
    try {
      const ctx = await this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.065);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  async playCapture() {
    try {
      const ctx = await this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(480, now);
      osc1.frequency.exponentialRampToValueAtTime(75, now + 0.09);
      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.09);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(240, now + 0.01);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      gain2.gain.setValueAtTime(0.6, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.01);
      osc2.stop(now + 0.08);
    } catch {}
  }
}

export const chessSounds = new ChessSoundEngine();

let subtitleTimeout: ReturnType<typeof setTimeout> | null = null;
export function clearSubtitleAfter(ms: number) {
  if (subtitleTimeout) clearTimeout(subtitleTimeout);
  subtitleTimeout = setTimeout(() => dispatchSubtitle(''), ms);
}
export function dispatchSubtitle(text: string) {
  if (typeof window === 'undefined') return;
  if (subtitleTimeout) clearTimeout(subtitleTimeout);
  window.dispatchEvent(new CustomEvent('coach-subtitle', { detail: { text } }));
}

type AudioJob = (finish: () => void) => () => void;
const audioQueue: AudioJob[] = [];
let activeCleanup: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;
let selectedVoice: SpeechSynthesisVoice | null = null;
let generation = 0;

const storedVolume = () => {
  if (typeof window === 'undefined') return 0.8;
  const value = Number(window.localStorage.getItem('coach-volume'));
  return Number.isFinite(value) && value >= 0.1 && value <= 1 ? value : 0.8;
};
export const getCoachVolume = () => storedVolume();
export function setCoachVolume(value: number) {
  if (typeof window === 'undefined') return;
  const volume = Math.max(0.1, Math.min(1, value));
  window.localStorage.setItem('coach-volume', String(volume));
  if (currentAudio) currentAudio.volume = volume;
}
function reportAudioError() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('coach-audio-error', {
    detail: { message: 'Coach audio could not play. The feedback is shown as text instead.' },
  }));
}
function runNextJob() {
  if (activeCleanup || audioQueue.length === 0) return;
  const job = audioQueue.shift();
  if (!job) return;
  const jobGeneration = generation;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (jobGeneration !== generation) return;
    activeCleanup = null;
    currentAudio = null;
    runNextJob();
  };
  activeCleanup = job(finish);
}
function enqueueAudio(job: AudioJob) {
  audioQueue.push(job);
  runNextJob();
}
export function stopCoachAudio(clearSubtitle = true) {
  generation += 1;
  audioQueue.length = 0;
  activeCleanup?.();
  activeCleanup = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  if (clearSubtitle) dispatchSubtitle('');
}

async function resolveVoice() {
  if (selectedVoice || typeof window === 'undefined' || !window.speechSynthesis) return selectedVoice;
  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 750);
      window.speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
    voices = window.speechSynthesis.getVoices();
  }
  selectedVoice = voices.find((v) => /en/i.test(v.lang) && /male|man|david|mark|guy|matthew|brian|george|arthur|james/i.test(v.name))
    || voices.find((v) => /en/i.test(v.lang) && /natural|google us english/i.test(v.name))
    || voices.find((v) => /en/i.test(v.lang)) || voices[0] || null;
  return selectedVoice;
}

export function prepareCoachVoice() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) void resolveVoice();
}

export function speakCoachMessage(text: string, onEnd?: () => void, playAudio = true) {
  if (typeof window === 'undefined' || !text) return;
  if (!playAudio) { dispatchSubtitle(text); clearSubtitleAfter(5000); onEnd?.(); return; }
  if (!('speechSynthesis' in window)) { dispatchSubtitle(text); reportAudioError(); clearSubtitleAfter(7000); onEnd?.(); return; }
  enqueueAudio((finish) => {
    dispatchSubtitle(text);
    let cancelled = false;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    void resolveVoice().then((voice) => {
      if (cancelled) return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) utterance.voice = voice;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = storedVolume();
        utterance.onend = () => { if (safetyTimer) clearTimeout(safetyTimer); clearSubtitleAfter(2000); onEnd?.(); finish(); };
        utterance.onerror = (event) => {
          if (safetyTimer) clearTimeout(safetyTimer);
          if (!cancelled && event.error !== 'interrupted' && event.error !== 'canceled') reportAudioError();
          clearSubtitleAfter(7000); onEnd?.(); finish();
        };
        safetyTimer = setTimeout(() => {
          if (!cancelled) { window.speechSynthesis.cancel(); reportAudioError(); clearSubtitleAfter(7000); finish(); }
        }, Math.max(10000, text.length * 180));
        window.speechSynthesis.speak(utterance);
      } catch { reportAudioError(); clearSubtitleAfter(7000); finish(); }
    });
    return () => { cancelled = true; if (safetyTimer) clearTimeout(safetyTimer); window.speechSynthesis.cancel(); };
  });
}

export function playCoachClip(src: string, subtitle: string, playAudio = true) {
  if (typeof window === 'undefined') return;
  if (!playAudio) { dispatchSubtitle(subtitle); clearSubtitleAfter(5000); return; }
  enqueueAudio((finish) => {
    dispatchSubtitle(subtitle);
    const audio = new Audio(src);
    currentAudio = audio;
    audio.preload = 'auto';
    audio.volume = storedVolume();
    let safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      reportAudioError(); clearSubtitleAfter(7000); audio.pause(); finish();
    }, 20000);
    let concluded = false;
    const conclude = (failed: boolean) => {
      if (concluded) return;
      concluded = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = null;
      if (failed) reportAudioError();
      clearSubtitleAfter(failed ? 7000 : 2000);
      finish();
    };
    audio.onended = () => conclude(false);
    audio.onerror = () => conclude(true);
    audio.play().catch(() => conclude(true));
    return () => { if (safetyTimer) clearTimeout(safetyTimer); audio.pause(); audio.currentTime = 0; };
  });
}

const preloadedAudio = new Map<string, HTMLAudioElement>();
export function preloadCoachAudio(sources: string[]) {
  if (typeof window === 'undefined') return;
  for (const src of new Set(sources)) {
    if (preloadedAudio.has(src)) continue;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    audio.load();
    preloadedAudio.set(src, audio);
  }
}
