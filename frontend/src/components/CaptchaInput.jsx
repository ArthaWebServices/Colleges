import React, { useEffect } from 'react';
import { RotateCw, Loader2 } from 'lucide-react';

/**
 * CaptchaInput Component
 * Renders a visual alphanumeric captcha with a refresh button and text input field.
 * Strict Tailwind styling compliant (no inline style objects).
 */
export const CaptchaInput = ({
  captchaSvg,
  captchaValue,
  onCaptchaChange,
  onRefresh,
  isLoading = false,
  error = null,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Top Row: Captcha Display Box + Refresh Button */}
      <div className="flex items-center gap-3">
        {/* Captcha Image Container */}
        <div className="relative min-w-[160px] h-[50px] bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-college-gold" />
              <span>Loading...</span>
            </div>
          ) : captchaSvg ? (
            <div
              className="w-full h-full flex items-center justify-center select-none"
              dangerouslySetInnerHTML={{ __html: captchaSvg }}
            />
          ) : (
            <span className="text-xs text-slate-400">Unavailable</span>
          )}
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading || disabled}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-college-navy dark:hover:text-college-gold bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200/70 dark:border-slate-700 active:scale-95 disabled:opacity-50"
          title="Get a new Captcha"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Bottom Row: Captcha Label + Input Field */}
      <div>
        <label
          htmlFor="superadmin-captcha-input"
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Captcha <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="superadmin-captcha-input"
            type="text"
            value={captchaValue}
            onChange={(e) => onCaptchaChange(e.target.value)}
            placeholder="Captcha"
            disabled={disabled}
            autoComplete="off"
            spellCheck="false"
            maxLength={6}
            className={`w-full px-4 py-2.5 rounded-xl border ${
              error
                ? 'border-rose-400 focus:ring-rose-400 dark:border-rose-600'
                : 'border-slate-300 dark:border-slate-600 focus:ring-college-gold'
            } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium tracking-wide focus:outline-none focus:ring-2 transition-all shadow-sm`}
            required
          />
        </div>
        {error && (
          <p className="mt-1 text-[11px] text-rose-500 font-medium">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default CaptchaInput;
