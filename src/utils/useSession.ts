import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchPremiumStatus(session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchPremiumStatus(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPremiumStatus = async (user: any) => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }
    const userEmail = user.email?.toLowerCase().trim();
    if (userEmail === 'janhavikolekar280@gmail.com') {
      setIsPremium(true);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();
      
    setIsPremium(data?.is_premium || false);
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  }

  return { session, isPremium, loading, fetchPremiumStatus, logout };
}
