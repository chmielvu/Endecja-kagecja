
import React from 'react';
import { NodeData, SourceCitation } from '../types';
import { BakeliteCard } from './BakeliteCard';
import { BakeliteButton } from './BakeliteButton';
import { Check, X, AlertTriangle } from 'lucide-react';

export interface Conflict {
  field: string;
  existingValue: any;
  proposedValue: any;
  nodeLabel: string;
}

interface ConflictResolverProps {
  conflicts: Conflict[];
  onResolve: (resolutions: Record<string, 'existing' | 'proposed'>) => void;
  onCancel: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({ conflicts, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = React.useState<Record<string, 'existing' | 'proposed'>>({});

  const handleChoice = (field: string, choice: 'existing' | 'proposed') => {
    setResolutions(prev => ({ ...prev, [field]: choice }));
  };

  const isComplete = conflicts.every(c => resolutions[`${c.nodeLabel}-${c.field}`]);

  const handleSubmit = () => {
    onResolve(resolutions);
  };

  const formatValue = (val: any): string => {
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-deco-crimson/10 border-b border-deco-crimson/30 flex items-center gap-3">
        <AlertTriangle className="text-deco-crimson" size={20} />
        <div>
          <h3 className="text-sm font-bold text-deco-paper uppercase">Data Conflicts Detected</h3>
          <p className="text-xs text-zinc-400">Historical records contradict incoming intelligence. Please adjudicate.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-deco-navy/50">
        {conflicts.map((conflict, idx) => {
           const key = `${conflict.nodeLabel}-${conflict.field}`;
           const choice = resolutions[key];

           return (
             <div key={idx} className="bg-deco-panel border border-deco-gold/20 rounded p-4">
               <h4 className="text-sm font-bold text-deco-gold mb-2 font-spectral">
                 {conflict.nodeLabel} <span className="text-zinc-500 mx-2">/</span> {conflict.field}
               </h4>
               
               <div className="grid grid-cols-2 gap-4">
                 {/* Existing */}
                 <div 
                   onClick={() => handleChoice(key, 'existing')}
                   className={`cursor-pointer p-3 border rounded transition-all ${choice === 'existing' ? 'border-deco-gold bg-deco-gold/10' : 'border-zinc-700 hover:bg-white/5'}`}
                 >
                   <div className="text-[10px] uppercase text-zinc-500 mb-1">Archive Record</div>
                   <div className="text-sm text-zinc-300 font-mono break-all">{formatValue(conflict.existingValue)}</div>
                   {choice === 'existing' && <div className="mt-2 text-deco-gold flex items-center gap-1 text-xs"><Check size={12}/> Kept</div>}
                 </div>

                 {/* Proposed */}
                 <div 
                   onClick={() => handleChoice(key, 'proposed')}
                   className={`cursor-pointer p-3 border rounded transition-all ${choice === 'proposed' ? 'border-deco-green bg-deco-green/10' : 'border-zinc-700 hover:bg-white/5'}`}
                 >
                    <div className="text-[10px] uppercase text-zinc-500 mb-1">New Proposal</div>
                    <div className="text-sm text-deco-paper font-mono break-all">{formatValue(conflict.proposedValue)}</div>
                    {choice === 'proposed' && <div className="mt-2 text-deco-green flex items-center gap-1 text-xs"><Check size={12}/> Accepted</div>}
                 </div>
               </div>
             </div>
           );
        })}
      </div>

      <div className="p-4 border-t border-deco-gold/20 bg-deco-panel flex justify-end gap-3">
        <BakeliteButton onClick={onCancel} variant="secondary">Cancel Patch</BakeliteButton>
        <BakeliteButton onClick={handleSubmit} disabled={!isComplete} variant="primary">
          Confirm Resolutions
        </BakeliteButton>
      </div>
    </div>
  );
};
