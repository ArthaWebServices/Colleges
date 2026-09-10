import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight, X, BellRing, Eye, ArrowRight, ShieldAlert } from 'lucide-react';

export const EmergencyAlertBanner = ({ announcements = [], onSelectNotice }) => {
  // Filter active emergency announcements
  const emergencies = announcements.filter(
    (a) => (a.isEmergency === true || a.type === 'EMERGENCY') && a.status === 'PUBLISHED'
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('dismissedEmergencyIds') || '[]');
    } catch {
      return [];
    }
  });
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-cycle through multiple emergencies if more than 1
  useEffect(() => {
    if (emergencies.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % emergencies.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [emergencies.length]);

  if (emergencies.length === 0) return null;

  const currentAlert = emergencies[currentIndex] || emergencies[0];
  const isDismissed = dismissedIds.includes(currentAlert?._id);

  const handleDismiss = (id) => {
    const updated = [...new Set([...dismissedIds, id])];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('dismissedEmergencyIds', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestore = (id) => {
    const updated = dismissedIds.filter((item) => item !== id);
    setDismissedIds(updated);
    setIsMinimized(false);
    try {
      sessionStorage.setItem('dismissedEmergencyIds', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToNotice = (noticeId) => {
    const el = document.getElementById(`announcement-${noticeId}`) || document.getElementById('notices');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (onSelectNotice) {
      onSelectNotice(currentAlert);
    }
  };

  // If dismissed or minimized, show a compact persistent pill so students never miss it
  if (isDismissed || isMinimized) {
    return (
      <div className="mb-6 flex justify-center">
        <button
          onClick={() => handleRestore(currentAlert._id)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold shadow-lg shadow-rose-600/30 hover:scale-105 transition-all duration-200 ring-2 ring-rose-300 dark:ring-rose-800"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <AlertTriangle className="w-3.5 h-3.5 text-white" />
          <span>{emergencies.length} Active Emergency Alert{emergencies.length > 1 ? 's' : ''} (Click to View)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-xl shadow-rose-600/20 border border-rose-400/40 transition-all duration-300">
      {/* Background glowing ambient effects */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-rose-900/30 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Siren & Content */}
        <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
          <div className="relative shrink-0 mt-0.5 sm:mt-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-rose-700 shadow-sm">
                Emergency Alert
              </span>
              {emergencies.length > 1 && (
                <span className="text-[11px] font-semibold text-rose-100/90 bg-black/20 px-2 py-0.5 rounded-md">
                  Alert {currentIndex + 1} of {emergencies.length}
                </span>
              )}
              <span className="text-[11px] font-medium text-rose-100/80">
                {new Date(currentAlert.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h3 className="font-heading font-extrabold text-sm sm:text-base md:text-lg text-white truncate leading-snug tracking-tight">
              {currentAlert.title}
            </h3>

            {currentAlert.courseCodes && currentAlert.courseCodes.length > 0 && (
              <p className="text-[11px] text-rose-100/90 font-medium truncate mt-0.5">
                Affects: {currentAlert.courseCodes.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => scrollToNotice(currentAlert._id)}
            className="px-3.5 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 active:scale-95 text-xs font-black shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Read Notice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(currentAlert._id)}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-rose-100 hover:text-white transition-colors"
            title="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlertBanner;
