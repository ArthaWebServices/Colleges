import React, { useState } from 'react';

export const Dock = ({ items = [], activeTab = 'all', onSelect }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useState(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice(!window.matchMedia('(hover: hover)').matches || window.innerWidth < 640);
    }
  }, []);

  return (
    <div className="flex justify-center my-3 sm:my-6 sticky top-20 sm:top-24 z-40 px-2">
      <div
        onMouseLeave={() => setHoveredIdx(null)}
        className="flex items-center gap-1 sm:gap-2 md:gap-3 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-sky-500/5 transition-all duration-300 overflow-x-auto scrollbar-none max-w-full"
      >
        {items.map((item, idx) => {
          const isSelected = activeTab === item.id;

          // Calculate magnification — disabled on touch devices
          let scale = 1;
          if (!isTouchDevice && hoveredIdx !== null) {
            const distance = Math.abs(hoveredIdx - idx);
            if (distance === 0) scale = 1.22;
            else if (distance === 1) scale = 1.1;
          }

          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              onMouseEnter={() => !isTouchDevice && setHoveredIdx(idx)}
              onClick={() => onSelect(item.id)}
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className={`relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-college-navy text-white dark:bg-amber-400 dark:text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              {IconComponent && <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? 'text-amber-300 dark:text-slate-900' : 'text-sky-500 dark:text-sky-400'}`} />}
              <span className="text-[10px] sm:text-xs md:text-sm">{item.label}</span>
              {item.badge !== undefined && (
                <span className={`ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] ${
                  isSelected 
                    ? 'bg-amber-400 text-slate-900 dark:bg-slate-900 dark:text-amber-300 font-extrabold'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Dot under Dock Item */}
              {isSelected && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400 dark:bg-slate-950" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dock;
