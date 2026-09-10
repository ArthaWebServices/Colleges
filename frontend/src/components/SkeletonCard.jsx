import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div
    className={`relative overflow-hidden bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
  </div>
);

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
    {/* Top bar */}
    <div className="px-5 py-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-between">
      <Shimmer className="h-5 w-20 rounded-full" />
      <Shimmer className="h-4 w-14 rounded-full" />
    </div>

    {/* Tags row */}
    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
      <Shimmer className="h-5 w-14 rounded-full" />
      <Shimmer className="h-5 w-10 rounded-full" />
      <Shimmer className="h-5 w-8 rounded-full" />
    </div>

    {/* Title */}
    <div className="px-5 pb-3 space-y-2">
      <Shimmer className="h-5 w-4/5" />
      <Shimmer className="h-4 w-3/5" />
    </div>

    {/* Date */}
    <div className="px-5 pb-3">
      <Shimmer className="h-3.5 w-40 rounded-full" />
    </div>

    {/* Divider */}
    <div className="mx-5 border-t border-slate-100 dark:border-slate-700/60" />

    {/* Content lines */}
    <div className="px-5 pt-3 pb-5 space-y-2">
      <Shimmer className="h-3.5 w-full" />
      <Shimmer className="h-3.5 w-full" />
      <Shimmer className="h-3.5 w-3/4" />
      <Shimmer className="h-3.5 w-1/2" />
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 6 }) => (
  <div className="columns-1 md:columns-2 gap-6 [column-fill:_balance] w-full">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="break-inside-avoid mb-6">
        <SkeletonCard />
      </div>
    ))}
  </div>
);

export default SkeletonCard;
