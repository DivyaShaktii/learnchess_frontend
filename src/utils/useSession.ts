import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);

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
      void fetchPremiumStatus(session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      generation.current++;
      setLoading(true);
      setIsPremium(null);
      setSession(session);
      if (session?.user) {
        try {
          const cached = localStorage.getItem(`smartchess_profile_${session.user.id}`);
          if (cached) {
            setProfile(JSON.parse(cached));
          }
        } catch {}
      }
      // Supabase auth callbacks execute under the auth lock. Fetch after it releases.
      setTimeout(() => void fetchPremiumStatus(session?.user), 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPremiumStatus = async (user: any) => {
    const request = ++generation.current;
    setError('');
    if (!user) {
      setIsPremium(false);
      setProfile(null);
      setLoading(false);
      return;
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
        .abortSignal(AbortSignal.timeout(10000)).maybeSingle();
      if (!error && data) {
        dbProfile = data;
      }
    } catch (err) {
      console.warn('Direct profile fetch warning:', err);
    }

    // 3. Fetch from Backend (for total_games, opponent rating history, etc.)
    let backendData: any = {};
    try {
      const { data: auth } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/user/profile?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${auth.session?.access_token || ''}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        backendData = await res.json();
      } else { throw new Error('Unable to check account access. Please retry.'); }
    } catch (e) {
      if (request === generation.current) {
        setError('Unable to check account access. Please retry; no new payment is needed.');
        setIsPremium(null);
        setLoading(false);
      }
      return false;
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
      // Entitlements must never come from browser storage or user metadata.
      is_premium: backendData.is_premium === true,
      display_name: resolvedDisplayName,
      avatar_url: resolvedAvatarUrl,
      predicted_rating: resolvedRating,
      total_games: resolvedTotalGames,
      birth_year: resolvedBirthYear ? Number(resolvedBirthYear) : null,
    };

    if (request !== generation.current) return;
    setProfile(mergedProfile);

    // Write resolved profile back to localStorage
    try {
      localStorage.setItem(`smartchess_profile_${user.id}`, JSON.stringify(mergedProfile));
    } catch {}

    setIsPremium(mergedProfile.is_premium);

    setLoading(false);
    return mergedProfile.is_premium;
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

  return { session, isPremium, profile, loading, error, fetchPremiumStatus, logout, mergeProfile };
}

export function isAdultFromBirthYear(birthYear?: number | string | null): boolean {
  if (!birthYear) return false;
  const year = typeof birthYear === 'string' ? parseInt(birthYear, 10) : Number(birthYear);
  if (isNaN(year) || year <= 1900 || year > new Date().getFullYear()) return false;
  const currentYear = new Date().getFullYear();
  return (currentYear - year) >= 18;
}
