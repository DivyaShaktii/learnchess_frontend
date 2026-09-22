'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { AlertCircle, X, RefreshCcw, LogIn, Palette, Flame, Check, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { ChessBoardArea } from './ChessBoardArea';
import { CoachOverlay } from './CoachOverlay';
import { MoveLog } from './MoveLog';
import AuthForm from './AuthForm';
import { useSession, isAdultFromBirthYear } from '../utils/useSession';
import { RoastAgeGateModal } from './RoastAgeGateModal';
import { supabase } from '../utils/supabaseClient';
import { roastForMove, RoastContext } from '../utils/roastContext';
import { speakCoachMessage, dispatchSubtitle, getCoachVolume, setCoachVolume, stopCoachAudio, prepareCoachVoice } from '../utils/soundEffects';
import { PaymentOverlay } from './PaymentOverlay';
import { TrialTimer } from './TrialTimer';
import { ProfileDropdown } from './ProfileDropdown';
import { StatisticsModal } from './StatisticsModal';
import { AvatarImg } from '../utils/avatarUtils';
import { BoardThemeSelector, BOARD_THEMES } from './BoardThemeSelector';
import { api } from '../services/api';
import type { MoveAlternative, ThreatPreview } from '../services/api';
import { getMoveSquares } from '../utils/chessTranslator';
import { chessSounds } from '../utils/soundEffects';
import { 
  speakMoveCategory, 
  speakRatingAnnouncement, 
  speakPuzzleStartAnnouncement, 
  speakRefutationWarning, 
  speakGameWon, 
  speakDynamicRefutation,
  speakRoastMoveCategory,
  speakRoastPreMoveWarning,
  speakRoastUndo,
  speakRoastGameOver,
  speakRoastSlowPlay
} from '../utils/coachVoice';

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
    <div role="alert" aria-live="assertive" className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded border border-red-800 bg-red-950 px-4 py-3 text-red-200 shadow-lg animate-in fade-in slide-in-from-top-4">
      <AlertCircle size={18} className="shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button aria-label="Dismiss notification" onClick={onClose} className="ml-2 min-h-11 min-w-11 rounded p-1 transition-colors hover:bg-red-900">
        <X size={14} />
      </button>
    </div>
  );
}

export type GameMode = 'you_vs_robot' | 'puzzle_mode';
type CoachMode = 'off' | 'normal' | 'professional' | 'roast';

