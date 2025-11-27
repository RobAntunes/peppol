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
        // Check sessionStorage cache first for faster load
        const cachedSession = sessionStorage.getItem('peppol_session_cached');
        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession);
            const cacheTime = parsed.timestamp;
            const now = Date.now();
            // Cache for 30 seconds
            if (now - cacheTime < 30000 && parsed.session) {
              setSession(parsed.session);
              setStatus('ready');
              // Still verify in background
              supabase.auth.getSession().then(({ data }) => {
                if (data.session && isActive) {
                  sessionStorage.setItem('peppol_session_cached', JSON.stringify({
                    session: data.session,
                    timestamp: Date.now()
                  }));
                }
              });
              return;
            }
          } catch (e) {
            // Invalid cache, continue with normal flow
          }
        }

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
        
        // Cache the session for faster subsequent loads
        sessionStorage.setItem('peppol_session_cached', JSON.stringify({
          session: data.session,
          timestamp: Date.now()
        }));
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
      // Clear session cache
      sessionStorage.removeItem('peppol_session_cached');
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

  const userEmail = session?.user?.email ?? 'unknown user';

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row bg-white">
        <aside className="w-full h-min-screen lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/80 px-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                Portal
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl bg-slate-900 text-white px-3 py-2.5 text-xs font-medium shadow-sm shadow-slate-900/30"
                aria-current="page"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Dashboard
                </span>
                <span className="text-[10px] rounded-full bg-slate-800/80 px-2 py-0.5">
                  Live
                </span>
              </button>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                Invoicing
              </p>
              <nav className="space-y-1 text-xs text-slate-600">
                <a
                  href="/invoice"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  <span>Single Invoice</span>
                  <span className="text-[10px] text-slate-400">I</span>
                </a>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  <span>Bulk Upload</span>
                  <span className="text-[10px] text-slate-400">
                    U
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  <span>Invoice History</span>
                  <span className="text-[10px] text-slate-400">H</span>
                </button>
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                Account
              </p>
              <nav className="space-y-1 text-xs text-slate-600">
                <button
                  type="button"
                  className="flex w-full items-center rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="flex w-full items-center rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  Billing
                </button>
              </nav>
            </div>
          </div>

          <div className="my-4 pt-5 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-xs font-semibold text-white">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  Acme Corp
                </p>
                <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>

          </div>
        </aside>

        <main className="flex-1 bg-slate-50 px-6 pt-6 pb-4 lg:px-8 lg:pt-8 lg:pb-6 flex flex-col">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">


            <div className="absolute right-8 top-20 w-full md:w-auto md:min-w-[260px] rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3 text-[11px] text-slate-600">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-[11px] font-semibold text-slate-800">
                    Monthly allowance
                  </p>
                  <p className="text-[10px] text-slate-400">Resets in 9 days</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-900">32 / 50</p>
                  <p className="text-[10px] text-emerald-600">Within limit</p>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 mb-2 overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  Current plan
                  <span className="rounded-full bg-slate-900 text-white px-2 py-0.5 text-[9px]">
                    Starter
                  </span>
                </span>
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Optimize usage
                </button>
              </div>
            </div>
          </header>

          <section className="mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1">
              Dashboard
            </h2>
            <p className="max-w-xl text-sm text-slate-500">
              A calm overview of your invoicing performance, network health, and
              recent activity designed to keep you confidently in control.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 mb-8">
            <a href="/invoice" className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-sm font-semibold group-hover:bg-blue-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>


              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">
                Create single invoice
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Open a focused, guided form that keeps every mandatory Peppol
                field at your fingertips, without overwhelming your screen.
              </p>
            </a>

            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>

              </div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Upload bulk files
                </h3>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  High volume
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Drag &amp; drop XML or CSV files to process batches in a single
                run, with automatic anomaly detection before sending.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Recent activity
                </p>
                <p className="text-[11px] text-slate-400">
                  Only the last 30 days of invoices. Older data stays available
                  in history.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Last 30 days
                </button>
                <button
                  type="button"
                  className="hidden md:inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Filters
                </button>
                <button
                  type="button"
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View full history
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/80">
                  <tr className="text-[11px] text-slate-500 text-left">
                    <th className="px-4 py-2 font-medium">Invoice ID</th>
                    <th className="px-4 py-2 font-medium">Recipient</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                    <th className="px-4 py-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      INV-2023-089
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Schmidt Consulting AG
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Oct 24, 2023 14:23 CET
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      CHF 4,250.00
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Delivered
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      INV-2023-088
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Global Logistics GmbH
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Oct 24, 2023 10:07 CET
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      CHF 1,120.50
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Delivered
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      INV-2023-087
                    </td>
                    <td className="px-4 py-3 text-slate-600">Novartis Pharma</td>
                    <td className="px-4 py-3 text-slate-500">
                      Oct 23, 2023 18:41 CET
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      CHF 12,400.00
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Failed
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      INV-2023-086
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      TechSolutions Ltd
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Oct 22, 2023 09:15 CET
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      CHF 3,450.00
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Delivered
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      INV-2023-085
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Müller &amp; Söhne
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Oct 21, 2023 11:30 CET
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      CHF 890.20
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Processing
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      INV-2023-084
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Alpine Sports AG
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Oct 20, 2023 16:45 CET
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      CHF 2,100.00
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Delivered
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
