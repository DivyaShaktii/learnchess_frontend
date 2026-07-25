import { twMerge } from 'tailwind-merge';

export type Persona = 'robot' | 'owl' | 'friend';

interface SpeechBubbleProps {
  persona: Persona;
  message: string;
  classification?: string;
  isThinking?: boolean;
}

const getClassificationColor = (classification?: string) => {
  switch (classification?.toLowerCase()) {
    case 'book': return 'border-gray-400';
    case 'best move': return 'border-green-500';
    case 'brilliant': return 'border-cyan-500 shadow-[0_0_10px_#06b6d4]';
    case 'excellent': return 'border-green-300';
    case 'good': return 'border-lime-300';
    case 'inaccuracy': return 'border-amber-400';
    case 'mistake': return 'border-orange-500';
    case 'blunder': return 'border-red-500';
    case 'worst move': return 'border-red-800 bg-red-950/20';
    default: return 'border-zinc-700';
  }
};

export function SpeechBubble({ message, classification, isThinking }: SpeechBubbleProps) {
  const borderClass = getClassificationColor(classification);

  return (
    <div className="w-full mb-6">
      <div className={twMerge(
        "rounded-2xl border-2 p-4 bg-zinc-900/50 shadow-lg transition-colors duration-300",
        borderClass
      )}>
        <div className="text-sm text-zinc-400 mb-1 font-semibold">Coach Feedback</div>
        
        {isThinking ? (
          <div className="flex gap-1 items-center h-6">
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="text-zinc-100 text-base leading-relaxed">
            {message || "Make a move! I'll let you know what I think."}
          </div>
        )}
      </div>
    </div>
  );
}
