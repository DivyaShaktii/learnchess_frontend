'use client';

import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, X, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface AuthFormProps {
  onClose?: () => void;
  onAuthenticated?: (userId: string) => void;
}

export default function AuthForm({ onClose, onAuthenticated }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSuccessMsg('Successfully logged in! Opening payment...');
        if (data?.user && onAuthenticated) {
          setTimeout(() => onAuthenticated(data.user.id), 400);
        }
      } else {
        const currentYear = new Date().getFullYear();
        const yr = parseInt(birthYear.trim(), 10);
        if (isNaN(yr) || yr < 1920 || yr > currentYear) {
          setErrorMsg(`Please enter a valid 4-digit birth year between 1920 and ${currentYear}.`);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              birth_year: yr,
            },
          },
        });
        if (error) throw error;

        // Store locally & in profiles table
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smartchess_verified_birth_year', String(yr));
        }
        let currentUserId = data?.user?.id;
        if (currentUserId) {
          try {
            await supabase.from('profiles').upsert({
              id: currentUserId,
              birth_year: yr,
            });
          } catch (e) {
            console.warn('Profile birth_year upsert notice:', e);
          }
        }

        // If session was not auto-issued by Supabase signUp, attempt instant signIn
        if (!data?.session) {
          try {
            const signInRes = await supabase.auth.signInWithPassword({ email, password });
            if (signInRes.data?.user) {
              currentUserId = signInRes.data.user.id;
            }
          } catch (signInErr) {
            console.log('Instant sign in after signup notice:', signInErr);
          }
        }

        setSuccessMsg('Account created successfully! Opening payment gateway...');
        if (currentUserId && onAuthenticated) {
          setTimeout(() => onAuthenticated(currentUserId!), 400);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
    }
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#111] shadow-2xl relative">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="border-b border-zinc-800 p-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {isLogin ? 'Enter your details to sign in.' : 'Join Smart Chess to track your progress.'}
        </p>
      </div>

      <div className="p-6">
        {/* Social Auth */}
        <div className="mb-6 space-y-3">
          <button 
            onClick={handleGoogleAuth}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#111] px-2 text-zinc-500">OR CONTINUE WITH EMAIL</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400 border border-emerald-500/20">
            {successMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleAuth}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">Birth Year (YYYY)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="number"
                  min={1920}
                  max={new Date().getFullYear()}
                  required
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <button 
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              <><LogIn className="h-4 w-4" /> Sign In</>
            ) : (
              <><UserPlus className="h-4 w-4" /> Create Account</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
