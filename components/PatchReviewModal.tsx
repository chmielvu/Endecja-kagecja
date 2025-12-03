
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Check, BrainCircuit, ArrowRight, GitCommit } from 'lucide-react';
import { BakeliteCard } from './BakeliteCard';
import { BakeliteButton } from './BakeliteButton';
import { ConflictResolver, Conflict } from './ConflictResolver';

export const PatchReviewModal: React.FC = () => {
  const { pendingPatch, setPendingPatch, applyPatch, graph, updateNode } = useStore();
  const [selectedNodeIdxs, setSelectedNodeIdxs] = useState<Set<number>>(new Set());
  const [selectedEdgeIdxs, setSelectedEdgeIdxs] = useState<Set<number>>(new Set());
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  // Reset selection when patch changes
  useEffect(() => {
    if (pendingPatch) {
      setSelectedNodeIdxs(new Set(pendingPatch.nodes.map((_, i) => i)));
      setSelectedEdgeIdxs(new Set(pendingPatch.edges.map((_, i) => i)));
      setConflicts([]);
    }
  }, [pendingPatch]);

  if (!pendingPatch) return null;

  const handleApplyClick = () => {
    // 1. Detect Conflicts
    const newConflicts: Conflict[] = [];
    const nodesToApply = pendingPatch.nodes.filter((_, i) => selectedNodeIdxs.has(i));
    
    nodesToApply.forEach(patchNode => {
       const existing = graph.nodes.find(n => n.data.id === patchNode.id);
       if (existing) {
          if (patchNode.validity && JSON.stringify(patchNode.validity) !== JSON.stringify(existing.data.validity)) {
             newConflicts.push({ field: 'validity', existingValue: existing.data.validity, proposedValue: patchNode.validity, nodeLabel: existing.data.label });
          }
          if (patchNode.description && patchNode.description !== existing.data.description) {
              newConflicts.push({ field: 'description', existingValue: existing.data.description, proposedValue: patchNode.description, nodeLabel: existing.data.label });
          }
       }
    });

    if (newConflicts.length > 0) {
       setConflicts(newConflicts);
    } else {
       finalizeApply();
    }
  };

  const handleConflictResolve = (resolutions: Record<string, 'existing' | 'proposed'>) => {
     // Modifies pendingPatch content based on resolutions before applying
     // This is a simplification; ideally we'd modify the nodesToApply array derived below
     // For now, let's assuming patching "wins" unless resolution says 'existing'
     // In a real app, we'd mute the specific fields in the patch object.
     
     // Actually, simpler: applyPatch merges. If we want to keep existing, we just remove that field from the patch node.
     
     const nodesToApply = pendingPatch.nodes.filter((_, i) => selectedNodeIdxs.has(i)).map(node => {
        const newNode = { ...node };
        const label = node.label || node.id;
        
        ['validity', 'description'].forEach(field => {
             const key = `${label}-${field}`;
             if (resolutions[key] === 'existing') {
                 delete (newNode as any)[field];
             }
        });
        return newNode;
     });

     const edgesToApply = pendingPatch.edges.filter((_, i) => selectedEdgeIdxs.has(i));
     applyPatch(nodesToApply, edgesToApply);
     setPendingPatch(null);
  };

  const finalizeApply = () => {
    const nodesToApply = pendingPatch.nodes.filter((_, i) => selectedNodeIdxs.has(i));
    const edgesToApply = pendingPatch.edges.filter((_, i) => selectedEdgeIdxs.has(i));
    applyPatch(nodesToApply, edgesToApply);
    setPendingPatch(null);
  };

  const toggleNode = (i: number) => {
    const next = new Set(selectedNodeIdxs);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedNodeIdxs(next);
  };

  const toggleEdge = (i: number) => {
    const next = new Set(selectedEdgeIdxs);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedEdgeIdxs(next);
  };

  const existingNodeIds = new Set(graph.nodes.map(n => n.data.id));

  // If resolving conflicts, show that UI instead
  if (conflicts.length > 0) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <BakeliteCard 
             title="Conflict Resolution" 
             className="w-full max-w-2xl h-[80vh]"
           >
              <ConflictResolver 
                 conflicts={conflicts} 
                 onResolve={handleConflictResolve} 
                 onCancel={() => setConflicts([])} 
              />
           </BakeliteCard>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <BakeliteCard 
        title={pendingPatch.type === 'expansion' ? 'AI Graph Expansion' : 'Archives Review'}
        icon={<BrainCircuit className="text-deco-green" />}
        className="w-full max-w-4xl h-[85vh] flex flex-col"
        headerClassName="!bg-deco-panel !rounded-t-xl"
        chamfered={false}
      >
        <button onClick={() => setPendingPatch(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-deco-paper"><X size={24}/></button>
        
        {/* Reasoning Block */}
        <div className="p-6 bg-deco-panel/50 border-b border-deco-gold/20 shrink-0">
          <h3 className="text-xs font-bold text-deco-gold uppercase mb-2">Agent Reasoning</h3>
          <p className="text-sm text-deco-paper font-serif italic border-l-2 border-deco-green pl-3">
            "{pendingPatch.reasoning}"
          </p>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-deco-navy/50">
          
          {/* Nodes Column */}
          <div className="flex-1 overflow-y-auto p-4 border-r border-deco-gold/20">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-deco-navy/90 p-2 backdrop-blur-sm z-10 border-b border-deco-gold/20">
              <h3 className="text-sm font-bold text-deco-paper flex items-center gap-2">
                Nodes <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{pendingPatch.nodes.length}</span>
              </h3>
              <BakeliteButton onClick={() => setSelectedNodeIdxs(new Set())} className="text-xs" variant="secondary">Uncheck All</BakeliteButton>
            </div>
            
            <div className="space-y-3">
              {pendingPatch.nodes.map((node, i) => {
                const isUpdate = existingNodeIds.has(node.id!);
                return (
                  <label key={i} className={`flex gap-3 p-3 rounded border transition-colors cursor-pointer group ${selectedNodeIdxs.has(i) ? 'bg-deco-green/10 border-deco-green/30' : 'opacity-60 border-transparent hover:bg-deco-panel/50'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedNodeIdxs.has(i)} 
                      onChange={() => toggleNode(i)}
                      className="mt-1 rounded border-zinc-700 bg-deco-panel text-deco-green focus:ring-offset-deco-navy accent-deco-green"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${selectedNodeIdxs.has(i) ? 'text-deco-paper' : 'text-zinc-400'}`}>{node.label}</span>
                        {isUpdate && <span className="text-[10px] uppercase bg-deco-gold/30 text-deco-gold px-1 py-0.5 rounded-sm border border-deco-gold/50">Update</span>}
                        {!isUpdate && <span className="text-[10px] uppercase bg-deco-green/30 text-deco-green px-1 py-0.5 rounded-sm border border-deco-green/50">New</span>}
                        <span className="text-xs text-zinc-600 bg-deco-panel/50 px-1 py-0.5 rounded-sm border border-zinc-800">{node.type}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{node.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Edges Column */}
          <div className="flex-1 overflow-y-auto p-4">
             <div className="flex justify-between items-center mb-4 sticky top-0 bg-deco-navy/90 p-2 backdrop-blur-sm z-10 border-b border-deco-gold/20">
              <h3 className="text-sm font-bold text-deco-paper flex items-center gap-2">
                Edges <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{pendingPatch.edges.length}</span>
              </h3>
              <BakeliteButton onClick={() => setSelectedEdgeIdxs(new Set())} className="text-xs" variant="secondary">Uncheck All</BakeliteButton>
            </div>

            <div className="space-y-3">
              {pendingPatch.edges.map((edge, i) => (
                 <label key={i} className={`flex gap-3 p-3 rounded border transition-colors cursor-pointer group ${selectedEdgeIdxs.has(i) ? 'bg-deco-green/10 border-deco-green/30' : 'opacity-60 border-transparent hover:bg-deco-panel/50'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedEdgeIdxs.has(i)} 
                      onChange={() => toggleEdge(i)}
                      className="mt-1 rounded border-zinc-700 bg-deco-panel text-deco-green focus:ring-offset-deco-navy accent-deco-green"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="font-mono text-xs text-zinc-500 truncate max-w-[80px]">{edge.source}</span>
                        <ArrowRight size={12} className="text-zinc-600" />
                        <span className="font-mono text-xs text-zinc-500 truncate max-w-[80px]">{edge.target}</span>
                      </div>
                      <div className="text-xs text-deco-gold font-bold mt-1">{edge.label || edge.relationType}</div>
                    </div>
                 </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-deco-gold/20 bg-deco-panel flex justify-end gap-3 shrink-0">
          <BakeliteButton onClick={() => setPendingPatch(null)} variant="secondary">
            Discard All
          </BakeliteButton>
          <BakeliteButton 
            onClick={handleApplyClick}
            disabled={selectedNodeIdxs.size === 0 && selectedEdgeIdxs.size === 0}
            variant="primary"
            icon={<GitCommit size={16} />}
          >
            Apply Changes ({selectedNodeIdxs.size + selectedEdgeIdxs.size})
          </BakeliteButton>
        </div>

      </BakeliteCard>
    </div>
  );
};
