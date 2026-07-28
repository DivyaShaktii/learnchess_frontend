import { useEffect, useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Lightbulb, Play, ShieldAlert, HelpCircle } from 'lucide-react';
import type { ThreatPreview, MoveAlternative } from '../services/api';
import { translateMoveToEnglish } from '../utils/chessTranslator';

interface CoachOverlayProps {
  visible: boolean;
  isThinking: boolean;
  coachMessage?: string;
  classification?: string;
  threat?: ThreatPreview | null;
  alternatives?: MoveAlternative[];
  fen: string;
  moveCount?: number;
  autoDismissSeconds?: number;
  onCommitWarning: () => void;
  onDismissWarning: () => void;
  onCloseOverlay?: () => void;
  onAskHint: () => void;
  onPlayAlternative?: (move: string) => void;
  onShowFollowUp: () => void;
}

export function CoachOverlay({
  visible,
  isThinking,
  coachMessage,
  classification,
  threat,
  alternatives = [],
  fen,
  moveCount = 1,
  autoDismissSeconds = 10,
  onCommitWarning,
  onDismissWarning,
  onCloseOverlay,
  onAskHint,
  onPlayAlternative = () => {},
  onShowFollowUp,
}: CoachOverlayProps) {
  const [activeTab, setActiveTab] = useState<'none' | 'hint' | 'followup'>('none');
  const [hintStep, setHintStep] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy'].includes(classification || '');
  const isOpening = moveCount <= 5;
  const isComplex = (threat?.resulting_pv?.length ?? 0) >= 3;
  const showFollowUpButton = !isOpening && isComplex;
  const bestAlternative = alternatives[0];

  const puzzleClues = useMemo(() => {
    const clues: string[] = [];

    if (bestAlternative?.san) {
      try {
        const chess = new Chess(fen);
        const move = chess.move(bestAlternative.san);
        if (move) {
          const pieceNames: Record<string, string> = {
            p: 'pawn',
            n: 'knight',
            b: 'bishop',
            r: 'rook',
            q: 'queen',
            k: 'king',
          };
          const pieceName = pieceNames[move.piece] || 'piece';
          const toSquare = move.to;

          if (move.flags.includes('c')) {
            clues.push('🧩 Puzzle Clue 1: Look for a tactical capture that wins material or breaks enemy defenses!');
          } else if (move.piece === 'p') {
            clues.push('🧩 Puzzle Clue 1: One of your pawns is ready to march forward and claim central control!');
          } else if (['n', 'b'].includes(move.piece)) {
            clues.push('🧩 Puzzle Clue 1: An undeveloped piece is eager to leap into an active square!');
          } else if (move.flags.includes('k') || move.flags.includes('q')) {
            clues.push('🧩 Puzzle Clue 1: Your King is seeking a safe home behind your pawns!');
          } else {
            clues.push('🧩 Puzzle Clue 1: Look for a key move that boosts your position quality.');
          }

          clues.push(`💡 Piece Clue: Focus on your ${pieceName}!`);
          clues.push(`🎯 Target Clue: The destination square is on the ${toSquare[0]}-file (square ${toSquare}).`);
        }
      } catch {
        // Fall back to general clues
      }
    }

    if (clues.length === 0) {
      clues.push('🧩 Puzzle Clue 1: Look for forcing moves — checks, captures, and central pawn pushes!');
      clues.push('💡 Piece Clue: Look for an un-developed central piece.');
    }

    return clues;
  }, [bestAlternative, fen]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!isBadMove) {
      const autoCloseTimer = setTimeout(() => {
        if (onCloseOverlay) {
          onCloseOverlay();
        } else {
          onDismissWarning();
        }
      }, 4000);
      return () => clearTimeout(autoCloseTimer);
    }
  }, [visible, autoDismissSeconds, isBadMove, onDismissWarning, onCloseOverlay]);

  const handlePlayAnyway = useCallback(() => {
    onCommitWarning();
  }, [onCommitWarning]);

  const handleDismiss = useCallback(() => {
    onDismissWarning();
  }, [onDismissWarning]);

  if (!visible) return null;

  const headingText = isThinking
    ? 'Coach: Analysing...'
    : classification
    ? `Coach: ${classification}`
    : 'Coach';

  const tipText = isThinking
    ? 'Please wait...'
    : coachMessage ||
      (isOpening && isBadMove
        ? 'Watch your move — try building your center first.'
        : 'Check what your opponent is threatening before you commit.');

  const currentClue = puzzleClues[Math.max(0, Math.min(hintStep, puzzleClues.length - 1))];

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30 px-3"
      style={{ top: '20%' }}
    >
      <div
        className="pointer-events-auto mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl backdrop-blur-md"
        style={{
          background: 'rgba(28, 28, 30, 0.92)',
          border: '1.5px solid rgba(245, 158, 11, 0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 15px rgba(245, 158, 11, 0.2)',
          animation: 'slideDown 0.25s ease',
        }}
      >
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-base font-bold text-amber-300">{headingText}</p>
            <p className="text-xs font-semibold leading-relaxed text-amber-400/90">{tipText}</p>
          </div>
        </div>

        {activeTab === 'hint' && (
          <div className="mx-6 mb-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-3.5 text-xs text-amber-100 animate-in fade-in space-y-3">
            <div className="flex items-center justify-between border-b border-amber-800/40 pb-2">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Lightbulb size={15} /> Puzzle Hint Mode
              </span>
              <span className="text-[11px] text-amber-400/80">
                Clue {Math.min(hintStep + 1, puzzleClues.length)} of {puzzleClues.length}
              </span>
            </div>

            <p className="font-medium leading-relaxed text-amber-100 bg-amber-900/30 p-2.5 rounded border border-amber-700/30">
              {currentClue}
            </p>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => {
                  setHintStep((step) => (step + 1) % puzzleClues.length);
                }}
                className="flex items-center gap-1.5 rounded bg-amber-800/60 px-3 py-1.5 font-bold text-amber-200 hover:bg-amber-700/70 transition-colors"
              >
                <Lightbulb size={13} /> Next Puzzle Clue
              </button>

              <button
                onClick={() => setShowSolution(!showSolution)}
                className="rounded border border-amber-600/50 px-3 py-1.5 font-bold text-amber-300 hover:bg-amber-900/50 transition-colors"
              >
                {showSolution ? 'Hide Solution' : 'Reveal Solution 🔓'}
              </button>
            </div>

            {showSolution && alternatives.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-700/40 animate-in fade-in">
                <p className="mb-2 font-bold uppercase tracking-wider text-amber-400 text-[11px]">
                  Puzzle Solution:
                </p>
                <div className="flex flex-wrap gap-2">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.san}
                      onClick={() => onPlayAlternative(alt.move || alt.san)}
                      className="flex items-center gap-2 rounded border border-amber-600/40 bg-amber-900/60 px-3 py-1.5 font-bold text-amber-200 hover:bg-amber-800/80 transition-colors"
                    >
                      <span>{alt.san} · {translateMoveToEnglish(fen, alt.san)}</span>
                      <span className="text-amber-400">
                        {alt.is_mate && alt.mate_in
                          ? `M${alt.mate_in}`
                          : alt.score_cp != null
                          ? `${alt.score_cp > 0 ? '+' : ''}${(alt.score_cp / 100).toFixed(1)}`
                          : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'followup' && (
          <div className="mx-6 mb-3 space-y-3 rounded-lg border border-red-700/40 bg-red-950/30 p-3.5 text-xs text-red-100 animate-in fade-in">
            {isOpening && (
              <div className="rounded border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-amber-200">
                <p className="font-bold text-amber-300">Opening Advice:</p>
                <p>Try building your center first.</p>
              </div>
            )}

            {threat && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 font-bold text-red-300">
                  <ShieldAlert size={14} /> Opponent Reply Threat:
                </p>
                <p>
                  They can play{' '}
                  <span className="rounded border border-red-700 bg-red-900/70 px-1.5 py-0.5 font-bold text-white">
                    {threat.opponent_best_reply_san}
                  </span>
                  {translateMoveToEnglish(fen, threat.opponent_best_reply_san || '') !== threat.opponent_best_reply_san ? (
                    <span> — {translateMoveToEnglish(fen, threat.opponent_best_reply_san || '')}.</span>
                  ) : (
                    <span>.</span>
                  )}
                </p>
                {threat.score_after_reply_cp != null && (
                  <p className="mt-1 text-red-300/80">
                    Evaluation swings to {threat.score_after_reply_cp > 0 ? '+' : ''}
                    {(threat.score_after_reply_cp / 100).toFixed(1)} after this reply.
                  </p>
                )}
              </div>
            )}

            {alternatives.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-red-200/80">
                  Better Move Suggestions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.san}
                      onClick={() => onPlayAlternative(alt.move || alt.san)}
                      className="flex items-center gap-2 rounded border border-emerald-700/50 bg-emerald-950/60 px-3 py-1.5 text-left font-medium text-emerald-300 transition-colors hover:bg-emerald-900/60"
                    >
                      <span>{alt.san} · {translateMoveToEnglish(fen, alt.san)}</span>
                      <span className="text-emerald-400">
                        {alt.is_mate && alt.mate_in
                          ? `M${alt.mate_in}`
                          : alt.score_cp != null
                          ? `${alt.score_cp > 0 ? '+' : ''}${(alt.score_cp / 100).toFixed(1)}`
                          : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 px-6 pb-5 pt-1">
          <button
            onClick={() => {
              setActiveTab(activeTab === 'hint' ? 'none' : 'hint');
              setHintStep((step) => {
                const total = puzzleClues?.length || 1;
                return (step + 1) % total;
              });
              onAskHint();
            }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all ${
              activeTab === 'hint'
                ? 'border-amber-500/80 bg-amber-500/20 text-amber-300'
                : 'border-zinc-700/80 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/80'
            }`}
          >
            <Lightbulb size={15} className="text-amber-400" />
            Hint Box
          </button>

          <button
            onClick={handlePlayAnyway}
            className="flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-4 py-2 text-sm font-bold text-zinc-200 transition-all hover:bg-zinc-700/80"
          >
            <Play size={15} className="text-zinc-400" />
            Play Anyway
          </button>

          {showFollowUpButton && (
            <button
              onClick={() => {
                setActiveTab(activeTab === 'followup' ? 'none' : 'followup');
                onShowFollowUp();
              }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all ${
                activeTab === 'followup'
                  ? 'border-red-700 bg-red-900/60 text-red-200'
                  : 'border-zinc-700/80 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/80'
              }`}
            >
              <ShieldAlert size={15} className="text-red-400" />
              Show Follow Up Moves
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="ml-auto px-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
