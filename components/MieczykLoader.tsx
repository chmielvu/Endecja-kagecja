
import React from 'react';

export const MieczykLoader: React.FC<{ className?: string, size?: number }> = ({ className = "", size = 48 }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
        {/* Sword Blade */}
        <path d="M12 2L12 22" stroke="#e5e5c0" strokeWidth="2" strokeLinecap="round" />
        {/* Crossguard */}
        <path d="M8 8H16" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        {/* Ribbon Wrapping */}
        <path d="M12 11C15 11 16 12 16 13C16 14.5 13 15 12 15" stroke="#1e3a25" strokeWidth="2" className="opacity-80" />
        <path d="M12 15C9 15 8 16 8 17C8 18.5 11 19 12 19" stroke="#1e3a25" strokeWidth="2" className="opacity-80" />
        <path d="M12 11C9 11 8 10 8 9" stroke="#1e3a25" strokeWidth="2" className="opacity-80" />
        {/* Glow */}
        <circle cx="12" cy="12" r="8" stroke="#b45309" strokeWidth="0.5" strokeDasharray="2 2" className="animate-spin-slow origin-center" />
      </svg>
    </div>
  );
};
