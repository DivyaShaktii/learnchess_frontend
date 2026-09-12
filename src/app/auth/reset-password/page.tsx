'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const callbackError = hashParams.get('error_description') || new URL(window.location.href).searchParams.get('error_description');
    if (callbackError) {
      setError(callbackError);
      setChecking(false);
      return;
    }

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSessionReady(Boolean(data.session));
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setComplete(true);
    await supabase.auth.signOut();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111] p-8 shadow-2xl">
        {complete ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm text-zinc-400">Your new password is ready. Return to the game and sign in.</p>
            <Link href="/" className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500">
              Return to Learn Chess
            </Link>
          </div>
        ) : checking ? (
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-400" />
            <p className="mt-3 text-sm text-zinc-400">Checking your reset link…</p>
          </div>
        ) : !sessionReady ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold text-red-300">Reset link unavailable</h1>
            <p role="alert" className="mt-3 text-sm text-zinc-400">{error || 'This link is invalid or expired. Request a new password-reset email.'}</p>
            <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">Return to Learn Chess</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Choose a new password</h1>
            <p className="mt-2 text-sm text-zinc-400">Use at least 8 characters.</p>
            {error && <div role="alert" className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
            <form onSubmit={updatePassword} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-zinc-400">
                New password
                <span className="relative mt-1 block">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none" />
                </span>
              </label>
              <label className="block text-xs font-medium text-zinc-400">
                Confirm new password
                <span className="relative mt-1 block">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none" />
                </span>
              </label>
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
