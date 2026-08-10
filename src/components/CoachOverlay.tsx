'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { Lightbulb, Play, ShieldAlert } from 'lucide-react';
import type { ThreatPreview, MoveAlternative } from '../services/api';

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
  threat: _threat,
  alternatives: _alternatives = [],
  fen: _fen,
  moveCount: _moveCount = 1,
  coachMessage: _coachMessage,
  autoDismissSeconds = 10,
  onCommitWarning,
  onDismissWarning,
  onCloseOverlay,
  onAskHint,
  onShowFollowUp,
}: CoachOverlayProps) {
  const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy', 'Opening Pawn Warning'].includes(classification || '');
  const showFollowUpButton = isBadMove;

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

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

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30 px-3"
      style={{ top: '20%' }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="pointer-events-auto mx-auto w-fit max-w-[90vw] overflow-hidden rounded-2xl relative"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          background: 'rgba(28, 28, 30, 0.75)',
          backdropFilter: 'blur(12px)',
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
              className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/80 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-900/80"
            >
              <ShieldAlert size={15} />
              Show Follow Up Moves
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 p-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300 bg-zinc-900/50 rounded-full"
          title="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
