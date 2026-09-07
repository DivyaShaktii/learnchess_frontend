import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Instant synchronous load from localStorage before any network request
        try {
          const cached = localStorage.getItem(`smartchess_profile_${session.user.id}`);
          if (cached) {
            setProfile(JSON.parse(cached));
          }
        } catch {}
      }
      fetchPremiumStatus(session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        try {
          const cached = localStorage.getItem(`smartchess_profile_${session.user.id}`);
          if (cached) {
            setProfile(JSON.parse(cached));
          }
        } catch {}
      }
      fetchPremiumStatus(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPremiumStatus = async (user: any) => {
    if (!user) {
      setIsPremium(false);
      setProfile(null);
      setLoading(false);
      return;
    }
    const userEmail = user.email?.toLowerCase().trim() || '';
    const isExemptAdmin = (
      userEmail === 'janhavikolekar280@gmail.com' ||
      userEmail === 'janhavikolkar280@gmail.com' ||
      userEmail.startsWith('janhavikolekar')
    );
    if (isExemptAdmin) {
      setIsPremium(true);
    }

    // 1. Check localStorage
    let localData: any = {};
    try {
      const cached = localStorage.getItem(`smartchess_profile_${user.id}`);
      if (cached) localData = JSON.parse(cached);
    } catch {}

    // 2. Fetch directly from Supabase profiles table (authenticated with user JWT)
    let dbProfile: any = {};
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && data) {
        dbProfile = data;
      }
    } catch (err) {
      console.warn('Direct profile fetch warning:', err);
    }

    // 3. Fetch from Backend (for total_games, opponent rating history, etc.)
    let backendData: any = {};
    try {
      const res = await fetch(`http://localhost:8000/api/user/profile?user_id=${user.id}`);
      if (res.ok) {
        backendData = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch backend profile', e);
    }

    // 4. Supabase Auth user metadata
    const userMeta = user.user_metadata || {};

    // Merge with proper priority so saved display_name and avatar_url never get wiped
    const resolvedDisplayName =
      dbProfile.display_name ||
      userMeta.display_name ||
      localData.display_name ||
      backendData.display_name ||
      dbProfile.name ||
      userMeta.full_name ||
      null;

    const resolvedAvatarUrl =
      dbProfile.avatar_url ||
      userMeta.avatar_url ||
      localData.avatar_url ||
      backendData.avatar_url ||
      null;

    const resolvedRating =
      dbProfile.predicted_rating ||
      backendData.predicted_rating ||
      localData.predicted_rating ||
      1500;

    const resolvedTotalGames =
      backendData.total_games !== undefined
        ? backendData.total_games
        : dbProfile.total_games !== undefined
        ? dbProfile.total_games
        : localData.total_games || 0;

    const resolvedBirthYear =
      dbProfile.birth_year ||
      userMeta.birth_year ||
      localData.birth_year ||
      null;

    const mergedProfile = {
      ...(backendData || {}),
      ...(dbProfile || {}),
      ...(localData || {}),
      display_name: resolvedDisplayName,
      avatar_url: resolvedAvatarUrl,
      predicted_rating: resolvedRating,
      total_games: resolvedTotalGames,
      birth_year: resolvedBirthYear ? Number(resolvedBirthYear) : null,
    };

    setProfile(mergedProfile);

    // Write resolved profile back to localStorage
    try {
      localStorage.setItem(`smartchess_profile_${user.id}`, JSON.stringify(mergedProfile));
    } catch {}

    if (isExemptAdmin) {
      setIsPremium(true);
    } else {
      setIsPremium(mergedProfile?.is_premium || false);
    }

    setLoading(false);
  };

  const logout = async () => {
    try {
      if (session?.user?.id) {
        localStorage.removeItem(`smartchess_profile_${session.user.id}`);
      }
    } catch {}
    await supabase.auth.signOut();
  };

  // Optimistically patch profile state — used after profile edits to reflect
  // changes immediately without waiting for a backend re-fetch.
  const mergeProfile = (patch: Record<string, any>) => {
    setProfile((prev: any) => {
      const updated = { ...(prev || {}), ...patch };
      if (session?.user?.id) {
        try {
          localStorage.setItem(`smartchess_profile_${session.user.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  return { session, isPremium, profile, loading, fetchPremiumStatus, logout, mergeProfile };
}

export function isAdultFromBirthYear(birthYear?: number | string | null): boolean {
  if (!birthYear) return false;
  const year = typeof birthYear === 'string' ? parseInt(birthYear, 10) : Number(birthYear);
  if (isNaN(year) || year <= 1900 || year > new Date().getFullYear()) return false;
  const currentYear = new Date().getFullYear();
  return (currentYear - year) >= 18;
}
