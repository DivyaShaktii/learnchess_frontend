import { describe, expect, it } from 'vitest';

import { getStaticCoachAudioPath } from './soundEffects';

describe('Kokoro permanent clip selection', () => {
  it('uses the exact generated clip for fixed move categories', () => {
    expect(getStaticCoachAudioPath('Brilliant move!')).toBe('/coach-audio/brilliant.wav');
    expect(getStaticCoachAudioPath('Best move.')).toBe('/coach-audio/best.wav');
    expect(getStaticCoachAudioPath('That is a blunder.')).toBe('/coach-audio/blunder.wav');
  });

  it('leaves unique factual explanations for dynamic Kokoro generation', () => {
    expect(getStaticCoachAudioPath('The fork wins the rook after the king moves.')).toBeNull();
  });
});
