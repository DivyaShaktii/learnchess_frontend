import React, { useEffect, useState, useRef } from 'react';
import { LogOut, Trophy, Activity, Calendar, Pencil, X, User, TrendingUp } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { api } from '../services/api';
import { ProfileEditModal } from './ProfileEditModal';
import { AvatarImg } from '../utils/avatarUtils';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  session: any;
  onLogout: () => void;
  onGameSelect?: (gameId: string) => void;
  onOpenStats?: () => void;
  onSaved?: (patch: { display_name?: string; avatar_url?: string }) => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  profile,
  session,
  onLogout,
  onGameSelect,
  onOpenStats,
  onSaved,
}) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      setLoading(true);
      api.getUserGames(session.user.id)
        .then((res) => {
          setGames(res.games || []);
        })
        .catch((err) => {
          console.error('Failed to fetch games', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, session]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditOpen) return;
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isEditOpen, onClose]);

  if (!isOpen) return null;

  const avatar =
    profile?.avatar_url ||
    session?.user?.user_metadata?.avatar_url ||
    null;

  const email = session?.user?.email || '';
  const fallbackName = email ? email.split('@')[0] : 'Chess Player';
  const name = profile?.display_name || profile?.name || session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.full_name || fallbackName;
  const rating = profile?.predicted_rating || 1500;

  // Filter out any untouched starting position games (where 0 moves have been made)
  const playedGames = games.filter((g) => {
    if (g.status === 'win' || g.status === 'loss' || g.status === 'draw') return true;
    if (g.move_history && g.move_history.length > 0) return true;
    if (g.fen && g.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' && g.fen !== 'start') return true;
    return false;
  });

  const totalGames = playedGames.length;

  // Win rate calculated dynamically from completed games only
  const wins = playedGames.filter((g) => g.status === 'win').length;
  const losses = playedGames.filter((g) => g.status === 'loss').length;
  const draws = playedGames.filter((g) => g.status === 'draw').length;
  const totalCompleted = wins + losses + draws;
  const winRate = totalCompleted > 0 ? Math.round((wins / totalCompleted) * 100) : 0;
  const activeGames = playedGames.filter((g) => g.status === 'active').length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#111] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden text-zinc-200 font-sans"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          title="Close Profile"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Player Profile</h2>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
          {/* User Hero Section */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <AvatarImg
                  avatarUrl={avatar}
                  fallbackName={name}
                  className="w-20 h-20 border-2 border-emerald-500/50 shadow-xl"
                  size={80}
                />
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-[#111] text-white shadow-md transition-all hover:scale-105"
                  title="Edit Profile Picture & Name"
                >
                  <Pencil size={12} />
                </button>
              </div>

              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-white tracking-wide">{name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Competitive Member</p>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors w-max"
                >
                  <Pencil size={12} /> Edit Profile Details
                </button>
              </div>
            </div>

            {/* Quick Action */}
            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  if (onOpenStats) onOpenStats();
                  onClose();
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors border border-zinc-700/60"
              >
                <Activity size={14} className="text-cyan-400" />
                View Analytics
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col items-center text-center">
              <Trophy className="h-6 w-6 text-amber-400 mb-1" />
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold mb-1">
                Performance Rating
              </span>
              <span className="text-2xl font-black text-emerald-400">{rating}</span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col items-center text-center">
              <TrendingUp className="h-6 w-6 text-emerald-400 mb-1" />
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold mb-1">
                Win Rate
              </span>
              <span className="text-2xl font-black text-white">{winRate}%</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                {totalCompleted > 0 ? `${wins}W · ${losses}L · ${draws}D` : 'No finished games'}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col items-center text-center">
              <Activity className="h-6 w-6 text-cyan-400 mb-1" />
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold mb-1">
                Total Games
              </span>
              <span className="text-2xl font-black text-white">{totalGames}</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                {totalCompleted} finished · {activeGames} active
              </span>
            </div>
          </div>

          {/* Recent Games Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300 px-1">
              <Calendar size={16} className="text-emerald-400" />
              <span>Recent Games</span>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-sm text-zinc-500">Loading recent matches...</div>
              ) : playedGames.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">No games played yet.</div>
              ) : (
                <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/60">
                  {playedGames.slice(0, 7).map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        if (onGameSelect) onGameSelect(g.id);
                        onClose();
                      }}
                      className="px-4 py-2.5 flex items-center gap-3.5 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 shrink-0 rounded overflow-hidden pointer-events-none border border-zinc-700/60">
                        <Chessboard
                          position={g.fen || 'start'}
                          arePiecesDraggable={false}
                          customBoardStyle={{ borderRadius: '0px' }}
                          boardWidth={40}
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-xs font-semibold text-zinc-200">
                          vs Engine ({g.opponent_rating || 1500})
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(g.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border shrink-0 ${
                          g.status === 'win'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : g.status === 'loss'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : g.status === 'draw'
                            ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                      >
                        {g.status === 'win'
                          ? 'Won'
                          : g.status === 'loss'
                          ? 'Lost'
                          : g.status === 'draw'
                          ? 'Draw'
                          : 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Sign Out */}
        <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-900/40 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors border border-zinc-700"
          >
            Close
          </button>
        </div>
      </div>

      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        session={session}
        profile={profile}
        onSaved={(patch) => {
          setIsEditOpen(false);
          if (onSaved) onSaved(patch);
        }}
      />
    </div>
  );
};
