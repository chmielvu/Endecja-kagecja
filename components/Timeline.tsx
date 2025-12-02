import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, Pause, Rewind } from 'lucide-react';
import { TIMELINE_KEYFRAMES } from '../constants';

export const Timeline: React.FC = () => {
  const { timelineYear, setFilterYear, isPlaying, setIsPlaying } = useStore();
  const intervalRef = useRef<number | null>(null);
  
  // Continuous range 1880 - 1945 (Endecja Peak Era)
  const MIN_YEAR = 1880;
  const MAX_YEAR = 1945;

  useEffect(() => {
    if (isPlaying) {
      if (timelineYear === null) setFilterYear(MIN_YEAR);
      
      intervalRef.current = window.setInterval(() => {
        setFilterYear((prev) => {
           // If we just started, prev might be null
           const current = prev || MIN_YEAR;
           if (current >= MAX_YEAR) {
             setIsPlaying(false);
             return MAX_YEAR;
           }
           return current + 1;
        });
      }, 800); // 800ms per year
    } else {
      if (intervalRef.current) {
         clearInterval(intervalRef.current);
         intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, timelineYear, setFilterYear, setIsPlaying]);

  const handlePlayToggle = () => {
    if (timelineYear && timelineYear >= MAX_YEAR) {
        setFilterYear(MIN_YEAR); // Restart if at end
    }
    setIsPlaying(!isPlaying);
  };

  const resetTimeline = () => {
    setIsPlaying(false);
    setFilterYear(null);
  };

  return (
    <div className="h-16 bg-surface border-t border-archival-gold/20 flex items-center px-4 gap-4 shrink-0 relative z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
      
      {/* Controls */}
      <div className="flex items-center gap-2">
         <button 
           onClick={handlePlayToggle}
           className={`p-2 rounded-full border transition-all ${isPlaying 
             ? 'bg-crimson/10 text-crimson border-crimson/50 animate-pulse' 
             : 'bg-owp-green/10 text-owp-green border-owp-green/50 hover:bg-owp-green hover:text-white'}`}
           title={isPlaying ? "Pause History" : "Play History"}
         >
           {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
         </button>
         
         <button 
           onClick={resetTimeline}
           className={`text-xs font-mono px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap border flex items-center gap-2 ${timelineYear === null ? 'bg-archival-gold text-white border-archival-gold' : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
         >
           <Rewind size={12} /> ALL TIME
         </button>
      </div>
      
      <div className="w-[1px] h-8 bg-zinc-800 mx-2"></div>

      {/* Slider Area */}
      <div className="flex-1 flex flex-col justify-center relative">
        <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-2 uppercase relative z-10">
           <span>{MIN_YEAR}</span>
           
           {/* Floating Year Indicator */}
           <div 
             className="absolute top-0 transform -translate-x-1/2 transition-all duration-300"
             style={{ 
               left: timelineYear 
                 ? `${((timelineYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%` 
                 : '50%',
               opacity: timelineYear ? 1 : 0
             }}
           >
              <span className="text-archival-gold font-bold text-lg font-spectral bg-surface px-2 border border-archival-gold/30 rounded">
                {timelineYear}
              </span>
           </div>

           <span>{MAX_YEAR}</span>
        </div>
        
        {/* Keyframe Markers (Absolute behind slider) */}
        <div className="absolute w-full h-8 top-0 pointer-events-none">
          {TIMELINE_KEYFRAMES.map(kf => (
            <div 
              key={kf.year}
              className="absolute transform -translate-x-1/2 flex flex-col items-center"
              style={{ 
                left: `${((kf.year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                top: '-16px'
              }}
            >
              <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: kf.color }} />
              <span className="text-[8px] text-zinc-600 whitespace-nowrap mt-0.5 opacity-60 font-sans tracking-tight hidden md:block">{kf.label}</span>
            </div>
          ))}
        </div>

        <div className="relative w-full h-2 flex items-center mt-1">
          {/* Track Background */}
          <div className="absolute w-full h-1 bg-zinc-800 rounded-lg"></div>
          
          {/* Progress Bar */}
          <div 
            className="absolute h-1 bg-archival-gold rounded-l-lg transition-all duration-100"
            style={{ width: timelineYear ? `${((timelineYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%` : '100%' }}
          ></div>

          <input 
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            value={timelineYear || MAX_YEAR} // Default to max when null for UI consistency
            onChange={(e) => {
               setIsPlaying(false);
               setFilterYear(parseInt(e.target.value));
            }}
            className="w-full h-4 bg-transparent appearance-none cursor-pointer z-10 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-archival-gold 
              [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(180,83,9,0.5)]
              hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
          />
        </div>
        
        {/* Ticks */}
        <div className="w-full flex justify-between mt-1 px-1 opacity-30">
          {Array.from({ length: 13 }).map((_, i) => (
             <div key={i} className={`w-[1px] ${i % 2 === 0 ? 'h-2 bg-zinc-500' : 'h-1 bg-zinc-700'}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
};
