import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { ShieldAlert, Clock, LogOut, CheckCircle2, Copy, Check, RefreshCw, Sparkles, UserCheck } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-college-navy dark:border-college-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Verifying HOD credentials...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check HOD approval status from Clerk publicMetadata
  const isApproved = user?.publicMetadata?.isApproved === true;

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMsg('');
    try {
      if (user && typeof user.reload === 'function') {
        await user.reload();
      }
      if (user?.publicMetadata?.isApproved === true) {
        setStatusMsg('✓ Account Approved! Access Granted.');
      } else {
        setStatusMsg('Account is still pending approval by Super Admin.');
        setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error reloading user status:', err);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isApproved) {
    const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress;

    return (
      <div className="max-w-2xl mx-auto my-12 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden transition-all duration-300">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center space-x-4 relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                <Clock className="w-6 h-6 text-amber-100 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-900/30 text-amber-100 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 border border-amber-300/20">
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>Verification Required</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white">
                  HOD Account Pending Approval
                </h2>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  Ghanshyamdas Saraf College Administrator Verification Policy
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-slate-700 dark:text-slate-200">
            {/* Welcome & Info */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Department Head Profile:</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{fullName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user.emailAddresses[0]?.emailAddress}</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-full text-[11px] font-bold shrink-0">
                Pending Verification
              </span>
            </div>

            {/* Security Policy Card */}
            <div className="bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Institutional Security Policy</span>
              </div>
              <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                In compliance with university cybersecurity protocols, all newly registered HOD accounts require manual approval by the Super Administrator before notice posting privileges are activated.
              </p>
            </div>

            {/* Step-by-Step Approval Guide */}
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-college-navy dark:text-college-gold" />
                <span>How to Complete Your Verification:</span>
              </h4>

              <div className="space-y-3">
                {/* Step 1: Copy HOD User ID */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-college-navy/10 dark:bg-slate-800 text-college-navy dark:text-college-gold text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Copy your HOD Verification Code:</p>
                      <code className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mt-1 inline-block select-all">
                        {user.id}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyUserId}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 shrink-0 ${copied
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                      }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step 2: Share with Super Admin */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-college-navy/10 dark:bg-slate-800 text-college-navy dark:text-college-gold text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Share with Administrator:</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Provide this Verification Code to the Super Administrator for Approval.
                    </p>
                  </div>
                </div>

                {/* Step 3: Check Approval Status */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-college-navy/10 dark:bg-slate-800 text-college-navy dark:text-college-gold text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Instant Activation:</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Once notified of approval, click <strong>"Check Approval Status"</strong> below to launch your workspace immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {statusMsg && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full sm:w-auto px-5 py-2.5 bg-college-navy hover:bg-college-navyLight dark:bg-college-gold dark:hover:bg-college-goldHover text-college-gold dark:text-college-navy font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking Status...' : 'Check Approval Status'}</span>
              </button>

              <button
                onClick={() => signOut()}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
