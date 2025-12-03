import React from 'react';
import { cn } from '../services/utils'; // Assuming cn for utility classes

interface BakeliteInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  multiline?: boolean;
  rows?: number;
  // FIX: Added icon prop
  icon?: React.ReactNode;
}

export const BakeliteInput: React.FC<BakeliteInputProps> = ({ label, className = "", multiline = false, rows = 3, icon, ...props }) => {
  const inputClasses = `
    w-full bg-deco-panel border border-deco-gold/50 rounded-sm px-3 py-2 text-sm 
    text-deco-paper focus:outline-none focus:border-deco-gold 
    font-serif placeholder:font-sans placeholder:text-zinc-600 transition-colors
    shadow-inner-sm resize-none
  `;

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-bold text-zinc-400 uppercase">{label}</label>}
      {/* FIX: Added a wrapper div to position the icon and adjusted input padding */}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-zinc-500 pointer-events-none">
            {icon}
          </div>
        )}
        <InputComponent
          className={cn(inputClasses, className, icon ? 'pl-9' : '')} // Add left-padding if icon is present
          {...(multiline ? { rows } : {})}
          {...props}
        />
      </div>
    </div>
  );
};