import { STATIC_KOKORO_AUDIO } from '../data/kokoroAudioManifest';

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
let coachAudioContext: AudioContext | null = null;
let currentCoachSource: AudioBufferSourceNode | null = null;
let currentCoachGain: GainNode | null = null;
let unlockListenersInstalled = false;
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

export function getStaticCoachAudioPath(text: string): string | null {
  return STATIC_KOKORO_AUDIO[text] || null;
}

function loadKokoroAudio(text: string): Promise<Blob> {
  const cached = kokoroAudioCache.get(text);
  if (cached) return Promise.resolve(cached);
  const pending = kokoroRequests.get(text);
  if (pending) return pending;

  const staticSource = getStaticCoachAudioPath(text);
  const request = fetch(staticSource || `${API_BASE}/api/tts`, staticSource ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
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

function getCoachAudioContext(): AudioContext | null {
  if (coachAudioContext || typeof window === 'undefined') return coachAudioContext;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  coachAudioContext = AudioCtx ? new AudioCtx() : null;
  return coachAudioContext;
}

function installCoachAudioUnlock() {
  if (unlockListenersInstalled || typeof window === 'undefined') return;
  unlockListenersInstalled = true;
  const unlock = () => {
    const context = getCoachAudioContext();
    if (!context || context.state === 'running') {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      return;
    }
    void context.resume().then(() => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }).catch(() => { /* Keep listeners so the next gesture can retry. */ });
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
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
  if (currentCoachGain && coachAudioContext) {
    currentCoachGain.gain.setValueAtTime(volume, coachAudioContext.currentTime);
  }
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
    currentCoachSource = null;
    currentCoachGain = null;
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
  if (currentCoachSource) {
    currentCoachSource.onended = null;
    try { currentCoachSource.stop(); } catch {}
    currentCoachSource.disconnect();
  }
  currentCoachSource = null;
  currentCoachGain?.disconnect();
  currentCoachGain = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  if (clearSubtitle) dispatchSubtitle('');
}

export function prepareCoachVoice() {
  if (typeof window === 'undefined') return;
  installCoachAudioUnlock();
  getCoachAudioContext();
  for (const message of KOKORO_PRELOAD_MESSAGES) {
    void loadKokoroAudio(message).catch(() => { /* A later playback can retry. */ });
  }
  for (const message of Object.keys(STATIC_KOKORO_AUDIO)) {
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
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let requestTimer: ReturnType<typeof setTimeout> | null = null;

    const releaseGeneratedAudio = () => {
      if (source) {
        source.onended = null;
        try { source.stop(); } catch {}
        source.disconnect();
      }
      gain?.disconnect();
      source = null;
      gain = null;
      currentCoachSource = null;
      currentCoachGain = null;
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
    void loadKokoroAudio(text).then(async (blob) => {
      if (cancelled || concluded) return;
      const context = getCoachAudioContext();
      if (!context) throw new Error('Web Audio is unavailable');
      if (context.state === 'suspended') await context.resume();
      if (cancelled || concluded || context.state !== 'running') {
        throw new Error('Coach audio is locked');
      }
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      if (cancelled || concluded) return;
      source = context.createBufferSource();
      gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = storedVolume();
      source.connect(gain);
      gain.connect(context.destination);
      currentCoachSource = source;
      currentCoachGain = gain;
      source.onended = () => conclude(false);
      source.start();
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
