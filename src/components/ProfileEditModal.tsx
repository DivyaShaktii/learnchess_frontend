"use client";
import React, { useState, useRef } from "react";
import { X, Camera, Check, Upload, User } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { CHESS_PRESETS, AvatarImg, ChessPieceSvg, isChessPreset } from "../utils/avatarUtils";

// Resize + compress an image File to a base64 data URL (max 256px, JPEG 80%)
function resizeToDataUrl(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const PRESET_AVATARS = Object.entries(CHESS_PRESETS).map(([id, p]) => ({ id, ...p }));




interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  profile: any;
  onSaved: (patch: { display_name?: string; avatar_url?: string; birth_year?: number | null }) => void;
}

export function ProfileEditModal({ isOpen, onClose, session, profile, onSaved }: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState<string>(
    profile?.display_name || profile?.name || session?.user?.user_metadata?.full_name || ""
  );
  const [birthYear, setBirthYear] = useState<string>(
    profile?.birth_year ? String(profile.birth_year) : ""
  );
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setDisplayName(
        profile?.display_name ||
        session?.user?.user_metadata?.display_name ||
        profile?.name ||
        session?.user?.user_metadata?.full_name ||
        ""
      );
      setBirthYear(
        profile?.birth_year || session?.user?.user_metadata?.birth_year
          ? String(profile?.birth_year || session?.user?.user_metadata?.birth_year)
          : ""
      );
      setPreviewUrl(
        profile?.avatar_url ||
        session?.user?.user_metadata?.avatar_url ||
        null
      );
      if (profile?.avatar_url?.startsWith("chess:")) {
        setSelectedPreset(profile.avatar_url.slice(6));
      } else {
        setSelectedPreset(null);
      }
      setError(null);
    }
  }, [isOpen, profile, session]);

  if (!isOpen) return null;

  const currentAvatarUrl =
    previewUrl ||
    profile?.avatar_url ||
    session?.user?.user_metadata?.avatar_url ||
    null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB."); return; }
    setUploading(true); setError(null); setSelectedPreset(null);
    try {
      // Resize + convert to base64 — no storage bucket needed
      const dataUrl = await resizeToDataUrl(file, 256);
      setPreviewUrl(dataUrl);
    } catch (err: any) {
      setError("Could not read image. " + (err?.message || ""));
    } finally { setUploading(false); }
  };

  const handlePresetSelect = (id: string) => {
    setSelectedPreset(id);
    // Store as chess: token — rendered natively by AvatarImg, no canvas needed
    setPreviewUrl(`chess:${id}`);
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true); setError(null);
    try {
      const updates: Record<string, any> = {};
      const trimmed = displayName.trim();
      if (trimmed) updates.display_name = trimmed;
      if (previewUrl) updates.avatar_url = previewUrl;

      let parsedBirthYear: number | null = null;
      if (birthYear.trim()) {
        const yr = parseInt(birthYear.trim(), 10);
        const currentYr = new Date().getFullYear();
        if (isNaN(yr) || yr < 1920 || yr > currentYr) {
          setError(`Please enter a valid birth year between 1920 and ${currentYr}.`);
          setSaving(false);
          return;
        }
        parsedBirthYear = yr;
        updates.birth_year = yr;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      // 1. Persist to Supabase Auth User Metadata (permanent, survives all refreshes)
      try {
        await supabase.auth.updateUser({
          data: updates,
        });
      } catch (authErr) {
        console.warn("Could not update auth user metadata:", authErr);
      }

      // 2. Try upsert / update to public.profiles table
      try {
        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert({ id: session.user.id, ...updates }, { onConflict: "id" });

        if (upsertErr) {
          // If upsert fails (e.g. schema restrictions), fallback to update
          await supabase
            .from("profiles")
            .update(updates)
            .eq("id", session.user.id);
        }
      } catch (dbErr) {
        console.warn("Could not write to profiles table:", dbErr);
      }

      // 3. Save to localStorage for instant synchronous load on page refresh
      const savedProfile = {
        ...(profile || {}),
        ...updates,
      };
      try {
        localStorage.setItem(`smartchess_profile_${session.user.id}`, JSON.stringify(savedProfile));
      } catch {}

      onSaved({
        display_name: trimmed || undefined,
        avatar_url: previewUrl || undefined,
        birth_year: parsedBirthYear,
      });
      onClose();
    } catch (err: any) {
      setError("Save failed. " + (err?.message || ""));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">Edit Profile</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <AvatarImg
                avatarUrl={currentAvatarUrl}
                fallbackName={displayName || "U"}
                className="w-20 h-20 border-2 border-zinc-700 shadow-lg"
                size={80}
              />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Camera size={22} className="text-white" />}
              </button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
              <Upload size={13} />{uploading ? "Uploading..." : "Upload from gallery"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <p className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-wide">Chess Piece Avatars</p>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center p-2 transition-all border-2 ${
                    selectedPreset === p.id
                      ? "border-emerald-400 scale-110 shadow-lg shadow-emerald-900/50 ring-2 ring-emerald-500/30"
                      : "border-zinc-700/60 hover:border-zinc-500 hover:scale-105"
                  }`}
                  style={{ background: p.bg }}
                >
                  <ChessPieceSvg id={p.id} className="w-6 h-6 drop-shadow-sm" />
                  {selectedPreset === p.id && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center shadow">
                      <Check size={10} className="text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-1.5 block">Player Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your player name" maxLength={32}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors" />
            <p className="text-xs text-zinc-600 mt-1">{displayName.length}/32 characters</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Birth Year (YYYY)</label>
            </div>
            <input 
              type="number" 
              value={birthYear} 
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="e.g. 2000" 
              min={1920} 
              max={new Date().getFullYear()}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors" 
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