type MoveHistoryEntry = {
  san: string;
  classification: string;
  fen_before?: string;
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const ratingTier = (r: number) =>
  r < 1500 ? 'Beginner' : r < 1900 ? 'Club Player' : r < 2300 ? 'Strong Club Player' :
  r < 2600 ? 'Expert' : r < 2900 ? 'Master' : 'Near-Maximum (very hard)';

function App() {
  const { session, isPremium, profile, loading: sessionLoading, error: sessionError, fetchPremiumStatus, logout, mergeProfile } = useSession();
  const [gameMode, setGameMode] = useState<GameMode>('you_vs_robot');
  const [puzzleLevel, setPuzzleLevel] = useState(1);
  const [puzzleSessionId, setPuzzleSessionId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [learnerMode, setLearnerMode] = useState(true);
  const [coachVoiceEnabled, setCoachVoiceEnabled] = useState(true);
  const [coachVolume, setCoachVolumeState] = useState(0.8);
  const [gameId, setGameId] = useState<string | null>(null);
  const [opponentRating, setOpponentRating] = useState(1500);
  const [fen, setFen] = useState(START_FEN);
  const [initialFen, setInitialFen] = useState(START_FEN);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);
  const [coachSubtitleText, setCoachSubtitleText] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRobotThinking, setIsRobotThinking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Board theme state, initialize from localStorage or default to 'obsidian' (matches original colors)
  const [boardThemeId, setBoardThemeId] = useState<string>('obsidian');

  const [showPaywallModal, setShowPaywallModal] = useState(false);
  
  useEffect(() => {
    if (isPremium && showPaywallModal) {
      setShowPaywallModal(false);
    }
  }, [isPremium, showPaywallModal]);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [newRegisteredUserId, setNewRegisteredUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isCoachMenuOpen, setIsCoachMenuOpen] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [pendingMoveUci, setPendingMoveUci] = useState<string | null>(null);
  const [pendingFen, setPendingFen] = useState<string | null>(null);
  const [badMoveSquare, setBadMoveSquare] = useState<string | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [puzzleHintSquare, setPuzzleHintSquare] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | undefined>();
  const [_coachMessage, setCoachMessage] = useState('');
  const [threat, setThreat] = useState<ThreatPreview | null>(null);
  const [alternatives, setAlternatives] = useState<MoveAlternative[]>([]);
  const [refutationSequence, setRefutationSequence] = useState<string[]>([]);
  const [squareSuggestions, setSquareSuggestions] = useState<MoveAlternative[]>([]);
  const [followUpArrows, setFollowUpArrows] = useState<[string, string, string][]>([]);
  const [opponentThreatSquare, setOpponentThreatSquare] = useState<string | null>(null);

  // Roast Mode (18+) State
  const [isRoastMode, setIsRoastMode] = useState<boolean>(false);
  const roastEnabledRef = useRef(false);
  roastEnabledRef.current = isRoastMode;
  const [currentRoastWarning, setCurrentRoastWarning] = useState<string>('');

  const [showRoastGate, setShowRoastGate] = useState(false);
  const moveRoastContext = useRef<RoastContext | null>(null);
  const coachMenuRef = useRef<HTMLDivElement>(null);
  const previousFenRef = useRef(START_FEN);
  const gameGenerationRef = useRef(0);
  const followUpGenerationRef = useRef(0);
  const lastSpokenMessageRef = useRef('');
  const hasSpokenInitialGreeting = useRef(false);
  const hasSpokenBookMoveRef = useRef(false);
  const roastConsentKey = session?.user?.id ? `chess_roast_mode_verified_18_${session.user.id}` : null;
  useEffect(() => {
    setIsRoastMode(false);
    setShowRoastGate(false);
    setCurrentRoastWarning('');
    dispatchSubtitle('');
    stopCoachAudio();
    if (roastConsentKey && isAdultFromBirthYear(profile?.birth_year)) {
      try { setIsRoastMode(localStorage.getItem(roastConsentKey) === 'true'); } catch {}
    }
  }, [roastConsentKey, profile?.birth_year]);

  const coachMode: CoachMode = isRoastMode
    ? 'roast'
    : !coachVoiceEnabled
      ? 'off'
      : learnerMode
        ? 'normal'
        : 'professional';

  const selectCoachMode = (mode: CoachMode) => {
    setIsCoachMenuOpen(false);

    if (mode === 'roast') {
      if (isRoastMode) return;
      if (!session) {
        setToastMessage('Sign in before enabling adult commentary.');
        setShowPaywallModal(true);
        return;
      }
      if (profile?.birth_year && !isAdultFromBirthYear(profile.birth_year)) {
        setToastMessage('Roast Mode is restricted to adults aged 18 or older.');
        return;
      }
      setShowRoastGate(true);
      return;
    }

    setIsRoastMode(false);
    setCurrentRoastWarning('');
    if (roastConsentKey) localStorage.removeItem(roastConsentKey);
    localStorage.setItem('coach-mode', mode);
    localStorage.setItem('coach-voice-enabled', String(mode !== 'off'));

    if (mode === 'off') {
      setCoachVoiceEnabled(false);
      setLearnerMode(false);
      setSquareSuggestions([]);
      resetWarningState();
      stopCoachAudio();
      return;
    }

    setCoachVoiceEnabled(true);
    setLearnerMode(mode === 'normal');
    if (mode === 'professional') {
      setSquareSuggestions([]);
      resetWarningState();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCoachVolumeState(getCoachVolume());
    const prepareTimer = window.setTimeout(() => prepareCoachVoice(), 500);
    const savedMode = window.localStorage.getItem('coach-mode') as CoachMode | null;
    const savedPreference = window.localStorage.getItem('coach-voice-enabled');
    if (savedMode === 'off' || savedPreference === 'false') {
      setCoachVoiceEnabled(false);
      setLearnerMode(false);
    } else if (savedMode === 'professional') {
      setCoachVoiceEnabled(true);
      setLearnerMode(false);
    } else {
      setCoachVoiceEnabled(true);
      setLearnerMode(true);
    }
    return () => {
      window.clearTimeout(prepareTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSubtitle = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      setCoachSubtitleText(customEvent.detail.text);
    };
    const handleAudioError = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      setToastMessage(customEvent.detail.message);
    };
    window.addEventListener('coach-subtitle', handleSubtitle);
    window.addEventListener('coach-audio-error', handleAudioError);
    return () => {
      window.removeEventListener('coach-subtitle', handleSubtitle);
      window.removeEventListener('coach-audio-error', handleAudioError);
      stopCoachAudio();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('coach-voice-enabled', String(coachVoiceEnabled));
    if (!isRoastMode) {
      window.localStorage.setItem('coach-mode', !coachVoiceEnabled ? 'off' : learnerMode ? 'normal' : 'professional');
    }
  }, [coachVoiceEnabled, learnerMode, isRoastMode]);

  useEffect(() => {
    if (!isCoachMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!coachMenuRef.current?.contains(event.target as Node)) {
        setIsCoachMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCoachMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCoachMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('board-theme');
    if (savedTheme && BOARD_THEMES.some(t => t.id === savedTheme)) {
      setBoardThemeId(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('board-theme', boardThemeId);
  }, [boardThemeId]);

  // Automatically save move history to the backend for the terminal video generator
  useEffect(() => {
    if (history.length > 0) {
      const moveList = history.map(h => h.san);
      fetch('/api/save-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveList, initialFen })
      }).catch(err => console.error('Failed to save move history:', err));
    }
  }, [history, initialFen]);

  useEffect(() => {
    if (!coachVoiceEnabled) stopCoachAudio();
  }, [coachVoiceEnabled]);

  // Use refs to avoid stale closures if react-chessboard memoizes the onPieceDrop callback
  const stateRef = useRef({ history, session, isPremium });
  useEffect(() => {
    stateRef.current = { history, session, isPremium };
  }, [history, session, isPremium]);

  const isPlayerTurn = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return false;

      const isWhiteTurn = chess.turn() === 'w';
      let turn = false;

      if (gameMode === 'you_vs_robot') {
        turn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      } else if (gameMode === 'puzzle_mode') {
        turn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      }

      return turn && !isRobotThinking;
    } catch {
      return false;
    }
  }, [fen, gameMode, playerColor, isRobotThinking]);

  useEffect(() => {
    if (!isRoastMode || !isPlayerTurn || isThinking || isRobotThinking || warningActive || showPaywallModal || showRoastGate || gameMode !== 'you_vs_robot') return;
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible' && !window.speechSynthesis?.speaking) speakRoastSlowPlay(coachVoiceEnabled);
    }, 25000);
    return () => clearTimeout(timer);
  }, [fen, isRoastMode, isPlayerTurn, isThinking, isRobotThinking, warningActive, showPaywallModal, showRoastGate, gameMode, coachVoiceEnabled]);

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const generation = ++gameGenerationRef.current;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const tryStart = async (attemptsLeft: number) => {
      setIsConnecting(true);
      let willRetry = false;
      try {
        if (session && session.user && gameMode === 'you_vs_robot') {
          // Attempt to resume
          try {
            const res = await api.resumeGame(session.user.id);
            if (!cancelled && generation === gameGenerationRef.current) {
              setGameId(res.game_id);
              setFen(res.fen);
              setInitialFen(START_FEN); // Could be extracted if we saved it, but START_FEN is fine
              setHistory(res.move_history);
              resetWarningState();
              previousFenRef.current = res.fen;
              setToastMessage('Game Resumed');
              setPuzzleSessionId(null);
            }
            return;
          } catch (e) {
             // Fall through to startNewGame if no active game found
          }
        }

        if (gameMode === 'puzzle_mode') {
          const res = await api.startPuzzle(puzzleLevel);
          if (!cancelled && generation === gameGenerationRef.current) {
            setPuzzleSessionId(res.session_id);
            setFen(res.fen);
            setInitialFen(res.fen);
            setPlayerColor(res.side_to_move as 'white' | 'black');
            setHistory([]);
            resetWarningState();
            setPuzzleHintSquare(res.first_move_source || null);
            previousFenRef.current = res.fen;
            setToastMessage(null);
            setGameId(null);
          }
        } else {
          const res = await api.startNewGame(undefined, opponentRating, session?.user?.id);
          if (!cancelled && generation === gameGenerationRef.current) {
            setGameId(res.game_id);
            setFen(res.fen);
            setInitialFen(res.fen);
            setHistory([]);
            resetWarningState();
            previousFenRef.current = res.fen;
            setToastMessage(null);
            setPuzzleSessionId(null);
            if (!hasSpokenInitialGreeting.current) {
              speakRatingAnnouncement(opponentRating, ratingTier(opponentRating), coachVoiceEnabled);
              hasSpokenInitialGreeting.current = true;
            }
          }
        }
      } catch (err) {
        if (!cancelled && generation === gameGenerationRef.current && attemptsLeft > 1) {
          // Backend might still be warming up — retry after 2 s
          willRetry = true;
          retryTimer = setTimeout(() => { if (!cancelled && generation === gameGenerationRef.current) void tryStart(attemptsLeft - 1); }, 2000);
          return;
        }
        if (!cancelled && generation === gameGenerationRef.current) {
          setToastMessage('Coach is unreachable — check the backend is running');
        }
      } finally {
        if (!cancelled && generation === gameGenerationRef.current && !willRetry) setIsConnecting(false);
      }
    };
    if (!sessionLoading) {
      void tryStart(3);
    }
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, session]);


  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gameId || warningActive || isThinking || isRobotThinking) return;

    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return;

      const isWhiteTurn = chess.turn() === 'w';
      const shouldRobotMove = gameMode === 'you_vs_robot' && (playerColor === 'white' ? !isWhiteTurn : isWhiteTurn);

      if (shouldRobotMove) {
        const timer = setTimeout(() => {
          void playRobotMove();
        }, 150);

        return () => clearTimeout(timer);
      }
    } catch {}
  }, [fen, gameMode, playerColor, gameId, warningActive, isThinking, isRobotThinking]);

  const handleError = (err: any) => {
    console.error(err);
    if (err?.status === 404) {
      // Game session lost on backend — restart silently, no recursive error handling
      setToastMessage('Session lost. Starting a new game...');
      void startNewGame();
    } else if (err?.name === 'ApiError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      setToastMessage('Coach is unreachable — check the backend is running');
    }
  };

  const startNewGame = async (overrideMode?: GameMode) => {
    const generation = ++gameGenerationRef.current;
    followUpGenerationRef.current += 1;
    stopCoachAudio();
    try {
      setIsThinking(false);
      setSquareSuggestions([]);
      lastSpokenMessageRef.current = '';
      hasSpokenInitialGreeting.current = false;
      hasSpokenBookMoveRef.current = false;
      resetWarningState();

      const activeMode = overrideMode || gameMode;

      if (activeMode === 'puzzle_mode') {
        const res = await api.startPuzzle(puzzleLevel);
        if (generation !== gameGenerationRef.current) return;
        setPuzzleSessionId(res.session_id);
        setFen(res.fen);
        setPlayerColor(res.side_to_move as 'white' | 'black');
        setHistory([]);
        setPuzzleHintSquare(res.first_move_source || null);
        previousFenRef.current = res.fen;
        setToastMessage(null);
        setGameId(null);
        speakPuzzleStartAnnouncement(res.side_to_move, coachVoiceEnabled);
      } else {
        const res = await api.startNewGame(undefined, opponentRating, session?.user?.id);
        if (generation !== gameGenerationRef.current) return;
        setGameId(res.game_id);
        setFen(res.fen);
        setHistory([]);
        previousFenRef.current = res.fen;
        setToastMessage(null);
        setPuzzleSessionId(null);
        setPuzzleHintSquare(null);
        speakRatingAnnouncement(opponentRating, ratingTier(opponentRating), coachVoiceEnabled);
      }
    } catch (err) {
      if (generation === gameGenerationRef.current) handleError(err);
    }
  };

  const resetWarningState = () => {
    followUpGenerationRef.current += 1;
    setOverlayVisible(false);
    setWarningActive(false);
    setPendingMoveUci(null);
    setPendingFen(null);
    setBadMoveSquare(null);
    setHintSquare(null);
    setFollowUpArrows([]);
    setRefutationSequence([]);
    setOpponentThreatSquare(null);
    setClassification(undefined);
    setThreat(null);
    setAlternatives([]);
    setCurrentRoastWarning('');
    lastSpokenMessageRef.current = '';
  };

  const handleUndoBadMove = async () => {
    if (!gameId || isRobotThinking) return;

    if (warningActive) {
      handleDismissWarning();
      return;
    }

    try {
      const plies = 2;
      const res = await api.undoMove(gameId, plies);
      setFen(res.fen);
      previousFenRef.current = res.fen;
      setHistory(res.move_history);
      resetWarningState();
      setCoachMessage('Move undone. Choose your next move!');
      if (isRoastMode) {
        speakRoastUndo(coachVoiceEnabled);
      }
    } catch {
      if (previousFenRef.current) {
        setFen(previousFenRef.current);
      }
      resetWarningState();
    }
  };

  const handleInteractionAttempt = () => {
    if (!session) {
      if (trialExpired) {
        setShowPaywallModal(true);
        return false;
      }
      if (!trialStarted) {
        setTrialStarted(true);
      }
    }
    
    return true;
  };

  const handleMoveAttempt = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (!handleInteractionAttempt()) return false;

    if (isThinking || isRobotThinking) return false;
    if (!gameId && !puzzleSessionId) return false;

    const chess = new Chess(fen);
    let move;

    try {
      move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece && piece.length >= 2 ? piece[1].toLowerCase() : 'q',
      });
    } catch {
      return false;
    }

    if (!move) return false;

    const moveUci = move.from + move.to + (move.promotion || '');
    const nextFen = chess.fen();

    if (gameMode === 'puzzle_mode' && puzzleSessionId) {
       void (async () => {
         const operationGeneration = gameGenerationRef.current;
         try {
           setIsThinking(true);
           setOverlayVisible(false);
           setWarningActive(false);
           setPuzzleHintSquare(null);

           const res = await api.attemptPuzzle(puzzleSessionId, moveUci);
           if (operationGeneration !== gameGenerationRef.current) return;
           if (!res.correct) {
              setToastMessage('Incorrect move. Try again!');
           } else {
              setFen(nextFen); 
              playMoveSoundForUci(fen, moveUci);
              previousFenRef.current = nextFen;
              
              // Add player move to history
              setHistory(prev => [...prev, { san: move.san, classification: 'Best Move' }]);
              
              if (res.opponent_reply_uci) {
                 setTimeout(() => {
                    if (operationGeneration !== gameGenerationRef.current) return;
                    const opponentChess = new Chess(nextFen);
                    const oppMove = opponentChess.move(res.opponent_reply_uci);
                    
                    setFen(res.fen);
                    previousFenRef.current = res.fen;
                    
                    if (oppMove) {
                      setHistory(prev => [...prev, { san: oppMove.san, classification: 'Move' }]);
                    }
                    
                    playMoveSoundForUci(nextFen, res.opponent_reply_uci!);
                 }, 400);
              } else if (res.solved) {
                 setToastMessage('🎉 Puzzle Solved!');
                 speakGameWon(coachVoiceEnabled);
              }
           }
         } catch (err) {
           if (operationGeneration === gameGenerationRef.current) handleError(err);
         } finally {
           if (operationGeneration === gameGenerationRef.current) setIsThinking(false);
         }
       })();
       return true;
    }

    void (async () => {
      const operationGeneration = gameGenerationRef.current;
      try {
        setOverlayVisible(false);
        setWarningActive(false);
        setIsThinking(true);
        setSquareSuggestions([]);
        setHintSquare(null);
        setFollowUpArrows([]);

        const preRes = await api.precheckMove(gameId!, moveUci);
        if (operationGeneration !== gameGenerationRef.current) return;

        moveRoastContext.current = {
          fen, move: moveUci, label: preRes.label,
          cpLoss: preRes.cp_loss ?? undefined, bestMove: preRes.best_move_uci,
          reply: preRes.threat_preview?.opponent_best_reply,
          recentMoves: history.map(item => item.san),
        };
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
        setRefutationSequence(preRes.refutation_sequence ?? []);

        // A backend warning must always produce the decision popup while the
        // coach is enabled. Professional mode changes tone, not move safety.
        const shouldInterrupt = coachMode !== 'off' && Boolean(preRes.should_warn || preRes.is_box_tier);

        if (shouldInterrupt) {
          if (roastEnabledRef.current) {
            const roastText = speakRoastPreMoveWarning(coachVoiceEnabled);
            setCurrentRoastWarning(roastText);
          } else {
            speakMoveCategory(preRes.label, coachVoiceEnabled, preRes.explanation);
          }
          setBadMoveSquare(move.to);
          setWarningActive(true);
          setOverlayVisible(true);
          setIsThinking(false);
          return;
        }

        setBadMoveSquare(null);
        setOverlayVisible(false);
        // Keep isThinking=true — commitAndFinalize's finally block clears it.
        // This prevents the robot from firing before the player's move is committed.
        await commitAndFinalize(moveUci);
      } catch (error) {
        if (operationGeneration !== gameGenerationRef.current) return;
        console.error('Error in handleMoveAttempt:', error);
        setIsThinking(false);
        setOverlayVisible(false);
        setWarningActive(false);
        handleError(error);
      }
    })();

    return true;
  };

  const handleCommitWarning = async () => {
    if (pendingMoveUci && gameId) {
      const operationGeneration = gameGenerationRef.current;
      setIsThinking(true);
      const moveUci = pendingMoveUci;
      const targetFen = pendingFen;
      resetWarningState();
      try {
        // Play sound now with the original pre-move fen (before setFen updates state)
        if (targetFen) setFen(targetFen);
        await commitAndFinalize(moveUci, !isRoastMode);
      } catch (err) {
        if (operationGeneration === gameGenerationRef.current) handleError(err);
      } finally {
        if (operationGeneration === gameGenerationRef.current) setIsThinking(false);
      }
    }
  };

  const playMoveSoundForUci = (boardFen: string, moveUci: string) => {
    try {
      const chess = new Chess(boardFen);
      const moveObj = chess.move(moveUci);
      if (moveObj && (moveObj.captured || moveObj.flags.includes('c') || moveObj.flags.includes('e'))) {
        chessSounds.playCapture();
      } else {
        chessSounds.playMove();
      }
    } catch {
      chessSounds.playMove();
    }
  };

  const commitAndFinalize = async (moveUci: string, skipVoice: boolean = false) => {
    if (!gameId) return;
    const operationGeneration = gameGenerationRef.current;
    const activeGameId = gameId;

    try {
      const commitRes = await api.commitMove(activeGameId, moveUci);
      if (operationGeneration !== gameGenerationRef.current) return;
      const fenBeforeMove = previousFenRef.current;
      playMoveSoundForUci(fenBeforeMove, moveUci);
      setFen(commitRes.fen);
      previousFenRef.current = commitRes.fen;
      setHistory((current) => [...current, { san: commitRes.san, classification: commitRes.classification, fen_before: fenBeforeMove }]);

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
      if (!skipVoice) {
        if (roastEnabledRef.current) {
          const context = moveRoastContext.current;
          if (context?.move === moveUci) speakCoachMessage(roastForMove({ ...context, label: cleanLabel }), undefined, coachVoiceEnabled);
          else speakRoastMoveCategory(cleanLabel, undefined, false, coachVoiceEnabled);
        } else {
          if (cleanLabel !== 'Book' || !hasSpokenBookMoveRef.current) {
            speakMoveCategory(cleanLabel, coachVoiceEnabled);
            if (cleanLabel === 'Book') hasSpokenBookMoveRef.current = true;
          }
        }
      }

      setOverlayVisible(false);
      setPendingMoveUci(null);
      setPendingFen(null);
      setWarningActive(false);

      if (commitRes.is_game_over) {
        const chess = new Chess(commitRes.fen);
        let msg = '🏁 Game Over!';
        if (chess.isCheckmate()) {
          const winner = chess.turn() === 'w' ? 'Black' : 'White';
          msg = `🏆 Checkmate! ${winner} wins the game!`;
          if (winner.toLowerCase() === playerColor) {
            if (isRoastMode) {
              speakRoastGameOver('player_wins', coachVoiceEnabled);
            } else {
              speakGameWon(coachVoiceEnabled);
            }
          } else {
            if (isRoastMode) {
              speakRoastGameOver('robot_wins', coachVoiceEnabled);
            }
          }
        } else if (chess.isDraw()) {
          msg = '🤝 Game Over! The game ended in a draw.';
          if (isRoastMode) {
            speakRoastGameOver(chess.isStalemate() ? 'stalemate' : 'draw', coachVoiceEnabled);
          }
        }
        setCoachMessage(msg);
        setOverlayVisible(true);
      }
    } catch (err) {
      if (operationGeneration === gameGenerationRef.current) handleError(err);
    } finally {
      if (operationGeneration === gameGenerationRef.current) setIsThinking(false);
    }
  };

  const executeCommit = useCallback(async (moveUci: string, preMovefen?: string) => {
    if (!gameId) return;
    const operationGeneration = gameGenerationRef.current;
    const activeGameId = gameId;

    try {
      const commitRes = await api.commitMove(activeGameId, moveUci);
      if (operationGeneration !== gameGenerationRef.current) return;
      const fenBeforeMove = preMovefen ?? fen;
      playMoveSoundForUci(fenBeforeMove, moveUci);
      setFen(commitRes.fen);
      previousFenRef.current = commitRes.fen;
      setHistory((current) => [...current, { san: commitRes.san, classification: commitRes.classification, fen_before: fenBeforeMove }]);
      resetWarningState();

      if (commitRes.is_game_over) {
        const chess = new Chess(commitRes.fen);
        let msg = '🏁 Game Over!';
        if (chess.isCheckmate()) {
          const winner = chess.turn() === 'w' ? 'Black' : 'White';
          msg = `🏆 Checkmate! ${winner} wins the game!`;
          if (winner.toLowerCase() === playerColor) {
            if (isRoastMode) {
              speakRoastGameOver('player_wins', coachVoiceEnabled);
            } else {
              speakGameWon(coachVoiceEnabled);
            }
          } else {
            if (isRoastMode) {
              speakRoastGameOver('robot_wins', coachVoiceEnabled);
            }
          }
        } else if (chess.isDraw()) {
          msg = '🤝 Game Over! The game ended in a draw.';
          if (isRoastMode) {
            speakRoastGameOver(chess.isStalemate() ? 'stalemate' : 'draw', coachVoiceEnabled);
          }
        }
        setCoachMessage(msg);
        setOverlayVisible(true);
      }
    } catch (err) {
      if (operationGeneration === gameGenerationRef.current) handleError(err);
    }
  }, [gameId, fen, isRoastMode, playerColor, coachVoiceEnabled]);

  const playRobotMove = useCallback(async () => {
    if (!gameId) return;
    const operationGeneration = gameGenerationRef.current;

    setIsRobotThinking(true);
    try {
      const currentFen = fen;
      const res = await api.getRobotMove(gameId);
      if (operationGeneration !== gameGenerationRef.current) return;
      if (res.moves && res.moves.length > 0) {
        const moveUci = res.moves[0].move;
        if (moveUci) {
          await executeCommit(moveUci, currentFen);
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      if (operationGeneration === gameGenerationRef.current) setIsRobotThinking(false);
    }
  }, [executeCommit, gameId, fen]);

  const handleDismissWarning = () => {
    setFen(previousFenRef.current);
    resetWarningState();
    setCoachMessage('Good call. Find a better move!');
    if (isRoastMode) {
      speakRoastUndo(coachVoiceEnabled);
    }
  };



  const handleAskHint = () => {
    const bestMove = alternatives?.[0]?.move;
    if (bestMove) {
      setHintSquare(bestMove.slice(0, 2));
    }
  };

  const handleShowFollowUp = async () => {
    if (!pendingMoveUci || refutationSequence.length === 0) return;
    const followUpGeneration = ++followUpGenerationRef.current;
    const gameGeneration = gameGenerationRef.current;
    const isCurrent = () => followUpGeneration === followUpGenerationRef.current && gameGeneration === gameGenerationRef.current;

    // Start with the position before the bad move
    const chess = new Chess(previousFenRef.current);
    
    // 1. Play the bad move, highlight it in red
    try {
      const playerMove = chess.move(pendingMoveUci);
      setFen(chess.fen());
      setBadMoveSquare(playerMove.to); // Highlight player's piece in red
      playMoveSoundForUci(previousFenRef.current, pendingMoveUci);

      speakDynamicRefutation(refutationSequence, chess.fen(), coachVoiceEnabled);
    } catch {
      return;
    }

    // 2. Play the opponent's refutation sequence (limit to 3 moves)
    const sequence = refutationSequence.slice(0, 3);
    for (let i = 0; i < sequence.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!isCurrent()) return;
      try {
        const uci = sequence[i];
        const moveFen = chess.fen();
        const move = chess.move(uci);
        setFen(chess.fen());
        playMoveSoundForUci(moveFen, uci);
        
        // Highlight opponent's threat in blue (only on the opponent's turn)
        if (i % 2 === 0) {
          setOpponentThreatSquare(move.to);
        } else {
          setOpponentThreatSquare(null);
        }
      } catch {
        break;
      }
    }

    // Wait a bit, then snap back
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (!isCurrent()) return;
    setFen(previousFenRef.current);
    setBadMoveSquare(null);
    setOpponentThreatSquare(null);
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

  const handleIllegalMove = (reason: 'pinned' | 'not_your_turn' | 'blocked') => {
    if (reason === 'not_your_turn') {
      try {
        const chess = new Chess(fen);
        if (chess.isGameOver()) {
          if (chess.isCheckmate()) {
            const winner = chess.turn() === 'w' ? 'Black' : 'White';
            setToastMessage(`🏆 Game Over! Checkmate — ${winner} wins.`);
          } else if (chess.isDraw()) {
            setToastMessage('🤝 Game Over! The game ended in a draw.');
          } else {
            setToastMessage('🏁 Game Over!');
          }
          return;
        }
      } catch {}

      if (isRobotThinking) {
        setToastMessage('🤖 Wait — the robot is currently taking its turn.');
      } else if (isThinking) {
        setToastMessage('⏳ Analysing your move...');
      } else {
        setToastMessage("It's not your turn right now.");
      }
      return;
    }

    // Pinned/blocked: show a brief toast only — do NOT open the blunder overlay
    if (reason === 'pinned') {
      setToastMessage('🔒 That piece is pinned — moving it would expose your king!');
    } else {
      setToastMessage('That square is not a legal destination for this piece.');
    }
  };

  useEffect(() => {
    if (!warningActive) {
      previousFenRef.current = fen;
    }
  }, [fen, warningActive]);

  const boardArrows = useMemo<[string, string, string][]>(() => {
    // 1. Follow-up arrows requested by user via "Show Follow Up Moves" button (ALWAYS visible when pressed)
    if (followUpArrows.length > 0) return followUpArrows;

    // If Learner Mode is OFF, suppress all automatic arrows.
    // Arrows will only appear when the user explicitly clicks "Show Follow Up Moves".
    if (!learnerMode) return [];

    // 2. Warning threat/alternative arrows (shown automatically ONLY when Learner Mode is ON)
    if (warningActive) {
      const arrows: [string, string, string][] = [];
      if (threat?.opponent_best_reply_san) {
        const sq = getMoveSquares(fen, threat.opponent_best_reply_san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(239, 68, 68, 0.85)']);
      }

      alternatives.forEach((alt) => {
        // Never show a green arrow for the player's attempted bad move
        if (pendingMoveUci && alt.move === pendingMoveUci) return;
        // Strictly only show green arrows for verified safe moves (cp_loss <= 40)
        if (alt.cp_loss !== undefined && alt.cp_loss !== null && alt.cp_loss > 40) return;
        const sq = getMoveSquares(fen, alt.san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(34, 197, 94, 0.85)']);
      });
      return arrows;
    }

    // 3. Piece selection hint arrows (shown ONLY when Learner Mode is ON)
    const arrows: [string, string, string][] = [];
    if (squareSuggestions.length > 0) {
      squareSuggestions.forEach((alt, idx) => {
        // Strictly only show green arrows for verified safe moves (cp_loss <= 40)
        if (alt.cp_loss !== undefined && alt.cp_loss !== null && alt.cp_loss > 40) return;
        const sq = getMoveSquares(fen, alt.san);
        if (sq) {
          const alpha = [0.95, 0.75, 0.55][idx] ?? 0.4;
          arrows.push([sq.from, sq.to, `rgba(34, 197, 94, ${alpha})`]);
        }
      });
    }

    return arrows;
  }, [followUpArrows, warningActive, learnerMode, squareSuggestions, threat, alternatives, fen]);

  if (sessionLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-white">Loading...</div>;
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden text-zinc-100"
      style={{ background: '#1a1a1a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-[#111] px-2 py-2 shrink-0 lg:h-14 lg:flex-nowrap lg:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3 lg:ml-4">
          <div className="flex items-center gap-2">
            <select
              aria-label="Game mode"
              value={gameMode}
              onChange={(e) => {
                const newMode = e.target.value as GameMode;
                setGameMode(newMode);
                void startNewGame(newMode);
              }}
              className="min-h-11 cursor-pointer bg-transparent text-sm font-bold text-zinc-100 outline-none lg:min-h-0"
              style={{ appearance: 'auto' }}
            >
              <option value="you_vs_robot" className="bg-zinc-900">You Vs Robot</option>
              <option value="puzzle_mode" className="bg-zinc-900">Puzzle Mode</option>
            </select>
          </div>

          {gameMode === 'you_vs_robot' && (
            <div className="flex items-center gap-2 text-sm border-l border-zinc-800 pl-4">
              <span className="text-zinc-500">Side:</span>
              <button
                onClick={() => {
                  setPlayerColor(playerColor === 'white' ? 'black' : 'white');
                  // We need to wait a tick for state to update before starting new game
                  setTimeout(() => {
                    void startNewGame();
                  }, 0);
                }}
                className="flex min-h-11 items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 hover:bg-zinc-700/50 text-white font-medium transition-colors lg:min-h-0"
                title="Click to toggle side"
              >
                <div 
                  className="w-3 h-3 rounded-full border border-zinc-600" 
                  style={{ backgroundColor: playerColor === 'white' ? '#fff' : '#222' }}
                />
                {playerColor === 'white' ? 'White' : 'Black'}
              </button>
            </div>
          )}

          <button
            onClick={() => void startNewGame()}
            className="flex min-h-11 items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200 lg:min-h-0"
          >
            <RefreshCcw size={13} />
            Restart Game
          </button>

          {gameMode === 'puzzle_mode' ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-emerald-500/40">
              <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">
                Level: <strong className="text-emerald-400">{puzzleLevel}</strong>
              </span>
              <input
                aria-label={`Puzzle difficulty level ${puzzleLevel}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={puzzleLevel}
                onChange={(e) => setPuzzleLevel(Number(e.target.value))}
                onMouseUp={() => void startNewGame()}
                onTouchEnd={() => void startNewGame()}
                className="min-h-11 w-24 cursor-pointer accent-emerald-500 lg:min-h-0"
              />
              <span className="text-xs font-medium text-zinc-500 ml-1">Playing as {playerColor}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-2 border-l border-emerald-500/40">
              <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">
                Rating: <strong className="text-emerald-400">{opponentRating}</strong> ({ratingTier(opponentRating)})
              </span>
              <input
                aria-label={`Opponent rating ${opponentRating}`}
                type="range"
                min={1320}
                max={3190}
                step={10}
                value={opponentRating}
                onChange={(e) => setOpponentRating(Number(e.target.value))}
                onMouseUp={() => void startNewGame()}
                onTouchEnd={() => void startNewGame()}
                className="min-h-11 w-24 cursor-pointer accent-emerald-500 lg:min-h-0"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div ref={coachMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsCoachMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isCoachMenuOpen}
              aria-controls="coach-mode-menu"
              className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                coachMode === 'roast'
                  ? 'border-red-700 bg-red-950/80 text-red-200 hover:bg-red-900/80'
                  : coachMode === 'off'
                    ? 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    : 'border-cyan-700/70 bg-cyan-950/70 text-cyan-200 hover:bg-cyan-900/70'
              }`}
            >
              {coachMode === 'off' ? (
                <VolumeX size={15} aria-hidden="true" />
              ) : coachMode === 'roast' ? (
                <Flame size={15} className="text-red-400" aria-hidden="true" />
              ) : (
                <Volume2 size={15} aria-hidden="true" />
              )}
              <span>Coach {coachMode === 'off' ? 'OFF' : 'ON'}</span>
              {coachMode !== 'off' && (
                <span className="text-[10px] font-medium text-current opacity-70">
                  · {coachMode === 'professional' ? 'Professional' : coachMode === 'roast' ? 'Roast' : 'Normal'}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`opacity-70 transition-transform ${isCoachMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {isCoachMenuOpen && (
              <div
                id="coach-mode-menu"
                role="menu"
                aria-label="Choose coach mode"
                className="fixed left-2 right-2 top-20 z-[100] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-zinc-950 p-2 shadow-2xl ring-1 ring-zinc-700 lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 lg:w-72"
              >
                <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Coach mode
                </p>
                {([
                  ['normal', 'Normal', 'Guided feedback with instant mistake warnings.'],
                  ['professional', 'Professional', 'Concise voice feedback with critical-move warnings.'],
                  ['roast', 'Roast · 18+', 'Unfiltered commentary with guided warnings.'],
                  ['off', 'Off', 'Disable coach voice and move warnings.'],
                ] as const).map(([mode, label, description]) => {
                  const selected = coachMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectCoachMode(mode)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 ${
                        selected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        selected ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-transparent'
                      }`}>
                        <Check size={13} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-0.5 block text-xs leading-4 text-zinc-500">{description}</span>
                      </span>
                    </button>
                  );
                })}
                <div className="mt-2 border-t border-zinc-800 px-3 pb-2 pt-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                    <label htmlFor="coach-volume">Coach volume</label>
                    <span>{Math.round(coachVolume * 100)}%</span>
                  </div>
                  <input
                    id="coach-volume"
                    aria-label={`Coach volume ${Math.round(coachVolume * 100)} percent`}
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={coachVolume}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCoachVolumeState(value);
                      setCoachVolume(value);
                    }}
                    className="min-h-11 w-full cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {gameMode === 'you_vs_robot' && (
            <button
              onClick={() => void handleUndoBadMove()}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 whitespace-nowrap shrink-0 transition-all hover:bg-zinc-700"
            >
              <RefreshCcw size={12} />
              Undo Move
            </button>
          )}

          {session ? (
            <div className="relative flex items-center gap-2">
              <button
                aria-label="Open profile menu"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-emerald-500 overflow-hidden shadow-md hover:scale-105 transition-transform shrink-0"
              >
                <AvatarImg 
                  avatarUrl={profile?.avatar_url || session?.user?.user_metadata?.avatar_url}
                  fallbackName={profile?.display_name || profile?.name || session?.user?.user_metadata?.display_name || session?.user?.email}
                  className="w-full h-full"
                  size={32}
                />
              </button>
              <ProfileDropdown 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                profile={profile} 
                session={session} 
                onOpenStats={() => setIsStatsOpen(true)}
                onSaved={(patch) => {
                  // Immediately update local profile state so name/avatar reflect without re-fetch
                  mergeProfile(patch);
                }}
                onLogout={async () => {
                  await logout();
                  window.location.reload();
                }}
                onGameSelect={async (id) => {
                  try {
                    const state = await api.getGameState(id);
                    setGameId(id);
                    setFen(state.fen);
                    setHistory(state.move_history);
                    setGameMode('you_vs_robot');
                    if (state.is_game_over) {
                      setCoachMessage(`Game over! ${state.result || ''}`);
                    } else {
                      setCoachMessage('Game resumed.');
                    }
                  } catch (err) {
                    console.error('Failed to resume game:', err);
                    setToastMessage('Failed to resume game.');
                  }
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowPaywallModal(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-600/20 px-4 py-1.5 text-xs font-semibold text-emerald-400 whitespace-nowrap shrink-0 transition-all hover:bg-emerald-600 hover:text-white"
            >
              <LogIn size={14} />
              Login / Sign Up
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-start lg:items-center justify-center overflow-y-auto overflow-x-hidden w-full h-full" style={{ background: '#1a1a1a' }}>
        <div className="flex flex-col lg:flex-row h-max lg:h-full w-full items-center justify-start lg:justify-center gap-4 p-2 pb-10 lg:pb-2 lg:max-h-[calc(100vh-44px)]">
          {/* Board Container */}
          <div className="w-full lg:w-auto flex items-center justify-center shrink-0">
            <div className="relative flex-shrink-0 flex items-center justify-center w-full max-w-[400px] lg:max-w-none lg:w-[min(calc(100vh-60px),calc(100vw-420px))] lg:h-[min(calc(100vh-60px),calc(100vw-420px))] aspect-square">
              {/* Backend connection overlay — shown when game hasn't started yet */}
              {(!gameId && !puzzleSessionId) && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded"
                  style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
                >
                  {isConnecting ? (
                    <>
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-600 border-t-cyan-400" />
                      <p className="text-sm font-semibold text-zinc-300">Connecting to coach backend...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl">⚠️</p>
                      <p className="text-sm font-semibold text-red-300">Backend unreachable</p>
                      <p className="text-xs text-zinc-500">Make sure the backend is running on port 8000</p>
                      <button
                        onClick={() => void startNewGame()}
                        className="mt-2 rounded-full bg-cyan-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-cyan-500"
                      >
                        🔄 Retry Connection
                      </button>
                    </>
                  )}
                </div>
              )}

              {(isRobotThinking || isThinking) && (
                <div
                  className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg"
                  style={{
                    background: isRobotThinking ? 'rgba(8,145,178,0.92)' : 'rgba(100,100,100,0.85)',
                    border: isRobotThinking ? '1px solid rgba(34,211,238,0.6)' : '1px solid rgba(180,180,180,0.3)',
                    color: '#fff',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isRobotThinking ? '#22d3ee' : '#9ca3af', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }}
                  />
                  {isRobotThinking ? '🤖 Robot is thinking...' : '⏳ Analysing...'}
                </div>
              )}

              <ChessBoardArea
                fen={fen}
                onMoveAttempt={handleMoveAttempt}
                onInteractionAttempt={handleInteractionAttempt}
                onIllegalMove={handleIllegalMove}
                onPieceSelect={handlePieceSelect}
                orientation={playerColor}
                customArrows={boardArrows}
                isPlayerTurn={isPlayerTurn}
                badMoveSquare={badMoveSquare}
                hintSquare={hintSquare}
                puzzleHintSquare={puzzleHintSquare}
                opponentThreatSquare={opponentThreatSquare}
                overlay={
                  <CoachOverlay
                    visible={overlayVisible}
                    isThinking={isThinking}
                    classification={classification}
                    threat={threat}
                    alternatives={alternatives}
                    fen={fen}
                    moveCount={history.filter((_, i) => (playerColor === 'white' ? i % 2 === 0 : i % 2 === 1)).length + 1}
                    onCommitWarning={handleCommitWarning}
                    onDismissWarning={handleDismissWarning}
                    onCloseOverlay={() => setOverlayVisible(false)}
                    onAskHint={handleAskHint}
                    onShowFollowUp={handleShowFollowUp}
                    isRoastMode={isRoastMode}
                    roastMessage={currentRoastWarning}
                  />
                }
                customLightSquareStyle={{ backgroundColor: BOARD_THEMES.find(t => t.id === boardThemeId)?.light }}
                customDarkSquareStyle={{ backgroundColor: BOARD_THEMES.find(t => t.id === boardThemeId)?.dark }}
              />
              <button
                aria-label="Change board theme"
                onClick={() => setIsThemeModalOpen(true)}
                className="absolute -left-12 bottom-0 p-2 rounded-full bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 shadow-lg transition-all z-40 items-center justify-center hidden lg:flex"
                title="Change Board Theme"
              >
                <Palette size={20} />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-800/60 shadow-2xl lg:min-h-[300px] lg:w-[400px] lg:h-[min(calc(100vh-60px),calc(100vw-420px))]"
            style={{ background: '#0f0f12' }}
          >
            <TrialTimer 
              isActive={!session && trialStarted} 
              onExpire={() => {
                setTrialExpired(true);
                setShowPaywallModal(true);
              }} 
            />


            {gameMode === 'puzzle_mode' ? (
              <div className="flex flex-col h-full w-full p-6 text-center justify-center">
                <h2 className="text-2xl font-bold text-emerald-400 mb-2">Puzzle Mode</h2>
                <p className="text-zinc-400 mb-8">Find the best sequence of moves!</p>
                {puzzleSessionId && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.getPuzzleHint(puzzleSessionId);
                        if (res.hint_square) {
                          setHintSquare(res.hint_square);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="mx-auto flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/50 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-800/80"
                  >
                    💡 Get Hint
                  </button>
                )}
              </div>
            ) : (
              <>
                {coachSubtitleText && (
                  <div role="status" aria-live="polite" className="p-4 animate-in slide-in-from-top-2 fade-in shrink-0 z-10">
                    <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/90 p-3 shadow-lg backdrop-blur-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                        Coach Says:
                      </p>
                      <p className="text-sm font-medium text-cyan-50">
                        "{coachSubtitleText}"
                      </p>
                    </div>
                  </div>
                )}
                <MoveLog history={history} playerColor={playerColor} />
              </>
            )}
          </div>
        </div>
      </div>

      {showRoastGate && <RoastAgeGateModal
        isOpen={showRoastGate}
        initialBirthYear={profile?.birth_year}
        onClose={() => setShowRoastGate(false)}
        onVerified={async (year) => {
          if (!roastConsentKey) return;
          const { error } = await supabase.auth.updateUser({ data: { birth_year: year } });
          if (error) throw error;
          localStorage.setItem(roastConsentKey, 'true');
          localStorage.setItem('coach-mode', 'roast');
          localStorage.setItem('coach-voice-enabled', 'true');
          mergeProfile({ birth_year: year });
          setCoachVoiceEnabled(true);
          setLearnerMode(true);
          setIsRoastMode(true);
          setShowRoastGate(false);
        }}
      />}
      {/* Auth / Paywall Modal */}
      {showPaywallModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
          {!session ? (
            <div className="w-full max-w-md">
              <AuthForm 
                onClose={() => {
                  setNewRegisteredUserId(null);
                  setShowPaywallModal(false);
                }} 
                onAuthenticated={() => setNewRegisteredUserId(null)}
              />
            </div>
          ) : (
            <div className="w-full max-w-md relative">
              <button 
                aria-label="Close account dialog"
                onClick={() => {
                  logout();
                  setNewRegisteredUserId(null);
                  setShowPaywallModal(false);
                }}
                className="absolute right-4 top-4 z-10 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              {sessionError ? <div role="alert" className="p-8 text-white">{sessionError}<button className="block mt-4 min-h-11 underline" onClick={() => void fetchPremiumStatus(session.user)}>Retry access check</button></div> : sessionLoading || isPremium === null ? <p className="p-8 text-white">Checking your account access…</p> : <PaymentOverlay
                userId={session?.user?.id || newRegisteredUserId!} 
                onSuccess={async () => {
                  if (!session?.user || !(await fetchPremiumStatus(session.user))) {
                    throw new Error('Payment verified, but access could not be refreshed.');
                  }
                  setNewRegisteredUserId(null);
                  setShowPaywallModal(false);
                }} 
                onLogout={() => {
                  logout();
                  setNewRegisteredUserId(null);
                }} 
              />}
            </div>
          )}
        </div>
      )}

      {/* Statistics Modal */}
      <StatisticsModal 
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        userId={session?.user?.id}
        currentRating={profile?.predicted_rating || 1500}
      />
      <BoardThemeSelector
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        selectedThemeId={boardThemeId}
        onSelectTheme={setBoardThemeId}
      />
    </div>
  );
}

export default App;
