import React, { useState, useEffect } from 'react';

interface TrialTimerProps {
  isActive: boolean;
  onExpire: () => void;
}

export const TrialTimer: React.FC<TrialTimerProps> = ({ isActive, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isActive, timeLeft, onExpire]);

  if (!isActive) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  // Appears for 5 seconds every 30 seconds
  const isVisible = (600 - timeLeft) % 30 < 5;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] flex justify-center items-center pointer-events-none transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-orange-500/90 backdrop-blur-sm text-white px-6 py-1.5 rounded-b-lg shadow-lg flex items-center space-x-3 border-x border-b border-orange-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-semibold tracking-wide">
          Free Trial Ends In: <span className="font-mono bg-orange-600/80 px-2 py-0.5 rounded ml-1">{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
        </span>
      </div>
    </div>
  );
};
