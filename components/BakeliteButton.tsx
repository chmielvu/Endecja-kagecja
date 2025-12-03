import React from 'react';
import { cn } from '../services/utils'; // Assuming cn for utility classes

interface BakeliteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const BakeliteButton: React.FC<BakeliteButtonProps> = ({ 
  children, 
  icon, 
  className = "", 
  variant = 'primary', 
  ...props 
}) => {
  let buttonClasses = `
    flex items-center justify-center gap-2 px-4 py-2 text-sm font-spectral font-bold uppercase tracking-widest
    rounded-none transition-all duration-200 relative overflow-hidden
    shadow-inner-sm
  `;

  if (variant === 'primary') {
    buttonClasses += `
      text-deco-paper border-2 border-double border-deco-gold bg-deco-panel 
      hover:bg-deco-gold/20 hover:text-deco-paper shadow-[0_0_20px_rgba(212,175,55,0.4)];
    `;
  } else if (variant === 'secondary') {
    buttonClasses += `
      text-zinc-400 border border-zinc-700 bg-deco-panel 
      hover:text-deco-paper hover:border-deco-gold/50 hover:bg-deco-gold/10;
    `;
  } else if (variant === 'danger') {
    buttonClasses += `
      text-deco-crimson border-2 border-deco-crimson/50 bg-deco-crimson/10 
      hover:bg-deco-crimson/30 hover:border-deco-crimson;
    `;
  }

  // Chamfered corners matching the existing .btn-deco
  buttonClasses += ` clip-chamfer`;

  return (
    <button 
      className={cn(buttonClasses, className)} 
      {...props}
    >
      {icon && <span className="text-deco-gold/80 group-hover:text-deco-gold">{icon}</span>}
      {children}
    </button>
  );
};
