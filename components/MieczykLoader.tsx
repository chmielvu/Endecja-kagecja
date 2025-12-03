

import React from 'react';
import { MieczykIcon } from './MieczykIcon'; // Import the new MieczykIcon

export const MieczykLoader: React.FC<{ className?: string, size?: number }> = ({ className = "", size = 48 }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <MieczykIcon size={size} className="animate-pulse" />
    </div>
  );
};