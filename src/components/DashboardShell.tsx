import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type Status = 'checking' | 'ready' | 'error' | 'redirecting';

export default function DashboardShell() {
  const [status, setStatus] = useState<Status>('checking');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isActive) return;

        if (error) {
          console.error('[dashboard:session]', error);
          setError(
            'We could not verify your session. Please refresh the page or sign in again.'
          );
          setStatus('error');
          return;
        }

        if (!data.session) {
          setStatus('redirecting');
          const redirectTarget = '/auth?redirect=/dashboard';
          window.location.href = redirectTarget;
          return;
        }

        setSession(data.session);
        setStatus('ready');
      } catch (err) {
        console.error('[dashboard:unexpected]', err);
        if (!isActive) return;
        setError(
          'Something went wrong while checking your session. Please try again.'
        );
        setStatus('error');
      }
    };

    checkSession();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSignOut = async () => {
    setStatus('checking');
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[dashboard:signout]', error);
        setError('We could not sign you out right now. Please try again.');
        setStatus('ready');
        return;
      }
      window.location.href = '/auth';
    } catch (err) {
      console.error('[dashboard:signout-unexpected]', err);
      setError('Something went wrong while signing you out. Please try again.');
      setStatus('ready');
    }
  };

  if (status === 'checking' || status === 'redirecting') {
    return (
      <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/70 p-8 text-sm text-slate-500">
        <p className="font-medium text-slate-700 mb-2">
          {status === 'redirecting'
            ? 'Redirecting to login…'
            : 'Checking your session…'}
        </p>
        <p className="text-xs text-slate-400">
          This usually only takes a second. If it hangs, try refreshing the page.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg border border-red-100 rounded-2xl shadow-xl shadow-red-100/80 p-8 text-sm text-slate-700">
        <p className="font-semibold text-red-700 mb-2">We hit a problem</p>
        <p className="text-xs text-red-600 mb-4">
          {error ??
            'We could not verify your session. Please try refreshing the page or signing in again.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/30 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh page
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = '/auth')}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-lg border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/80 p-8 md:p-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 mb-1">
            Dashboard
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
            You are signed in
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Signed in as{' '}
            <span className="font-medium text-slate-800">
              {session?.user?.email ?? 'unknown user'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Compliance-ready foundation
          </p>
          <p className="text-xs text-slate-500">
            This is a placeholder for your Peppol inbox, outgoing invoices, and
            audit trail – all backed by Supabase Auth.
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Next steps
          </p>
          <p className="text-xs text-slate-500">
            Connect your business identity, register your Peppol participants,
            and start sending structured invoices once backend endpoints are
            wired up.
          </p>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        This dashboard is intentionally minimal – it focuses on providing a clean,
        authenticated entry point that you can extend with your actual Peppol
        flows.
      </p>
    </div>
  );
}


