import { useState } from 'react';
import { SpeechBubble } from './SpeechBubble';
import type { Persona } from './SpeechBubble';
import { MoveLog } from './MoveLog';
import { AlertTriangle, Play, Lightbulb } from 'lucide-react';
import type { ThreatPreview, MoveAlternative } from '../services/api';
import { translateMoveToEnglish } from '../utils/chessTranslator';

interface CoachPanelProps {
  persona: Persona;
  isThinking: boolean;
  warningActive: boolean;
  coachMessage?: string;
  classification?: string;
  threat?: ThreatPreview | null;
  alternatives?: MoveAlternative[];
  squareSuggestions?: MoveAlternative[];   // shown when a piece is selected
  history: Array<{ san: string; classification: string }>;
  fen: string;
  onCommitWarning: () => void;
  onPlayAlternative: (move: string) => void;
  onPlaySuggestion: (moveUci: string) => void;  // play a suggestion move
}

export function CoachPanel({
  persona,
  isThinking,
  warningActive,
  classification,
  threat,
  alternatives,
  history,
  fen,
  onCommitWarning,
  onPlayAlternative,
}: CoachPanelProps) {
  const [activeTab, setActiveTab] = useState<'none' | 'hint' | 'followup'>('none');
  
  const formatEval = (alt: MoveAlternative) => {
    if (alt.is_mate && alt.mate_in) {
      return `M${alt.mate_in}`;
    }
    if (alt.score_cp !== null && alt.score_cp !== undefined) {
      const v = alt.score_cp / 100;
      return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
    }
    // Fallback if the backend actually provided eval_hint as a string in old spec
    return (alt as any).eval_hint || '';
  };

  const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy'].includes(classification || '');

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6 border-l border-zinc-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-zinc-100 font-heading">Mistake Coach</h2>
      </div>

      <div className="shrink-0 mb-2">
        <SpeechBubble 
          persona={persona} 
          isThinking={isThinking} 
          classification={classification}
        />
      </div>

      {/* Permanent 4 Action Buttons Panel */}
      <div className={`shrink-0 mb-6 border rounded-xl p-4 transition-all ${
        warningActive && isBadMove ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-900/60 border-zinc-800'
      }`}>
        <div className="text-xs font-semibold text-zinc-400 mb-3 flex items-center justify-between">
          <span>Move Controls:</span>
          {warningActive ? (
            <span className="text-[11px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
              Action Pending
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">Ready</span>
          )}
        </div>
        
        {/* Option Content Area */}
        {activeTab === 'followup' && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-sm text-red-300 animate-in fade-in space-y-3">
            {history.length + 1 <= 5 && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded text-xs text-amber-200">
                <span className="font-bold text-amber-300">Opening Advice: </span>
                Try building your center first.
              </div>
            )}

            {threat && (
              <div>
                <div className="flex items-center gap-2 font-semibold mb-1 text-red-200">
                  <AlertTriangle size={16} /> Opponent Reply Threat:
                </div>
                <p>
                  They can play <span className="font-bold bg-red-900/60 px-1.5 py-0.5 rounded text-white border border-red-700">{threat.opponent_best_reply_san}</span>
                  {translateMoveToEnglish(fen, threat.opponent_best_reply_san || '') !== threat.opponent_best_reply_san ? (
                    <span> — {translateMoveToEnglish(fen, threat.opponent_best_reply_san || '')}.</span>
                  ) : (
                    <span>.</span>
                  )}
                </p>
              </div>
            )}

            {alternatives && alternatives.length > 0 && (
              <div>
                <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider mb-2">Better Move Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.san}
                      onClick={() => {
                        onPlayAlternative(alt.move || alt.san);
                        setActiveTab('none');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-emerald-600 rounded-lg text-sm transition-colors text-left"
                    >
                      <span className="font-semibold text-zinc-100">{translateMoveToEnglish(fen, alt.san)}</span>
                      <span className="text-xs text-zinc-400">{formatEval(alt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hint' && (
          <div className="mb-4 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-100 animate-in fade-in space-y-2.5">
            <div className="flex items-center justify-between border-b border-amber-800/40 pb-1.5 font-bold text-amber-300">
              <span className="flex items-center gap-1.5"><Lightbulb size={14} /> Puzzle Hint</span>
              <span className="text-[11px] text-amber-400">Riddle Clue</span>
            </div>

            <p className="font-medium text-amber-200">
              {alternatives[0]?.san ? (
                `🧩 Puzzle Clue: Can you find a move that improves your position without exposing yourself to counterattacks?`
              ) : (
                '🧩 Puzzle Clue: Look for checks, captures, and central pawn pushes!'
              )}
            </p>

            {alternatives && alternatives.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                  Engine Solution:
                </p>
                <div className="flex flex-wrap gap-2">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.san}
                      onClick={() => {
                        onPlayAlternative(alt.move || alt.san);
                        setActiveTab('none');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-600/50 rounded-lg text-xs font-bold text-amber-200 transition-colors"
                    >
                      <span>{alt.san} · {translateMoveToEnglish(fen, alt.san)}</span>
                      <span className="text-amber-400">{formatEval(alt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Permanent Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'hint' ? 'none' : 'hint')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold rounded-lg border transition-all ${
              activeTab === 'hint'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/80'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            <Lightbulb size={14} className="text-amber-400 shrink-0" />
            Hint Box
          </button>

          <button
            onClick={() => {
              setActiveTab('none');
              onCommitWarning();
            }}
            className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
          >
            <Play size={14} className="text-zinc-400 shrink-0" />
            Play Anyway
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'followup' ? 'none' : 'followup')}
            className={`flex items-center justify-center text-center px-2 py-2 text-xs font-bold rounded-lg border transition-all ${
              activeTab === 'followup'
                ? 'bg-red-900/60 text-red-200 border-red-700'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            Show Follow Up Moves
          </button>
        </div>
      </div>

      <div className="flex-grow min-h-0">
        <MoveLog history={history} />
      </div>
    </div>
  );
}
