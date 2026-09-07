"use client";
import React, { useState } from "react";
import { X, Flame, ShieldAlert, AlertTriangle } from "lucide-react";

interface RoastAgeGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (birthYear: number) => void;
  initialBirthYear?: number | null;
}

export function RoastAgeGateModal({
  isOpen,
  onClose,
  onVerified,
  initialBirthYear,
}: RoastAgeGateModalProps) {
  const [birthYear, setBirthYear] = useState<string>(
    initialBirthYear ? String(initialBirthYear) : ""
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  const handleConfirm = () => {
    setError(null);
    const yr = parseInt(birthYear.trim(), 10);
    if (isNaN(yr) || yr < 1920 || yr > currentYear) {
      setError(`Please enter a valid 4-digit birth year between 1920 and ${currentYear}.`);
      return;
    }

    const age = currentYear - yr;
    if (age < 18) {
      setError(
        `Access Restricted: You must be at least 18 years old to activate Roast Mode. You are currently ${age} years old.`
      );
      return;
    }

    onVerified(yr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gradient-to-b from-zinc-950 via-[#100707] to-zinc-950 border border-red-900/60 rounded-2xl shadow-2xl shadow-red-950/40 overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900/40 bg-red-950/30">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-900/50 border border-red-700/60 text-red-400">
              <Flame size={18} className="animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-black text-red-400 bg-red-950/80 border border-red-800/60 px-1.5 py-0.5 rounded">
                18+ Restricted
              </span>
              <h2 className="text-base font-bold text-zinc-100 mt-0.5">Enter Roast Mode</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-800/60"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-zinc-300 leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300 mb-1">Mature Content & Severe Trash-Talk</p>
              Roast Mode features explicit profanity, vulgar language, and aggressive trash-talking AI commentary designed to ruthlessly roast every move you make.
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Enter Your Birth Year
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="e.g. 2002"
                min={1920}
                max={currentYear}
                value={birthYear}
                onChange={(e) => {
                  setBirthYear(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirm();
                }}
                className="w-full bg-zinc-900/90 border border-zinc-700/80 focus:border-red-500 rounded-xl px-4 py-2.5 text-base font-medium text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              You must be 18 or older to unlock this mode.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Cancel / Stay Polite
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 text-xs font-bold text-white shadow-lg shadow-red-950/60 transition-all flex items-center justify-center gap-1.5"
          >
            <Flame size={14} />
            Unlock Roast Mode
          </button>
        </div>
      </div>
    </div>
  );
}
