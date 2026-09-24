// Audio playback layer for move classification feedback
import { clearSubtitleAfter, dispatchSubtitle, playCoachClip, speakFollowUpMessage } from './soundEffects';
import { Chess } from 'chess.js';
import { getRandomRoast, getRoastCategoryForMove, RoastCategoryKey } from '../data/roastDialogues';

export const CLASSIFICATION_PROMPTS: Record<string, string[]> = {
  Book: [
    "Nice, you're right on track with the opening here.", "That's a familiar move, and a good one. Keep going.",
    "You know this one. It's a well-trodden path.", "Good, you're still following the classic ideas.",
    'Players have been choosing this move for years, and for good reason.', "That's a solid, standard choice. Nicely done.",
  ],
  Brilliant: [
    "Wow, that's brilliant! You gave something up and it really pays off.", "Now that's a special move. You saw something most people would miss.",
    'I love it! That sacrifice was bold, and it works beautifully.', 'That was a big idea, and you found it. Really well played.',
    'Brilliant! Brave, sharp, and exactly right.', 'Look at you go! That sacrifice gives you a great position.',
  ],
  'Only Move': [
    'Great find! That was the one move that holds everything together.', 'Well spotted. This position needed exactly that, and you delivered.',
    'That was the only move, and you found it. Really nice.', 'Sharp thinking! Everything else would have caused trouble.',
    'That was a tough one, and you got it right. Good job.', 'You kept your cool and found the key move. Well done.',
  ],
  'Great Move': [
    "Great move! That wasn't easy to find.", "Really nice. That's clearly one of the best options here.",
    'I like that a lot. It gives you excellent chances.', 'Very well played. You picked the better path.',
    'That shows real understanding of the position. Keep it up.', 'Good eye! That one was hidden pretty well.',
  ],
  'Best Move': [
    "That's the best move in the position. Excellent!", 'You found the top choice. Perfect.',
    'Exactly what the engine would play. Well done!', "Spot on. That's the strongest move on the board.",
    'Beautiful, you found the most accurate move.', "That's it! It leads to the best continuation.",
  ],
  Excellent: [
    "Excellent move. You're playing really well.", 'Very accurate. Your position stays strong.',
    "That's a great choice, and you're not giving up anything.", 'Nicely done. Your pieces are working well together.',
    'So close to the very best. You should be happy with that.', "That's a clean, confident move. Keep going.",
  ],
  Good: [
    'Good move. Your position is in good shape.', "Nice, that's a sensible choice.",
    "That works well. You're doing fine.", 'Solid move. Nothing to worry about here.',
    "You're on the right track. Keep it up.", 'Well played. Simple and reliable.',
  ],
  Inaccuracy: [
    "That's playable, but let's pause. Is there something even better?",
    'Take a breath and have another look. There may be a stronger idea.',
    'Not bad, but I think you can do a little better. Want to look again?',
    "Let's compare this with a couple of other moves. What do you see?",
    'Small slip, no worries. Take another look and see if you can improve it.',
    "This one's okay, but there's a sharper option. Give it another think.",
  ],
  Mistake: [
    "Hmm, let's slow down. What could your opponent do after this?",
    "No rush. Have a look at the position again. There's something better.",
    'This one might cause you a few problems. Want to try a different idea?',
    'Take your time. Check what your opponent wants to do here.',
    "It's okay, we all have these moments. Look again for a safer move.",
    "Let's think about this together. What's your opponent threatening?",
  ],
  Blunder: [
    'Wait, take a moment. Check what your opponent can do here.',
    "Let's pause. There might be a strong reply to this move. Can you spot it?",
    "Easy now, look at the whole board again. Something doesn't feel right.",
    'No stress, just take another look. Think about what could go wrong.',
    "Hold on a second. This one could hurt, so let's find a better move.",
    'Take a deep breath and check every capture and threat first.',
  ],
  'Worst Move': [
    "Let's stop here for a second. This one really isn't good. Take another look.",
    "No worries, you can rethink this. There's a much better move waiting.",
    'Pause and look again. This move could turn the game around.',
    "Let's not rush. Check the position carefully, and you'll find something better.",
    'This is one to avoid. Take your time and search for a stronger move.',
    "Hey, look again. Trust me, there's a far better option.",
  ],
  'Opening Pawn Warning': [
    "Let's think about that pawn move. Could a piece come out instead?",
    'That pawn might slow you down. What about developing a knight or bishop?',
    'Careful with the edge pawns. Controlling the center usually helps more.',
    'How about bringing a piece into the game first?',
    'Before you push that pawn, ask yourself what it does for the center.',
    "It's a bit slow for now. Try getting your pieces active first.",
  ],
  'Opening Principle': [
    'Try to develop a piece or take some space in the center.', 'Getting your pieces out will really help your position.',
    'Is there another piece you can bring into the game?', 'Remember the basics: develop, control the center, and think about castling.',
    'Look for a move that improves your pieces and keeps your king safe.', 'This is a great time to follow the opening basics.',
  ],
};

