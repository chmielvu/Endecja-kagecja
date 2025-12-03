
import React from 'react';
import { THEME } from '../constants'; // Import THEME for consistent color usage

export const MieczykIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Sword Hilt - Tarnished Gold */}
    <path 
      d="M10 2C10 3 11 3 12 3C13 3 14 3 14 2L15 3C15 4 14.5 5 12 5C9.5 5 9 4 9 3L10 2Z" 
      fill={THEME.colors.antiqueBrass} 
      stroke={THEME.colors.antiqueBrass} 
      strokeWidth="0.5"
    />
    <path 
      d="M9 5H15V6H9V5Z" 
      fill={THEME.colors.antiqueBrass} 
      stroke={THEME.colors.antiqueBrass} 
      strokeWidth="0.5"
    />

    {/* Sword Blade - Sand/Light Grey (Parchment) */}
    <path 
      d="M12 6V21.5L11 20.5L13 20.5L12 21.5L12 6Z" 
      fill={THEME.colors.parchment} 
      stroke={THEME.colors.textDim} 
      strokeWidth="0.5"
    />

    {/* Ribbon - White and Red, wrapped around the blade */}
    {/* White sections (Parchment) */}
    <path 
      d="M11 9L13 9L13 10L11 10L11 9Z" 
      fill={THEME.colors.parchment} 
      stroke={THEME.colors.textDim} 
      strokeWidth="0.2"
    />
    <path 
      d="M11 12L13 12L13 13L11 13L11 12Z" 
      fill={THEME.colors.parchment} 
      stroke={THEME.colors.textDim} 
      strokeWidth="0.2"
    />
    <path 
      d="M11 15L13 15L13 16L11 16L11 15Z" 
      fill={THEME.colors.parchment} 
      stroke={THEME.colors.textDim} 
      strokeWidth="0.2"
    />

    {/* Red sections (Crimson) */}
    <path 
      d="M11 10L13 10L13 11L11 11L11 10Z" 
      fill={THEME.colors.crimson} 
      stroke={THEME.colors.crimson} 
      strokeWidth="0.2"
    />
    <path 
      d="M11 13L13 13L13 14L11 14L11 13Z" 
      fill={THEME.colors.crimson} 
      stroke={THEME.colors.crimson} 
      strokeWidth="0.2"
    />
    <path 
      d="M11 16L13 16L13 17L11 17L11 16Z" 
      fill={THEME.colors.crimson} 
      stroke={THEME.colors.crimson} 
      strokeWidth="0.2"
    />

    {/* Optional: Small Polish Eagle on Hilt (simplified) */}
    <path 
      d="M12 7.5L11.5 7L12 6.5L12.5 7L12 7.5Z" 
      fill={THEME.colors.crimson} 
      stroke={THEME.colors.crimson} 
      strokeWidth="0.1"
    />
    <circle cx="12" cy="7" r="1.5" fill={THEME.colors.parchment} stroke={THEME.colors.crimson} strokeWidth="0.1" />

  </svg>
);
