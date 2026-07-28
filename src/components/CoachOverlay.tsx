import { useEffect, useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Lightbulb, Play, ShieldAlert, HelpCircle } from 'lucide-react';
import type { ThreatPreview, MoveAlternative } from '../services/api';
import { translateMoveToEnglish } from '../utils/chessTranslator';

interface CoachOverlayProps {
  visible: boolean;
  isThinking: boolean;
  classification?: string;
  threat?: ThreatPreview | null;
  alternatives?: MoveAlternative[];
  fen: string;
  moveCount?: number;
  coachMessage?: string;
  autoDismissSeconds?: number;
  onCommitWarning: () => void;
  onDismissWarning: () => void;
  onCloseOverlay?: () => void;
  onAskHint: () => void;
  onShowFollowUp: () => void;
}

export function CoachOverlay({
  visible,
  isThinking: _isThinking,
  classification,
  threat,
  alternatives = [],
  fen: _fen,
  moveCount = 1,
  coachMessage,
  autoDismissSeconds = 10,
  onCommitWarning,
  onDismissWarning,
  onCloseOverlay,
  onAskHint,
  onShowFollowUp,
}: CoachOverlayProps) {
  const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy'].includes(classification || '');
  const isOpening = moveCount <= 5;
  const isComplex = (threat?.resulting_pv?.length ?? 0) >= 3;
  const showFollowUpButton = !isOpening && isComplex;

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

  const headingText = _isThinking
    ? 'Coach: Analysing...'
    : classification
    ? `Coach: ${classification}`
    : 'Coach';

  const tipText = _isThinking
    ? 'Please wait...'
    : coachMessage ||
      (isOpening && isBadMove
        ? 'Watch your move — try building your center first.'
        : 'Check what your opponent is threatening before you commit.');

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30 px-3"
      style={{ top: '20%' }}
    >
      <div
        className="pointer-events-auto mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(28, 28, 30, 0.55)',
          backdropFilter: 'blur(8px)',
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

        <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-4">
          <button
            onClick={onAskHint}
            className="flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-4 py-2 text-sm font-bold text-zinc-200 transition-all hover:bg-zinc-700/80"
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
              onClick={onShowFollowUp}
              className="flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-4 py-2 text-sm font-bold text-zinc-200 transition-all hover:bg-zinc-700/80"
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
