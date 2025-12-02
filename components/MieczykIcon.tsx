import React from 'react';

export const MieczykIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* The Sword (Szczerbiec) */}
    <path d="M12 3V21" strokeWidth="2" /> {/* Blade */}
    <path d="M9 8H15" strokeWidth="2" />   {/* Crossguard */}
    <path d="M12 3L10.5 5H13.5L12 3Z" fill="currentColor" stroke="none" /> {/* Tip/Pommel detail */}
    <circle cx="12" cy="21" r="1" fill="currentColor" stroke="none" /> {/* Pommel */}

    {/* The Ribbon (Sash) wrapping the blade */}
    <path d="M12 11C14 11 15 12 15 13C15 14 12 15 12 15" className="opacity-80" />
    <path d="M12 15C10 15 9 16 9 17C9 18 12 19 12 19" className="opacity-80" />
    <path d="M12 11C10 11 9 10 9 9" className="opacity-80" />
  </svg>
);