// Web Audio API synthesizer and a single, queued coach-audio controller.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
let generation = 0;

const KOKORO_PRELOAD_MESSAGES = [
  'That is a slight inaccuracy.',
  'Hold on, that is a mistake. Take a moment to find a better move.',
  'That is a blunder.',
  'That is a serious blunder.',
  'Hold it, genius. That move deserves another look.',
  'Watch out! Here is their plan.',
];
const kokoroAudioCache = new Map<string, Blob>();
const kokoroRequests = new Map<string, Promise<Blob>>();

function loadKokoroAudio(text: string): Promise<Blob> {
  const cached = kokoroAudioCache.get(text);
  if (cached) return Promise.resolve(cached);
  const pending = kokoroRequests.get(text);
  if (pending) return pending;

  const request = fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: 'af_bella', speed: 1 }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`TTS returned ${response.status}`);
    const blob = await response.blob();
    kokoroAudioCache.set(text, blob);
    return blob;
  }).finally(() => kokoroRequests.delete(text));
  kokoroRequests.set(text, request);
  return request;
}

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

export function prepareCoachVoice() {
  if (typeof window === 'undefined') return;
  for (const message of KOKORO_PRELOAD_MESSAGES) {
    void loadKokoroAudio(message).catch(() => { /* A later playback can retry. */ });
  }
}

export function speakCoachMessage(text: string, onEnd?: () => void, playAudio = true, priority = false) {
  if (typeof window === 'undefined' || !text) return;
  if (!playAudio) { dispatchSubtitle(text); clearSubtitleAfter(5000); onEnd?.(); return; }
  if (priority) stopCoachAudio(false);
  enqueueAudio((finish) => {
    dispatchSubtitle(text);
    let cancelled = false;
    let concluded = false;
    let objectUrl: string | null = null;
    let generatedAudio: HTMLAudioElement | null = null;
    let requestTimer: ReturnType<typeof setTimeout> | null = null;

    const releaseGeneratedAudio = () => {
      if (generatedAudio) {
        generatedAudio.onended = null;
        generatedAudio.onerror = null;
        generatedAudio.pause();
        generatedAudio.removeAttribute('src');
        generatedAudio.load();
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      generatedAudio = null;
      objectUrl = null;
      currentAudio = null;
    };
    const conclude = (failed: boolean) => {
      if (concluded || cancelled) return;
      concluded = true;
      if (requestTimer) clearTimeout(requestTimer);
      releaseGeneratedAudio();
      if (failed) reportAudioError();
      clearSubtitleAfter(failed ? 7000 : 2000);
      onEnd?.();
      finish();
    };

    requestTimer = setTimeout(() => conclude(true), 12000);
    void loadKokoroAudio(text).then((blob) => {
      if (cancelled || concluded) return;
      objectUrl = URL.createObjectURL(blob);
      generatedAudio = new Audio(objectUrl);
      currentAudio = generatedAudio;
      generatedAudio.preload = 'auto';
      generatedAudio.volume = storedVolume();
      generatedAudio.onended = () => conclude(false);
      generatedAudio.onerror = () => conclude(true);
      return generatedAudio.play().catch(() => conclude(true));
    }).catch(() => {
      if (!cancelled && !concluded) conclude(true);
    });

    return () => {
      cancelled = true;
      if (requestTimer) clearTimeout(requestTimer);
      releaseGeneratedAudio();
    };
  });
}

export function playCoachClip(_src: string, subtitle: string, playAudio = true) {
  // Keep the legacy API, but route it through the same Kokoro service as all
  // other coach speech so normal/professional modes cannot bypass Kokoro.
  speakCoachMessage(subtitle, undefined, playAudio);
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
