// Audio playback layer for move classification feedback

const BASE_PATH = "/Chess_Project_Voices";

const AUDIO_FILES: Record<string, string> = {
  Book: `${BASE_PATH}/Book.mp3`,
  Best: `${BASE_PATH}/Best Move On th Board.mp3`,
  'Best Move': `${BASE_PATH}/Best Move On th Board.mp3`,
  Brilliant: `${BASE_PATH}/Brilliant.mp3`,
  Excellent: `${BASE_PATH}/Excellent move.mp3`,
  Good: `${BASE_PATH}/Good move.mp3`,
  Inaccuracy: `${BASE_PATH}/That's a slight inaccuracy.mp3`,
  Mistake: `${BASE_PATH}/Watch out that's a mistake.mp3`,
  Blunder: `${BASE_PATH}/That's a blunder..mp3`,
  'Worst Move': `${BASE_PATH}/That's a serious blunder..mp3`,
  Worst: `${BASE_PATH}/That's a serious blunder..mp3`,
};

export function speakMoveCategory(label: string): void {
  if (typeof window === 'undefined') return;

  const audioPath = AUDIO_FILES[label];
  if (audioPath) {
    try {
      const audio = new Audio(audioPath);
      audio.volume = 1.0;
      audio.play().catch(e => console.warn("Audio play failed:", e));
    } catch (e) {
      console.warn("Failed to play audio", e);
    }
  }
}

export function speakRefutationWarning(): void {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(`${BASE_PATH}/Watch out! Here is their plan..mp3`);
    audio.volume = 1.0;
    audio.play().catch(e => console.warn("Audio play failed:", e));
  } catch (e) {
    console.warn("Failed to play audio", e);
  }
}

export function speakRatingAnnouncement(rating: number, tier: string): void {
  // Silenced for now as we don't have dynamic rating MP3s
  // In the future, we can add a generic "game start" sound here
}

export function speakPuzzleStartAnnouncement(color: string): void {
  // Silenced for now as we don't have dynamic puzzle MP3s
}

export function speakGameWon(): void {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(`${BASE_PATH}/win.mp3`);
    audio.volume = 1.0;
    audio.play().catch(e => console.warn("Audio play failed:", e));
  } catch (e) {
    console.warn("Failed to play audio", e);
  }
}
