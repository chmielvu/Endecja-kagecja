import React from 'react';
import { useStore } from '../store';
import { BrainCircuit, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { BakeliteCard } from './BakeliteCard'; // NEW IMPORT

export const ResearchDashboard: React.FC = () => {
  const { activeResearchTasks, isThinking } = useStore();

  if (activeResearchTasks.length === 0 && !isThinking) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-lg pointer-events-none">
      <BakeliteCard 
        title="Active Agents" 
        icon={<BrainCircuit size={16} className="text-deco-green" />}
        className="!bg-deco-panel/90 rounded-lg !border !border-deco-gold/30 !shadow-2xl backdrop-blur-md"
        headerClassName="!p-2 !border-b !border-deco-gold/20 !bg-deco-panel/90"
        chamfered={false}
      >
        <div className="flex items-center gap-2 absolute top-2 right-2">
           {isThinking && <span className="text-[10px] text-deco-gold animate-pulse">THINKING...</span>}
        </div>
        
        <div className="max-h-40 overflow-y-auto p-2 space-y-2 bg-deco-navy">
           {activeResearchTasks.map(task => (
             <div key={task.id} className="text-xs bg-deco-panel/50 rounded border border-deco-gold/20 p-2 flex gap-3 items-start animate-in slide-in-from-bottom-2">
                <div className="mt-0.5">
                   {task.status === 'running' && <Loader2 size={12} className="animate-spin text-deco-gold" />}
                   {task.status === 'complete' && <CheckCircle2 size={12} className="text-deco-green" />}
                   {task.status === 'failed' && <XCircle size={12} className="text-deco-crimson" />}
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
      </BakeliteCard>
    </div>
  );
};