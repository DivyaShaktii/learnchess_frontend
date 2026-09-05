import React from 'react';

interface UserProfileProps {
  profile: any;
  session: any;
}

export const UserProfile: React.FC<UserProfileProps> = ({ profile, session }) => {
  if (!profile || !session) return null;

  const avatar = profile.avatar_url || session.user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + (session.user?.email || 'U');
  const name = profile.name || session.user?.user_metadata?.full_name || session.user?.email;
  const rating = profile.predicted_rating || 1500;
  const totalGames = profile.total_games || 0;

  return (
    <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 shadow-xl flex items-center space-x-4 mb-4 backdrop-blur-sm">
      <img 
        src={avatar} 
        alt="Avatar" 
        className="w-12 h-12 rounded-full border-2 border-indigo-500 object-cover"
      />
      <div>
        <h3 className="text-white font-bold text-lg leading-tight">{name}</h3>
        <div className="flex items-center space-x-3 text-sm mt-1">
          <span className="text-indigo-400 font-semibold">
            <span className="text-gray-400 font-normal mr-1">Rating:</span>
            {rating}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300">
            <span className="text-gray-400 mr-1">Games Played:</span>
            {totalGames}
          </span>
        </div>
      </div>
    </div>
  );
}
