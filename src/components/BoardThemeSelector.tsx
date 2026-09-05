import { Check, X, Palette } from 'lucide-react';

export type BoardTheme = {
  id: string;
  name: string;
  light: string;
  dark: string;
};

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'wood', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'midnight', name: 'Midnight Blue', light: '#e8edf1', dark: '#4a7397' },
  { id: 'emerald', name: 'Emerald Green', light: '#ffffdd', dark: '#86a666' },
  { id: 'coral', name: 'Coral', light: '#f2e3d5', dark: '#c27a71' },
  { id: 'obsidian', name: 'Obsidian', light: '#9a9a9a', dark: '#525252' },
];

interface BoardThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedThemeId: string;
  onSelectTheme: (themeId: string) => void;
}

export function BoardThemeSelector({ isOpen, onClose, selectedThemeId, onSelectTheme }: BoardThemeSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">Board Theme</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2 bg-[#0a0a0a]">
          {BOARD_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                selectedThemeId === theme.id
                  ? 'border-emerald-500/50 bg-emerald-900/20'
                  : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border border-zinc-700 shadow-sm flex">
                <div className="w-1/2 h-full" style={{ backgroundColor: theme.light }} />
                <div className="w-1/2 h-full" style={{ backgroundColor: theme.dark }} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-zinc-200">{theme.name}</div>
              </div>
              {selectedThemeId === theme.id && (
                <div className="shrink-0 text-emerald-400">
                  <Check size={20} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
