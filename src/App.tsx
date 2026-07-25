import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { AlertCircle, X, RefreshCcw } from 'lucide-react';
import { ChessBoardArea } from './components/ChessBoardArea';
import { CoachOverlay } from './components/CoachOverlay';
import { MoveLog } from './components/MoveLog';
import { api } from './services/api';
import type { MoveAlternative, ThreatPreview } from './services/api';
import { getMoveSquares } from './utils/chessTranslator';
import { chessSounds, speakCoachMessage } from './utils/soundEffects';

export interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded border border-red-800 bg-red-950 px-4 py-3 text-red-200 shadow-lg animate-in fade-in slide-in-from-top-4">
      <AlertCircle size={18} className="shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 rounded p-1 transition-colors hover:bg-red-900">
        <X size={14} />
      </button>
    </div>
  );
}

export type GameMode = 'you_vs_robot' | 'robot_vs_robot' | 'you_vs_friend';

type MoveHistoryEntry = {
  san: string;
  classification: string;
  fen_before?: string;
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('you_vs_robot');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [learnerMode, setLearnerMode] = useState(true);
  const [coachVoiceEnabled, setCoachVoiceEnabled] = useState(true);
  const [gameId, setGameId] = useState<string | null>(null);
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);

  const [isThinking, setIsThinking] = useState(false);
  const [isRobotThinking, setIsRobotThinking] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [pendingMoveUci, setPendingMoveUci] = useState<string | null>(null);
  const [pendingFen, setPendingFen] = useState<string | null>(null);
  const [badMoveSquare, setBadMoveSquare] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | undefined>();
  const [threat, setThreat] = useState<ThreatPreview | null>(null);
  const [alternatives, setAlternatives] = useState<MoveAlternative[]>([]);
  const [squareSuggestions, setSquareSuggestions] = useState<MoveAlternative[]>([]);

  const previousFenRef = useRef(START_FEN);
  const lastSpokenMessageRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPreference = window.localStorage.getItem('coach-voice-enabled');
    if (savedPreference === 'false') {
      setCoachVoiceEnabled(false);
    } else {
      setCoachVoiceEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('coach-voice-enabled', String(coachVoiceEnabled));
  }, [coachVoiceEnabled]);

  useEffect(() => {
    if (!coachVoiceEnabled || !coachMessage || isThinking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    if (coachMessage === lastSpokenMessageRef.current) return;

    lastSpokenMessageRef.current = coachMessage;
    speakCoachMessage(coachMessage);
  }, [coachMessage, coachVoiceEnabled, isThinking]);

  const isPlayerTurn = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return false;

      const isWhiteTurn = chess.turn() === 'w';
      let turn = false;

      if (gameMode === 'you_vs_robot') {
        turn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      } else if (gameMode === 'you_vs_friend') {
        turn = true;
      }

      return turn && !isRobotThinking;
    } catch {
      return false;
    }
  }, [fen, gameMode, playerColor, isRobotThinking]);

  useEffect(() => {
    void startNewGame();
  }, []);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gameId || warningActive) return;

    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return;

      const isWhiteTurn = chess.turn() === 'w';
      const shouldRobotMove =
        gameMode === 'robot_vs_robot' ||
        (gameMode === 'you_vs_robot' && (playerColor === 'white' ? !isWhiteTurn : isWhiteTurn));

      if (shouldRobotMove) {
        const timer = setTimeout(() => {
          void playRobotMove();
        }, gameMode === 'robot_vs_robot' ? 600 : 250);

        return () => clearTimeout(timer);
      }
    } catch {}
  }, [fen, gameMode, playerColor, gameId, warningActive]);

  const handleError = (err: any) => {
    console.error(err);
    if (err.status === 404) {
      setToastMessage('Game session lost. Starting a new game.');
      void startNewGame();
    } else if (err.status !== 400) {
      setToastMessage('Coach is unreachable - check the backend is running');
    }
  };

  const startNewGame = async () => {
    try {
      setIsThinking(false);
      setIsRobotThinking(false);
      setCoachMessage('');
      setSquareSuggestions([]);
      lastSpokenMessageRef.current = '';
      const res = await api.startNewGame();
      setGameId(res.game_id);
      setFen(res.fen);
      setHistory([]);
      resetWarningState();
      previousFenRef.current = res.fen;
    } catch (err) {
      handleError(err);
    }
  };

  const resetWarningState = () => {
    setOverlayVisible(false);
    setWarningActive(false);
    setPendingMoveUci(null);
    setPendingFen(null);
    setBadMoveSquare(null);
    setClassification(undefined);
    setThreat(null);
    setAlternatives([]);
    lastSpokenMessageRef.current = '';
  };

  const handleUndoBadMove = async () => {
    if (!gameId) return;

    try {
      const plies = gameMode === 'you_vs_friend' ? 1 : 2;
      const res = await api.undoMove(gameId, plies);
      setFen(res.fen);
      setHistory(res.move_history);
      resetWarningState();
      setCoachMessage('Move undone. Choose your next move!');
    } catch {
      setFen(previousFenRef.current);
      resetWarningState();
    }
  };

  const refreshGameState = useCallback(async (id: string) => {
    try {
      const state = await api.getGameState(id);
      setFen(state.fen);
      setHistory(state.move_history);
      if (state.is_game_over) {
        setCoachMessage(`Game over! ${state.result || ''}`);
      }
    } catch (err) {
      handleError(err);
    }
  }, []);

  const handleMoveAttempt = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (isThinking || isRobotThinking || !gameId) return false;

    const chess = new Chess(fen);
    let move;

    const isPawn = chess.get(sourceSquare as any)?.type === 'p';
    const isPromotion = isPawn && (targetSquare[1] === '8' || targetSquare[1] === '1');
    const promotionPiece = isPromotion
      ? (piece && piece.length >= 2 && ['q', 'r', 'b', 'n'].includes(piece[1].toLowerCase()) ? piece[1].toLowerCase() : 'q')
      : undefined;

    try {
      move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotionPiece,
      });
    } catch {
      return false;
    }

    if (!move) return false;

    playMoveSoundForUci(fen, move.from + move.to + (move.promotion || ''));

    const moveUci = move.from + move.to + (move.promotion || '');
    const nextFen = chess.fen();

    void (async () => {
      try {
        setOverlayVisible(false);
        setWarningActive(false);
        setIsThinking(true);
        setSquareSuggestions([]);
        setCoachMessage('Analysing...');

        const preRes = await api.precheckMove(gameId, moveUci);
        const label = preRes.label || 'Move';
        const labelMap: Record<string, string> = {
          Brilliant: 'Brilliant',
          Great: 'Great',
          'Best Move': 'Best',
          Best: 'Best',
          Excellent: 'Excellent',
          Good: 'Good',
          Book: 'Book',
          Inaccuracy: 'Inaccuracy',
          Mistake: 'Mistake',
          Blunder: 'Blunder',
          'Worst Move': 'Blunder',
        };
        const cleanLabel = labelMap[label] || label;
        setClassification(cleanLabel);
        setPendingMoveUci(moveUci);
        setPendingFen(nextFen);
        setThreat(preRes.threat_preview);
        setAlternatives(preRes.top_alternatives ?? []);

        const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy', 'Worst Move'].includes(cleanLabel);
        const topAlternative = preRes.top_alternatives?.[0];

        const playerMoveCount = history.filter((_, i) => (playerColor === 'white' ? i % 2 === 0 : i % 2 === 1)).length + 1;
        let customMsg = '';

        if (playerMoveCount <= 5) {
          customMsg = 'Watch your moves';
        } else if (isBadMove && preRes.threat_preview?.opponent_best_reply_san) {
          customMsg = `${preRes.threat_preview.opponent_best_reply_san} is the reply to watch.`;
        } else if (isBadMove && topAlternative?.san) {
          customMsg = `${topAlternative.san} was the stronger move here.`;
        } else {
          const msgs: Record<string, string> = {
            Blunder: 'This move loses too much at once.',
            Mistake: 'This gives your opponent a real target.',
            Inaccuracy: 'Playable, but there was a cleaner move.',
            Brilliant: 'Excellent move. You found the top idea.',
            Best: 'Best move. Keep going.',
            Excellent: 'Strong move. Your position improves.',
            Good: 'Solid move. No issues here.',
            Book: 'Book move. You are still in theory.',
          };
          customMsg = msgs[cleanLabel] || `${cleanLabel} move.`;
        }

        setCoachMessage(customMsg);

        if (isBadMove) {
          setBadMoveSquare(move.to);
          setWarningActive(true);
          setOverlayVisible(true);
          setIsThinking(false);
          return;
        }

        setBadMoveSquare(null);
        setFen(nextFen);
        setOverlayVisible(true);
        setIsThinking(false);
        await commitAndFinalize(moveUci);
      } catch (error) {
        console.error('Error in handleMoveAttempt:', error);
        setIsThinking(false);
        setOverlayVisible(true);
        setWarningActive(true);
      }
    })();

    return true;
  };

  const handleCommitWarning = async () => {
    if (pendingMoveUci && gameId) {
      setIsThinking(true);
      const moveUci = pendingMoveUci;
      const targetFen = pendingFen;
      resetWarningState();
      try {
        if (targetFen) setFen(targetFen);
        await commitAndFinalize(moveUci);
      } catch (err) {
        handleError(err);
      } finally {
        setIsThinking(false);
      }
    }
  };

  const playMoveSoundForUci = (boardFen: string, moveUci: string) => {
    try {
      const chess = new Chess(boardFen);
      const moveObj = chess.move(moveUci);
      if (moveObj && (moveObj.flags.includes('c') || moveObj.flags.includes('e'))) {
        chessSounds.playCapture();
      } else {
        chessSounds.playMove();
      }
    } catch {
      chessSounds.playMove();
    }
  };

  const commitAndFinalize = async (moveUci: string) => {
    if (!gameId) return;

    try {
      playMoveSoundForUci(fen, moveUci);
      const commitRes = await api.commitMove(gameId, moveUci);
      setFen(commitRes.fen);
      await refreshGameState(gameId);

      const label = commitRes.classification || 'Move';
      const labelMap: Record<string, string> = {
        Brilliant: 'Brilliant',
        Great: 'Great',
        'Best Move': 'Best',
        Best: 'Best',
        Excellent: 'Excellent',
        Good: 'Good',
        Book: 'Book',
        Inaccuracy: 'Inaccuracy',
        Mistake: 'Mistake',
        Blunder: 'Blunder',
        'Worst Move': 'Blunder',
      };
      const cleanLabel = labelMap[label] || label;
      setClassification(cleanLabel);

      setOverlayVisible(true);
      setPendingMoveUci(null);
      setPendingFen(null);
      setWarningActive(false);

      if (commitRes.is_game_over) {
        setCoachMessage(`Game over! ${commitRes.result || ''}`);
        setOverlayVisible(true);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsThinking(false);
    }
  };

  const executeCommit = useCallback(async (moveUci: string) => {
    if (!gameId) return;

    try {
      playMoveSoundForUci(fen, moveUci);
      const commitRes = await api.commitMove(gameId, moveUci);
      setFen(commitRes.fen);
      await refreshGameState(gameId);
      resetWarningState();
    } catch (err) {
      handleError(err);
    }
  }, [gameId, fen, refreshGameState]);

  const playRobotMove = useCallback(async () => {
    if (!gameId) return;

    setIsRobotThinking(true);
    try {
      const res = await api.getBestMoves(gameId, 1);
      if (res.moves && res.moves.length > 0) {
        const moveUci = res.moves[0].move;
        if (moveUci) await executeCommit(moveUci);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsRobotThinking(false);
    }
  }, [executeCommit, gameId]);

  const handleDismissWarning = () => {
    setFen(previousFenRef.current);
    resetWarningState();
    setCoachMessage('Good call. Find a better move!');
  };

  const handlePlayAlternative = async (moveUci: string) => {
    if (!gameId) return;

    setIsThinking(true);
    try {
      const chess = new Chess(previousFenRef.current);
      const parsedMove = chess.move(moveUci);
      if (parsedMove) setFen(chess.fen());
    } catch {
      // Ignore preview-only failures; the backend remains authoritative.
    }

    resetWarningState();
    await executeCommit(moveUci);
    setCoachMessage('Playing the suggested move!');
    setIsThinking(false);
  };

  const handleAskHint = async () => {
    if (!gameId) return;

    setIsThinking(true);
    try {
      const res = await api.getBestMoves(gameId, 3);
      setCoachMessage('Here are some strong ideas.');
      setWarningActive(true);
      setOverlayVisible(true);
      setClassification('Best');
      setThreat(null);
      setAlternatives(
        res.moves.map((m: any) => ({
          move: m.move,
          san: m.san,
          score_cp: m.score_cp,
          is_mate: m.is_mate,
          mate_in: m.mate_in,
          pv: m.pv ?? [],
        })) as MoveAlternative[],
      );
      setPendingMoveUci(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsThinking(false);
    }
  };

  const handlePieceSelect = async (square: string | null) => {
    if (!learnerMode || !square || !gameId || isThinking || isRobotThinking) {
      setSquareSuggestions([]);
      return;
    }

    try {
      const res = await api.getBestMoves(gameId, 3);
      setSquareSuggestions(res.moves);
    } catch {
      setSquareSuggestions([]);
    }
  };

  useEffect(() => {
    if (!warningActive) {
      previousFenRef.current = fen;
    }
  }, [fen, warningActive]);

  const boardArrows = useMemo<[string, string, string][]>(() => {
    if (!learnerMode) return [];

    const arrows: [string, string, string][] = [];

    if (warningActive) {
      if (threat?.opponent_best_reply_san) {
        const sq = getMoveSquares(fen, threat.opponent_best_reply_san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(239, 68, 68, 0.85)']);
      }

      alternatives.forEach((alt) => {
        const sq = getMoveSquares(fen, alt.san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(34, 197, 94, 0.85)']);
      });
    } else if (squareSuggestions.length > 0) {
      squareSuggestions.forEach((alt, idx) => {
        const sq = getMoveSquares(fen, alt.san);
        if (sq) {
          const alpha = [0.9, 0.65, 0.4][idx] ?? 0.3;
          arrows.push([sq.from, sq.to, `rgba(34, 197, 94, ${alpha})`]);
        }
      });
    }

    return arrows;
  }, [warningActive, learnerMode, squareSuggestions, threat, alternatives, fen]);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden text-zinc-100"
      style={{ background: '#1a1a1a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div
        className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5"
        style={{ height: '44px', background: '#111' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={gameMode}
              onChange={(e) => {
                setGameMode(e.target.value as GameMode);
                void startNewGame();
              }}
              className="cursor-pointer bg-transparent text-sm font-bold text-zinc-100 outline-none"
              style={{ appearance: 'auto' }}
            >
              <option value="you_vs_robot" className="bg-zinc-900">You Vs Robot</option>
              <option value="robot_vs_robot" className="bg-zinc-900">Robot Vs Robot</option>
              <option value="you_vs_friend" className="bg-zinc-900">You Vs Friend</option>
            </select>
          </div>

          {gameMode === 'you_vs_robot' && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-500">Side:</span>
              {(['white', 'black'] as const).map((color) => (
                <label key={color} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="side"
                    checked={playerColor === color}
                    onChange={() => {
                      setPlayerColor(color);
                      void startNewGame();
                    }}
                    className="accent-white"
                  />
                  <span className={`text-sm font-medium ${playerColor === color ? 'text-white' : 'text-zinc-500'}`}>
                    {color === 'white' ? 'White' : 'Black'}
                  </span>
                </label>
              ))}
            </div>
          )}

          <button
            onClick={() => void startNewGame()}
            className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <RefreshCcw size={13} />
            Restart Game
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!('speechSynthesis' in window)) {
                setToastMessage('Coach voice is not supported in this browser.');
                return;
              }

              const nextEnabled = !coachVoiceEnabled;
              setCoachVoiceEnabled(nextEnabled);

              if (!nextEnabled) {
                window.speechSynthesis.cancel();
                lastSpokenMessageRef.current = '';
              }
            }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              coachVoiceEnabled
                ? 'border-cyan-700/60 bg-cyan-900/50 text-cyan-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${coachVoiceEnabled ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
            Coach Voice: {coachVoiceEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => {
              setLearnerMode(!learnerMode);
              if (learnerMode) setSquareSuggestions([]);
            }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              learnerMode
                ? 'border-emerald-700/60 bg-emerald-900/50 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-500'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${learnerMode ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            Learner Mode: {learnerMode ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => void handleUndoBadMove()}
            className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-zinc-700"
          >
            <RefreshCcw size={12} />
            Undo Move
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden" style={{ background: '#1a1a1a' }}>
        <div className="flex h-full items-stretch" style={{ maxHeight: 'calc(100vh - 44px)' }}>
          <div
            className="relative flex-shrink-0"
            style={{
              width: 'min(calc(100vh - 44px - 8px), calc(100vw - 380px - 8px))',
              height: 'min(calc(100vh - 44px - 8px), calc(100vw - 380px - 8px))',
            }}
          >
            {isRobotThinking && (
              <div className="absolute top-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-700 bg-black/80 px-3 py-1 text-xs text-zinc-400 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                Robot is thinking...
              </div>
            )}

            <ChessBoardArea
              fen={fen}
              onMoveAttempt={handleMoveAttempt}
              onPieceSelect={handlePieceSelect}
              orientation={playerColor}
              customArrows={boardArrows}
              isPlayerTurn={isPlayerTurn}
              badMoveSquare={badMoveSquare}
              overlay={
                <CoachOverlay
                  visible={overlayVisible}
                  isThinking={isThinking}
                  coachMessage={coachMessage}
                  classification={classification}
                  threat={threat}
                  alternatives={alternatives}
                  fen={fen}
                  moveCount={history.filter((_, i) => (playerColor === 'white' ? i % 2 === 0 : i % 2 === 1)).length + 1}
                  onCommitWarning={handleCommitWarning}
                  onDismissWarning={handleDismissWarning}
                  onPlayAlternative={(moveIdentifier) => {
                    try {
                      const chess = new Chess(fen);
                      const parsedMove = chess.move(moveIdentifier);
                      if (parsedMove) {
                        void handlePlayAlternative(parsedMove.from + parsedMove.to + (parsedMove.promotion || ''));
                        return;
                      }
                    } catch {}
                    void handlePlayAlternative(moveIdentifier);
                  }}
                  onAskHint={handleAskHint}
                />
              }
            />
          </div>

          <div
            className="flex flex-shrink-0 flex-col overflow-hidden border-l border-zinc-800/60"
            style={{ width: '420px', background: '#0f0f12' }}
          >
            <MoveLog history={history} playerColor={playerColor} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
