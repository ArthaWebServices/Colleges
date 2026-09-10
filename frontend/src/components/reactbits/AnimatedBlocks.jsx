import React, { useState } from 'react';



export const AnimatedBlocks = ({ className = '', count = 18 }) => {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <div className={`grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-slate-900/5 dark:bg-slate-100/5 backdrop-blur-sm border border-slate-200/40 dark:border-slate-800/40 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          onMouseEnter={() => setActiveIdx(idx)}
          onMouseLeave={() => setActiveIdx(null)}
          onTouchStart={() => setActiveIdx(idx)}
          onTouchEnd={() => setActiveIdx(null)}
          className={`h-6 sm:h-8 rounded-md sm:rounded-lg transition-all duration-300 transform ${
            activeIdx === idx
              ? 'bg-amber-400 dark:bg-amber-400/80 scale-105 shadow-md shadow-amber-400/20'
              : 'bg-sky-500/10 dark:bg-sky-400/10 hover:bg-sky-500/20 dark:hover:bg-sky-400/20'
          }`}
        />
      ))}
    </div>
  );
};

export default AnimatedBlocks;

