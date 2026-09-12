'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const finishAuthentication = async () => {
      const url = new URL(window.location.href);
      const callbackError = url.searchParams.get('error_description') ||
        new URLSearchParams(url.hash.replace(/^#/, '')).get('error_description');

      if (callbackError) {
        if (active) setError(callbackError);
        return;
      }

      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (active) setError(sessionError.message);
        return;
      }

      if (data.session && active) {
        router.replace('/');
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && active) router.replace('/');
      });

      const timeout = window.setTimeout(() => {
        if (active) setError('The sign-in callback did not create a session. Please try signing in again.');
      }, 8000);

      return () => {
        listener.subscription.unsubscribe();
        window.clearTimeout(timeout);
      };
    };

    let cleanup: (() => void) | undefined;
    void finishAuthentication().then((result) => { cleanup = result; });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111] p-8 text-center shadow-2xl">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-300">Sign-in failed</h1>
            <p role="alert" className="mt-3 text-sm text-zinc-400">{error}</p>
            <button onClick={() => router.replace('/')} className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500">
              Return to Learn Chess
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-400" />
            <h1 className="mt-4 text-xl font-semibold">Completing sign-in…</h1>
            <p className="mt-2 text-sm text-zinc-400">Please keep this page open.</p>
          </>
        )}
      </div>
    </main>
  );
}