const CLASSIFICATION_AUDIO_SLUGS: Record<string, string> = {
  Book: 'book',
  Brilliant: 'brilliant',
  'Only Move': 'only-move',
  'Great Move': 'great-move',
  'Best Move': 'best-move',
  Excellent: 'excellent',
  Good: 'good',
  Inaccuracy: 'inaccuracy',
  Mistake: 'mistake',
  Blunder: 'blunder',
  'Worst Move': 'worst-move',
  'Opening Pawn Warning': 'opening-pawn-warning',
  'Opening Principle': 'opening-principle',
};

const CLASSIFICATION_ALIASES: Record<string, string> = {
  Best: 'Best Move',
  Great: 'Great Move',
  Worst: 'Worst Move',
};

const canonicalClassification = (label: string) => CLASSIFICATION_ALIASES[label] || label;

export function classificationClipFor(label: string, text?: string): { src: string; text: string } | null {
  const canonical = canonicalClassification(label);
  const prompts = CLASSIFICATION_PROMPTS[canonical];
  const slug = CLASSIFICATION_AUDIO_SLUGS[canonical];
  if (!prompts?.length || !slug) return null;

  // A backend-selected prompt must use its matching recording. Unknown text is
  // position-specific and should remain synthetic rather than play the wrong clip.
  const suppliedIndex = text ? prompts.indexOf(text) : -1;
  if (text && suppliedIndex < 0) return null;
  const index = suppliedIndex >= 0 ? suppliedIndex : Math.floor(Math.random() * prompts.length);
  return { src: `/classification-audio/${slug}/${index + 1}.mp3`, text: prompts[index] };
}

