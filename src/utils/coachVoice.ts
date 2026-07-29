// Web Speech API layer for move classification audio feedback

const CATEGORY_LINES: Record<string, string> = {
  Book: "That's a book move.",
  Best: 'Best move on the board.',
  'Best Move': 'Best move on the board.',
  Brilliant: 'Brilliant!',
  Excellent: 'Excellent move.',
  Good: 'Good move.',
  Inaccuracy: "That's a slight inaccuracy.",
  Mistake: "Watch out — that's a mistake.",
  Blunder: "That's a blunder.",
  'Worst Move': "That's a serious blunder.",
  Worst: "That's a serious blunder.",
};

export function speakMoveCategory(label: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const line = CATEGORY_LINES[label] || `${label} move.`;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const pickVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => /en/i.test(v.lang) && /natural|aria|google us english|zira|samantha/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Voices already loaded (Chrome after first load, Firefox always)
      pickVoiceAndSpeak();
    } else {
      // First call in Chrome — wait for voices to load then speak
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        pickVoiceAndSpeak();
      };
    }
  } catch {
    // Audio fallback gracefully handled
  }
}

export function speakRefutationWarning(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const line = "Watch out! Here is their plan.";

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const pickVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => /en/i.test(v.lang) && /natural|aria|google us english|zira|samantha/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      pickVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        pickVoiceAndSpeak();
      };
    }
  } catch {
    // Audio fallback gracefully handled
  }
}
export function speakRatingAnnouncement(rating: number, tier: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const line = `Rating ${rating}. ${tier} mode.`;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const pickVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => /en/i.test(v.lang) && /natural|aria|google us english|zira|samantha/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      pickVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        pickVoiceAndSpeak();
      };
    }
  } catch {
    // Audio fallback gracefully handled
  }
}

export function speakPuzzleStartAnnouncement(color: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const line = `Playing as ${color}.`;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const pickVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => /en/i.test(v.lang) && /natural|aria|google us english|zira|samantha/i.test(v.name)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      pickVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        pickVoiceAndSpeak();
      };
    }
  } catch {
    // Audio fallback gracefully handled
  }
}
