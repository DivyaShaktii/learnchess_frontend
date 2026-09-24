import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLASSIFICATION_PROMPTS, coachPromptForClassification, speakMoveCategory } from './coachVoice';
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

beforeEach(() => {
  speak.mockReset();
  cancel.mockReset();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
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

  it('uses the new interactive Inaccuracy prompt', async () => {
    speakMoveCategory('Inaccuracy');
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    expect(speak.mock.calls[0][0].text).toBe(
      'Hold on. Consider the other available moves—there may be a better option.',
    );
    speak.mock.calls[0][0].onend?.();
  });

  it('uses the new patient Mistake prompt', async () => {
    speakMoveCategory('Mistake');
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    expect(speak.mock.calls[0][0].text).toBe(
      'This is a mistake. Take your time and reconsider the position.',
    );
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
