import React from 'react';
import { useStore } from '../store';
import { BrainCircuit, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export const ResearchDashboard: React.FC = () => {
  const { activeResearchTasks, isThinking } = useStore();

  if (activeResearchTasks.length === 0 && !isThinking) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-lg pointer-events-none">
      <div className="bg-zinc-900/90 border border-[#b45309]/30 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden pointer-events-auto">
        <div className="p-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
           <h4 className="text-xs font-bold text-zinc-400 flex items-center gap-2">
             <BrainCircuit size={12} className="text-[#355e3b]" /> ACTIVE AGENTS
           </h4>
           <div className="flex items-center gap-2">
              {isThinking && <span className="text-[10px] text-[#b45309] animate-pulse">THINKING...</span>}
           </div>
        </div>
        
        <div className="max-h-40 overflow-y-auto p-2 space-y-2">
           {activeResearchTasks.map(task => (
             <div key={task.id} className="text-xs bg-zinc-950/50 rounded border border-zinc-800 p-2 flex gap-3 items-start animate-in slide-in-from-bottom-2">
                <div className="mt-0.5">
                   {task.status === 'running' && <Loader2 size={12} className="animate-spin text-[#b45309]" />}
                   {task.status === 'complete' && <CheckCircle2 size={12} className="text-[#355e3b]" />}
                   {task.status === 'failed' && <XCircle size={12} className="text-[#be123c]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                     <span className="font-bold text-zinc-300 uppercase">{task.type}</span>
                     <span className="text-zinc-600 font-mono">{task.target}</span>
                  </div>
                  <p className="text-zinc-500 italic mt-1 line-clamp-1">{task.reasoning}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};