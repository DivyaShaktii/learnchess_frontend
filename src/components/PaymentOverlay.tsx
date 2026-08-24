'use client';

import React, { useState } from 'react';
import { api } from '../services/api';
import { supabase } from '../utils/supabaseClient';
import { Loader2 } from 'lucide-react';

interface PaymentOverlayProps {
  userId: string;
  onSuccess: () => void;
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

  const handlePayment = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Create Order on Backend
      const orderData = await api.createRazorpayOrder(userId);

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TTYoP1jpVr4bFq',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Smart Chess',
        description: 'Unlock full access to Smart Chess',
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            setLoading(true);
            // 3. Verify Payment
            await api.verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              userId
            );
            
            // 4. Update Profile to Premium (Frontend handles this because backend uses anon key)
            await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
            
            onSuccess();
          } catch (err: any) {
            setErrorMsg(err.message || 'Payment verification failed.');
            setLoading(false);
          }
        },
        prefill: {
          name: 'Chess Player',
          email: 'player@example.com',
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
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Pay ₹1 to Play'}
        </button>

        <button
          onClick={onLogout}
          disabled={loading}
          className="text-sm font-medium text-zinc-500 hover:text-white transition-colors block mx-auto mb-4"
        >
          Log out and use a different account
        </button>

        <button
          onClick={async () => {
            setLoading(true);
            await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
            onSuccess();
          }}
          disabled={loading}
          className="text-xs font-medium text-zinc-600 hover:text-emerald-400 transition-colors block mx-auto underline"
        >
          (Test Mode) Skip Payment & Enter Game
        </button>
      </div>
    </div>
  );
}
