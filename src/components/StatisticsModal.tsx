import React from 'react';
import { X, Trophy, Activity, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  currentRating: number;
}

export function StatisticsModal({ isOpen, onClose, userId, currentRating }: StatisticsModalProps) {
  const [games, setGames] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen && userId) {
      import('../services/api').then(({ api }) => {
        api.getUserGames(userId).then(res => setGames(res.games || []));
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  // Filter out untouched starting position games (where 0 moves have been made)
  const playedGames = games.filter((g) => {
    if (g.status === 'win' || g.status === 'loss' || g.status === 'draw') return true;
    if (g.move_history && g.move_history.length > 0) return true;
    if (g.fen && g.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' && g.fen !== 'start') return true;
    return false;
  });

  // Prepare data for the chart by mapping completed games
  const chartData = [...playedGames]
    .filter((g) => g.status === 'win' || g.status === 'loss' || g.status === 'draw')
    .reverse() // Sort chronologically (oldest to newest)
    .map((g, index) => ({
      name: `Game ${index + 1}`,
      rating: g.opponent_rating || 1500,
      result: g.status
    }));

  // The Supabase 'games' table tracks status as 'win', 'loss', 'draw', or 'active'.
  const wins = playedGames.filter(g => g.status === 'win').length;
  const losses = playedGames.filter(g => g.status === 'loss').length;
  const draws = playedGames.filter(g => g.status === 'draw').length;
  
  // Games played calculation
  const totalPlayed = playedGames.length;
  
  // Calculate win rate from completed games only
  const totalCompleted = wins + losses + draws;
  const winRate = totalCompleted > 0 ? Math.round((wins / totalCompleted) * 100) : 0;
  const activeGames = playedGames.filter(g => g.status === 'active').length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#111] shadow-2xl relative flex flex-col max-h-[90vh]">
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="border-b border-zinc-800 p-6">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            Performance Statistics
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Analyze your rating trajectory and recent game outcomes.
          </p>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-8">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col items-center text-center">
              <Trophy className="h-8 w-8 text-amber-400 mb-2" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Current Rating</span>
              <span className="text-3xl font-black text-white">{currentRating}</span>
            </div>
            
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col items-center text-center">
              <TrendingUp className="h-8 w-8 text-emerald-400 mb-2" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Win Rate</span>
              <span className="text-3xl font-black text-white">{winRate}%</span>
              <span className="text-[11px] text-zinc-500 mt-1">
                {totalCompleted > 0 ? `${wins}W · ${losses}L · ${draws}D` : 'No finished games'}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col items-center text-center">
              <Activity className="h-8 w-8 text-cyan-400 mb-2" />
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Games Played</span>
              <span className="text-3xl font-black text-white">{totalPlayed}</span>
              <span className="text-[11px] text-zinc-500 mt-1">
                {totalCompleted} finished · {activeGames} active
              </span>
            </div>
          </div>

          {/* Line Chart Area */}
          {chartData.length > 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col h-72">
              <h3 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-wider">Rating History (Completed Games)</h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6, fill: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-zinc-800 border-dashed">
              <p className="text-zinc-500 font-medium">No completed games to plot yet.</p>
              <p className="text-zinc-600 text-sm mt-1">Finish a game to see your rating trajectory!</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
