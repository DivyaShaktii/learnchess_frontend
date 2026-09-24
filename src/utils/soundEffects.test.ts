import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLASSIFICATION_PROMPTS, classificationClipFor, coachPromptForClassification, speakMoveCategory } from './coachVoice';
import { speakCoachMessage, stopCoachAudio } from './soundEffects';

class MockUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const speak = vi.fn();
const cancel = vi.fn();
const audioInstances: MockAudio[] = [];

class MockAudio {
  src = '';
  preload = '';
  volume = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();

  constructor(src = '') {
    this.src = src;
    audioInstances.push(this);
  }
}

beforeEach(() => {
  speak.mockReset();
  cancel.mockReset();
  audioInstances.length = 0;
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  vi.stubGlobal('Audio', MockAudio);
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak,
      cancel,
      getVoices: () => [{ name: 'Natural English', lang: 'en-US' }],
      addEventListener: vi.fn(),
    },
  });
});

afterEach(() => {
  stopCoachAudio();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('browser synthetic coach voice', () => {
  it('provides six unique approved prompts for every classification', () => {
    expect(Object.keys(CLASSIFICATION_PROMPTS)).toHaveLength(13);
    for (const prompts of Object.values(CLASSIFICATION_PROMPTS)) {
      expect(prompts).toHaveLength(6);
      expect(new Set(prompts).size).toBe(6);
    }
  });

  it('selects different prompt positions through the random index', () => {
    vi.mocked(Math.random).mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    expect(coachPromptForClassification('Good')).toBe(CLASSIFICATION_PROMPTS.Good[0]);
    expect(coachPromptForClassification('Good')).toBe(CLASSIFICATION_PROMPTS.Good[5]);
  });

  it('speaks through SpeechSynthesis instead of requesting Kokoro audio', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    speakCoachMessage('Synthetic coach test.');
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    expect(speak.mock.calls[0][0].text).toBe('Synthetic coach test.');
    expect(fetchSpy).not.toHaveBeenCalled();
    speak.mock.calls[0][0].onend?.();
    fetchSpy.mockRestore();
  });

  it('plays the matching recorded Inaccuracy clip instead of synthetic speech', () => {
    speakMoveCategory('Inaccuracy');
    expect(audioInstances[0].src).toBe('/classification-audio/inaccuracy/1.mp3');
    expect(audioInstances[0].play).toHaveBeenCalledOnce();
    expect(speak).not.toHaveBeenCalled();
  });

  it('keeps backend-selected text paired with its exact recording', () => {
    const prompt = CLASSIFICATION_PROMPTS.Mistake[4];
    expect(classificationClipFor('Mistake', prompt)).toEqual({
      src: '/classification-audio/mistake/5.mp3',
      text: prompt,
    });
  });

  it('uses synthetic speech for position-specific text', async () => {
    speakMoveCategory('Mistake', true, 'Their rook can capture your queen next.');
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    expect(speak.mock.calls[0][0].text).toBe('Their rook can capture your queen next.');
    expect(audioInstances).toHaveLength(0);
    speak.mock.calls[0][0].onend?.();
  });

  it('cancels current speech for priority warnings', async () => {
    speakCoachMessage('First message.');
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    speakCoachMessage('Priority warning.', undefined, true, true);
    await vi.waitFor(() => expect(cancel).toHaveBeenCalled());
    await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2));
    expect(speak.mock.calls[1][0].text).toBe('Priority warning.');
    speak.mock.calls[1][0].onend?.();
  });
});
