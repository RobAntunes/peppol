import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Mode = 'sign-in' | 'sign-up';

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getRedirectTarget = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      return redirect && redirect.startsWith('/') ? redirect : '/dashboard';
    } catch {
      return '/dashboard';
    }
  };

  const setFriendlyError = (context: Mode, rawMessage?: string) => {
    // Log raw error for debugging without exposing all details to the user.
    if (rawMessage) {
      console.error(`[auth:${context}]`, rawMessage);
    }

    if (context === 'sign-in') {
      setError(
        'We could not sign you in with those details. Please check your email and password or try resetting your password.'
      );
    } else {
      setError(
        'We could not create your account right now. Please check your details or try again in a moment.'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(false);
    setOauthLoading(true);
    setMessage(null);
    setError(null);

    try {
      const target = getRedirectTarget();
      const redirectTo = `${window.location.origin}${target}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setFriendlyError('sign-in', error.message);
        setOauthLoading(false);
      }
      // On success, Supabase will redirect the browser to `redirectTo`
    } catch (err: any) {
      console.error('[auth:google-unexpected]', err);
      setError(
        'We could not reach Google sign-in right now. Please try again or use email and password.'
      );
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setFriendlyError('sign-in', signInError.message);
        } else {
          const target = getRedirectTarget();
          window.location.href = target;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) {
          setFriendlyError('sign-up', signUpError.message);
        } else {
          setMessage('Account created. Please check your inbox to confirm your email address.');
        }
      }
    } catch (err: any) {
      console.error('[auth:unexpected]', err);
      setError('Something went wrong while contacting the authentication service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || oauthLoading;

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/70 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h2>
        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {mode === 'sign-in' ? 'Need an account?' : 'Already have an account?'}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        {mode === 'sign-in'
          ? 'Sign in to your Taxera Peppol portal to manage your e-invoices.'
          : 'Sign up to get access to a compliant Swiss Peppol e-invoicing portal.'}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {message}
        </div>
      )}

      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isBusy}
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {oauthLoading ? 'Connecting to Google…' : 'Continue with Google'}
        </button>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or continue with email</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium text-slate-700"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="you@company.ch"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-slate-700 flex items-center justify-between"
          >
            <span>Password</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading
            ? mode === 'sign-in'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'sign-in'
            ? 'Sign in'
            : 'Create account'}
        </button>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          By continuing, you agree that processing of your data follows Swiss and EU
          e-invoicing regulations. You can revoke access at any time from your account.
        </p>
      </form>
    </div>
  );
}


