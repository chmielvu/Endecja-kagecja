import React from 'react';
import { cn } from '../services/utils'; // Assuming cn for utility classes

interface BakeliteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  chamfered?: boolean;
}

export const BakeliteCard: React.FC<BakeliteCardProps> = ({ 
  children, 
  title, 
  icon, 
  className = "", 
  headerClassName = "",
  bodyClassName = "",
  chamfered = true,
  ...props 
}) => {
  const cardClasses = `
    bg-deco-panel border-2 border-deco-gold/30 shadow-lg relative overflow-hidden
    ${chamfered ? 'clip-chamfer-lg' : 'rounded-lg'}
  `;

  return (
    <div className={cn(cardClasses, className)} {...props}>
      {title && (
        <div className={cn("p-4 border-b border-deco-gold/30 flex items-center gap-3", headerClassName)}>
          {icon && <span className="text-deco-gold">{icon}</span>}
          <h3 className="text-lg font-spectral font-bold text-deco-paper">{title}</h3>
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>
        {children}
      </div>
    </div>
  );
};
