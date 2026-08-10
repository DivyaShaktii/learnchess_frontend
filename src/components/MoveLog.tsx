'use client';

import { useEffect, useRef } from 'react';
import { translateMoveToEnglish } from '../utils/chessTranslator';

interface MoveRecord {
  san: string;
  classification: string;
  fen_before?: string; // FEN before this move (for translation)
}

interface MoveLogProps {
  history: MoveRecord[];
  playerColor?: 'white' | 'black';
  onClearLog?: () => void;
}

const classConfig: Record<string, { emoji: string; color: string; glow: string; bg: string }> = {
  Brilliant:   { emoji: '✨', color: '#67e8f9', glow: 'rgba(103,232,249,0.3)',  bg: 'rgba(8,145,178,0.15)' },
  Best:        { emoji: '⭐', color: '#86efac', glow: 'rgba(134,239,172,0.3)',  bg: 'rgba(22,163,74,0.15)'  },
  'Best Move': { emoji: '⭐', color: '#86efac', glow: 'rgba(134,239,172,0.3)',  bg: 'rgba(22,163,74,0.15)'  },
  Excellent:   { emoji: '✓',  color: '#a3e635', glow: 'rgba(163,230,53,0.25)',  bg: 'rgba(101,163,13,0.12)' },
  Good:        { emoji: '👍', color: '#bef264', glow: 'rgba(190,242,100,0.2)',  bg: 'rgba(132,204,22,0.10)' },
  Book:        { emoji: '📖', color: '#a1a1aa', glow: 'rgba(161,161,170,0.15)', bg: 'rgba(82,82,91,0.15)'   },
  Inaccuracy:  { emoji: '⚠️', color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  bg: 'rgba(180,83,9,0.15)'   },
  Mistake:     { emoji: '✗',  color: '#fb923c', glow: 'rgba(251,146,60,0.3)',  bg: 'rgba(194,65,12,0.15)'  },
  Blunder:     { emoji: '💀', color: '#f87171', glow: 'rgba(248,113,113,0.35)', bg: 'rgba(185,28,28,0.18)'  },
  'Worst Move':{ emoji: '💀', color: '#f87171', glow: 'rgba(248,113,113,0.35)', bg: 'rgba(185,28,28,0.18)'  },
  'Opening Pawn Warning': { emoji: '⚠️', color: '#fbbf24', glow: 'rgba(251,191,36,0.3)', bg: 'rgba(180,83,9,0.15)' },
};

// Human-friendly label names
const friendlyLabel: Record<string, string> = {
  Brilliant:    'Amazing! ✨',
  Best:         'Best Move ⭐',
  'Best Move':  'Best Move ⭐',
  Excellent:    'Excellent 👏',
  Good:         'Good 👍',
  Book:         'Classic Opening 📖',
  Inaccuracy:   'Could Be Better ⚠️',
  Mistake:      'Mistake ✗',
  Blunder:      'Big Mistake 💀',
  'Worst Move': 'Big Mistake 💀',
  'Opening Pawn Warning': 'Opening Warning ⚠️',
};

const getConfig = (c: string) =>
  classConfig[c] ?? { emoji: '', color: '#71717a', glow: 'transparent', bg: 'rgba(39,39,42,0.4)' };

export function MoveLog({ history, playerColor = 'white', onClearLog }: MoveLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  // Only player's own moves
  const playerMoves = history.filter((_, i) =>
    playerColor === 'white' ? i % 2 === 0 : i % 2 === 1
  );

  const errorCount = playerMoves.filter(m =>
    ['Blunder', 'Mistake'].includes(m.classification)
  ).length;

  const bestCount = playerMoves.filter(m =>
    ['Brilliant', 'Best', 'Best Move', 'Excellent'].includes(m.classification)
  ).length;

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0f0f12 0%, #111115 100%)' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Your Moves</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: playerColor === 'white' ? '#fff' : '#222', border: '1.5px solid #666' }}
              />
              <span className="text-sm text-zinc-400 font-medium">
                Playing as {playerColor === 'white' ? 'White' : 'Black'}
              </span>
            </div>
          </div>

          {onClearLog && playerMoves.length > 0 && (
            <button
              onClick={onClearLog}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors mt-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Mini stats */}
        {playerMoves.length > 0 && (
          <div className="flex gap-3 mt-4">
            <div
              className="flex-1 rounded-xl px-3 py-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-2xl font-black text-white">{playerMoves.length}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-medium uppercase tracking-wider">Moves</p>
            </div>
            <div
              className="flex-1 rounded-xl px-3 py-2.5 text-center"
              style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.12)' }}
            >
              <p className="text-2xl font-black" style={{ color: '#86efac' }}>{bestCount}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-medium uppercase tracking-wider">Best</p>
            </div>
            <div
              className="flex-1 rounded-xl px-3 py-2.5 text-center"
              style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)' }}
            >
              <p className="text-2xl font-black" style={{ color: '#f87171' }}>{errorCount}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-medium uppercase tracking-wider">Errors</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Move List ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}
      >
        {playerMoves.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              ♟
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-zinc-400">No moves yet</p>
              <p className="text-sm text-zinc-600 mt-1">Make a move to start your log</p>
            </div>
          </div>
        ) : (
          playerMoves.map((move, idx) => {
            const cfg = getConfig(move.classification);
            const isLatest = idx === playerMoves.length - 1;
            // Build plain English description using the FEN before this move
            // We reconstruct it: each move advances the game; white=even index, black=odd
            // Use san directly with translator - pass empty fen as fallback
            const description = move.fen_before
              ? translateMoveToEnglish(move.fen_before, move.san)
              : null;
            const label = friendlyLabel[move.classification] || move.classification;

            return (
              <div
                key={idx}
                className="rounded-2xl px-4 py-4 transition-all"
                style={{
                  background: isLatest
                    ? `linear-gradient(135deg, ${cfg.bg}, rgba(255,255,255,0.03))`
                    : 'rgba(255,255,255,0.025)',
                  border: isLatest
                    ? `1px solid ${cfg.color}30`
                    : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isLatest ? `0 0 20px ${cfg.glow}` : 'none',
                }}
              >
                {/* Top row: number + SAN + label */}
                <div className="flex items-center gap-3 mb-1.5">
                  <span
                    className="text-sm font-bold w-6 shrink-0"
                    style={{ color: isLatest ? cfg.color : '#52525b' }}
                  >
                    {idx + 1}.
                  </span>
                  <span
                    className="font-black font-mono"
                    style={{ fontSize: '20px', color: isLatest ? '#fff' : '#d4d4d8' }}
                  >
                    {move.san}
                  </span>
                  {label && (
                    <span
                      className="ml-auto text-xs font-bold whitespace-nowrap"
                      style={{ color: cfg.color }}
                    >
                      {label}
                    </span>
                  )}
                </div>

                {/* Plain English description */}
                {description && description !== move.san && (
                  <p
                    className="text-sm leading-snug pl-9"
                    style={{ color: isLatest ? '#a1a1aa' : '#52525b' }}
                  >
                    {description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      {playerMoves.length > 0 && (
        <div
          className="px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-400">
              {playerMoves.length} move{playerMoves.length !== 1 ? 's' : ''} played
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: errorCount === 0 ? '#86efac' : '#f87171' }}
            >
              {errorCount === 0 ? '✓ Clean game' : `⚠ ${errorCount} error${errorCount > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
