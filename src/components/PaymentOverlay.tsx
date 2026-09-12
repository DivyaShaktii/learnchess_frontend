'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../utils/supabaseClient';
import { Loader2 } from 'lucide-react';

interface PaymentOverlayProps {
  userId: string;
  onSuccess: () => void | Promise<void>;
  onLogout: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentOverlay({ userId, onSuccess, onLogout }: PaymentOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pending, setPending] = useState<any>(null);
  useEffect(() => {
    try { setPending(JSON.parse(localStorage.getItem(`chess_payment_${userId}`) || 'null')); } catch {}
  }, [userId]);

  const verify = async (response: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.verifyRazorpayPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, userId);
      await onSuccess();
      localStorage.removeItem(`chess_payment_${userId}`);
      setPending(null);
    } catch (err: any) {
      setErrorMsg(`${err.message || 'Could not confirm access.'} Your payment reference is ${response.razorpay_payment_id}. Retry verification without paying again.`);
    } finally { setLoading(false); }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      if (pending) { await verify(pending); return; }
      if (!window.Razorpay) throw new Error('Checkout is still loading. Please try again.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) throw new Error('Please sign in again before paying.');

      // 1. Create Order on Backend
      const orderData = await api.createRazorpayOrder(userId);

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Smart Chess',
        description: 'Unlock full access to Smart Chess',
        order_id: orderData.order_id,
        handler: async function (response: any) {
          setPending(response);
          try { localStorage.setItem(`chess_payment_${userId}`, JSON.stringify(response)); } catch {}
          await verify(response);
        },
        modal: { ondismiss: () => setLoading(false) },
        prefill: {
          name: session.user.user_metadata?.display_name || '',
          email: session.user.email || '',
        },
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setErrorMsg(response.error.description || 'Payment failed.');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate payment.');
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center text-center">
      <div className="w-full rounded-2xl border border-zinc-800 bg-[#111] p-8 shadow-2xl relative">
        <h2 className="mb-4 text-3xl font-bold text-white">Unlock Smart Chess</h2>
        <p className="mb-8 text-zinc-400">
          Smart Chess is a premium application. Pay a one-time fee of ₹1 to unlock full access to the AI Coach and Puzzle Modes.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : pending ? 'Retry payment verification' : 'Pay ₹1 to Play'}
        </button>

        <button
          onClick={onLogout}
          disabled={loading}
          className="text-sm font-medium text-zinc-500 hover:text-white transition-colors block mx-auto"
        >
          Log out and use a different account
        </button>
      </div>
    </div>
  );
}
