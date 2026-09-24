import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { speakMoveCategory } from './coachVoice';
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
});

describe('browser synthetic coach voice', () => {
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
      'Hold on. Think about other moves. There may be a better option.',
    );
    speak.mock.calls[0][0].onend?.();
  });

  it('uses the new patient Mistake prompt', async () => {
    speakMoveCategory('Mistake');
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    expect(speak.mock.calls[0][0].text).toBe(
      'This is a mistake. Take your time and think about this position.',
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
