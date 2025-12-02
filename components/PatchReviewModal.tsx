import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Check, BrainCircuit, ArrowRight, GitCommit } from 'lucide-react';

export const PatchReviewModal: React.FC = () => {
  const { pendingPatch, setPendingPatch, applyPatch, graph } = useStore();
  const [selectedNodeIdxs, setSelectedNodeIdxs] = useState<Set<number>>(new Set());
  const [selectedEdgeIdxs, setSelectedEdgeIdxs] = useState<Set<number>>(new Set());

  // Reset selection when patch changes
  useEffect(() => {
    if (pendingPatch) {
      setSelectedNodeIdxs(new Set(pendingPatch.nodes.map((_, i) => i)));
      setSelectedEdgeIdxs(new Set(pendingPatch.edges.map((_, i) => i)));
    }
  }, [pendingPatch]);

  if (!pendingPatch) return null;

  const handleApply = () => {
    const nodesToApply = pendingPatch.nodes.filter((_, i) => selectedNodeIdxs.has(i));
    const edgesToApply = pendingPatch.edges.filter((_, i) => selectedEdgeIdxs.has(i));
    applyPatch(nodesToApply, edgesToApply);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-[#b45309]/30 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#b45309]/20 flex justify-between items-start bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <BrainCircuit className="text-[#355e3b]" /> 
              {pendingPatch.type === 'expansion' ? 'AI Graph Expansion' : 'Archives Review'}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">Review proposed changes before applying to the Knowledge Graph.</p>
          </div>
          <button onClick={() => setPendingPatch(null)} className="text-zinc-500 hover:text-white"><X size={24}/></button>
        </div>

        {/* Reasoning Block */}
        <div className="p-6 bg-zinc-900/30 border-b border-zinc-800 shrink-0">
          <h3 className="text-xs font-bold text-[#b45309] uppercase mb-2">Agent Reasoning</h3>
          <p className="text-sm text-zinc-300 font-serif italic border-l-2 border-[#355e3b] pl-3">
            "{pendingPatch.reasoning}"
          </p>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Nodes Column */}
          <div className="flex-1 overflow-y-auto p-4 border-r border-zinc-800">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-zinc-950/90 p-2 backdrop-blur-sm z-10 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Nodes <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{pendingPatch.nodes.length}</span>
              </h3>
              <button onClick={() => setSelectedNodeIdxs(new Set())} className="text-xs text-zinc-500 hover:text-white">Uncheck All</button>
            </div>
            
            <div className="space-y-3">
              {pendingPatch.nodes.map((node, i) => {
                const isUpdate = existingNodeIds.has(node.id!);
                return (
                  <label key={i} className={`flex gap-3 p-3 rounded border transition-colors cursor-pointer group ${selectedNodeIdxs.has(i) ? 'bg-[#355e3b]/10 border-[#355e3b]/30' : 'opacity-60 border-transparent hover:bg-zinc-900'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedNodeIdxs.has(i)} 
                      onChange={() => toggleNode(i)}
                      className="mt-1 rounded border-zinc-700 bg-zinc-900 text-[#355e3b] focus:ring-offset-zinc-950 accent-[#355e3b]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${selectedNodeIdxs.has(i) ? 'text-white' : 'text-zinc-400'}`}>{node.label}</span>
                        {isUpdate && <span className="text-[10px] uppercase bg-amber-900/30 text-amber-400 px-1 rounded border border-amber-900/50">Update</span>}
                        {!isUpdate && <span className="text-[10px] uppercase bg-emerald-900/30 text-emerald-400 px-1 rounded border border-emerald-900/50">New</span>}
                        <span className="text-xs text-zinc-600 bg-zinc-900 px-1 rounded border border-zinc-800">{node.type}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{node.description}</p>
                      {node.dates && <p className="text-[10px] font-mono text-zinc-600 mt-1">{node.dates} • {node.region}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Edges Column */}
          <div className="flex-1 overflow-y-auto p-4">
             <div className="flex justify-between items-center mb-4 sticky top-0 bg-zinc-950/90 p-2 backdrop-blur-sm z-10 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Edges <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{pendingPatch.edges.length}</span>
              </h3>
              <button onClick={() => setSelectedEdgeIdxs(new Set())} className="text-xs text-zinc-500 hover:text-white">Uncheck All</button>
            </div>

            <div className="space-y-3">
              {pendingPatch.edges.map((edge, i) => (
                 <label key={i} className={`flex gap-3 p-3 rounded border transition-colors cursor-pointer group ${selectedEdgeIdxs.has(i) ? 'bg-[#355e3b]/10 border-[#355e3b]/30' : 'opacity-60 border-transparent hover:bg-zinc-900'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedEdgeIdxs.has(i)} 
                      onChange={() => toggleEdge(i)}
                      className="mt-1 rounded border-zinc-700 bg-zinc-900 text-[#355e3b] focus:ring-offset-zinc-950 accent-[#355e3b]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="font-mono text-xs text-zinc-500 truncate max-w-[80px]">{edge.source}</span>
                        <ArrowRight size={12} className="text-zinc-600" />
                        <span className="font-mono text-xs text-zinc-500 truncate max-w-[80px]">{edge.target}</span>
                      </div>
                      <div className="text-xs text-[#b45309] font-bold mt-1">{edge.label}</div>
                      {edge.sign === 'negative' && <div className="text-[10px] text-red-400 mt-0.5">Negative / Conflict</div>}
                    </div>
                 </label>
              ))}
              {pendingPatch.edges.length === 0 && (
                <div className="text-center text-zinc-600 text-sm py-8 italic">No new relationships proposed.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
          <button onClick={() => setPendingPatch(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Discard All
          </button>
          <button 
            onClick={handleApply}
            disabled={selectedNodeIdxs.size === 0 && selectedEdgeIdxs.size === 0}
            className="px-6 py-2 bg-[#355e3b] hover:bg-[#2a4a2f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded flex items-center gap-2 shadow-lg shadow-[#355e3b]/20"
          >
            <GitCommit size={16} />
            Apply Changes ({selectedNodeIdxs.size + selectedEdgeIdxs.size})
          </button>
        </div>

      </div>
    </div>
  );
};