export function coachPromptForClassification(label: string): string {
  const prompts = CLASSIFICATION_PROMPTS[canonicalClassification(label)];
  if (!prompts?.length) return `${label} move.`;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function speakMoveCategory(label: string, playAudio: boolean = true, fallbackText?: string, priority = false): void {
  if (typeof window === 'undefined') return;

  const clip = classificationClipFor(label, fallbackText);
  if (clip) {
    playCoachClip(clip.src, clip.text, playAudio, priority);
    return;
  }
  const text = fallbackText || coachPromptForClassification(label);
  dispatchSubtitle(text);
  clearSubtitleAfter(5000);
}

export function speakRefutationWarning(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;

  speakFollowUpMessage('Watch out! Here is their plan.', undefined, playAudio);
}

export function speakRatingAnnouncement(rating: number, tier: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  dispatchSubtitle(`${tier} Mode, Rating ${rating}`);
  clearSubtitleAfter(5000);
}

export function speakPuzzleStartAnnouncement(color: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  dispatchSubtitle(`Playing as ${color}. Find the best sequence of moves!`);
  clearSubtitleAfter(5000);
}

export function speakGameWon(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;

  playCoachClip('/coach-audio/win.wav', 'You win!', playAudio);
}

export function speakGameLost(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  playCoachClip('/coach-audio/loss.wav', 'Checkmate. Your opponent wins this game.', playAudio);
}

export function speakGameDraw(isStalemate: boolean = false, playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  const text = isStalemate ? 'Stalemate. The game is a draw.' : 'The game ends in a draw.';
  playCoachClip(isStalemate ? '/coach-audio/stalemate.wav' : '/coach-audio/draw.wav', text, playAudio);
}

export function speakDynamicRefutation(refutationSequence: string[], currentFen: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined' || refutationSequence.length === 0) return;
  
  try {
    const chess = new Chess(currentFen);
    const lostPieces = new Set<string>();
    const lineMoves: Array<{ piece: string; to: string; san: string; captured?: string }> = [];

    for (let i = 0; i < Math.min(refutationSequence.length, 3); i++) {
      const moveUci = refutationSequence[i];
      const move = chess.move({
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
        promotion: moveUci[4] || 'q',
      });
      lineMoves.push(move);
      
      // If it's the opponent's turn (i is even) and they captured something
      if (i % 2 === 0 && move.captured) {
        let pieceName: string = move.captured;
        if (pieceName === 'p') pieceName = 'pawn';
        if (pieceName === 'n') pieceName = 'knight';
        if (pieceName === 'b') pieceName = 'bishop';
        if (pieceName === 'r') pieceName = 'rook';
        if (pieceName === 'q') pieceName = 'queen';
        lostPieces.add(pieceName);
      }
    }

    if (lostPieces.size > 0) {
      const piecesList = Array.from(lostPieces);
      let piecesText = piecesList[0];
      if (piecesList.length > 1) {
        piecesText = piecesList.slice(0, -1).join(', ') + ' and ' + piecesList[piecesList.length - 1];
      }
      speakFollowUpMessage(`Watch out! You will lose your ${piecesText} if you make this move.`, undefined, playAudio);
    } else {
      const pieceNames: Record<string, string> = {
        p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
      };
      const describe = (move: { piece: string; to: string; san: string }) => {
        if (move.san.startsWith('O-O-O')) return 'castle queenside';
        if (move.san.startsWith('O-O')) return 'castle kingside';
        return `${pieceNames[move.piece] || 'piece'} to ${move.to}`;
      };
      const opponentReply = lineMoves[0];
      const requiredResponse = lineMoves[1];
      let message: string;

      if (!opponentReply) {
        message = 'Your opponent has a stronger continuation here. Check the highlighted line before deciding.';
      } else if (opponentReply.san.includes('+') || opponentReply.san.includes('#')) {
        message = `Your opponent can play ${describe(opponentReply)} with check, forcing you to respond.`;
      } else if (requiredResponse) {
        message = `Your opponent's strongest reply is ${describe(opponentReply)}. Your best response would be ${describe(requiredResponse)}.`;
      } else {
        message = `Your opponent's strongest reply is ${describe(opponentReply)}, taking control of the position.`;
      }
      speakFollowUpMessage(message, undefined, playAudio);
    }
  } catch (err) {
    console.warn("Failed to generate dynamic refutation voice", err);
    speakRefutationWarning(playAudio);
  }
}

// -------------------------------------------------------------
// 🔥 Roast Mode (18+) Voice Functions
// -------------------------------------------------------------

export function speakRoastMoveCategory(
  label: string,
  cpLoss?: number,
  isOpening?: boolean,
  playAudio: boolean = true
): string {
  if (typeof window === 'undefined') return '';
  const category = getRoastCategoryForMove(label, cpLoss, isOpening);
  const line = getRandomRoast(category);
  dispatchSubtitle(line);
  clearSubtitleAfter(5000);
  return line;
}

export function speakRoastPreMoveWarning(playAudio: boolean = true): string {
  if (typeof window === 'undefined') return '';
  const line = 'Hold it, genius. That move deserves another look.';
  dispatchSubtitle(line);
  clearSubtitleAfter(5000);
  return line;
}

export function speakRoastUndo(playAudio: boolean = true): string {
  if (typeof window === 'undefined') return '';
  const line = getRandomRoast('UNDO_MOVE');
  dispatchSubtitle(line);
  clearSubtitleAfter(5000);
  return line;
}

export function speakRoastSlowPlay(playAudio: boolean = true): string {
  if (typeof window === 'undefined') return '';
  const line = getRandomRoast('SLOW_PLAY');
  dispatchSubtitle(line);
  clearSubtitleAfter(5000);
  return line;
}

export function speakRoastGameOver(
  outcome: 'robot_wins' | 'player_wins' | 'stalemate' | 'draw',
  playAudio: boolean = true
): string {
  if (typeof window === 'undefined') return '';
  let category: RoastCategoryKey = 'CHECKMATE_ROBOT_WINS';
  if (outcome === 'player_wins') category = 'CHECKMATE_PLAYER_WINS';
  if (outcome === 'stalemate') category = 'STALEMATE';
  if (outcome === 'draw') category = 'DRAW';

  const line = getRandomRoast(category);
  const clips = {
    player_wins: ['/coach-audio/win.wav', 'You win!'],
    robot_wins: ['/coach-audio/loss.wav', 'Checkmate. Your opponent wins this game.'],
    stalemate: ['/coach-audio/stalemate.wav', 'Stalemate. The game is a draw.'],
    draw: ['/coach-audio/draw.wav', 'The game ends in a draw.'],
  } as const;
  const [src, subtitle] = clips[outcome];
  playCoachClip(src, subtitle, playAudio);
  return line;
}
