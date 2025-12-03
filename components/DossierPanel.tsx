


import React from 'react';
import { useStore } from '../store';
import { NodeData, TemporalFactType } from '../types';
import { X, BookOpenCheck, ArrowLeft, Stamp, FileText, Globe, Shield } from 'lucide-react';
import { generateNodeDeepening } from '../services/geminiService';

export const DossierPanel: React.FC<{ node: NodeData }> = ({ node }) => {
  const { 
    clearSelection, 
    setThinking, 
    addResearchTask, 
    updateResearchTask, 
    setPendingPatch, 
    addToast,
    graph 
  } = useStore();

  const handleDeepen = async () => {
    clearSelection(); // Close dossier before deepening
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({
        id: taskId,
        type: 'deepening',
        target: node.label,
        status: 'running',
        reasoning: 'Interrogating archives for detailed dossier...'
    });

    try {
      const result = await generateNodeDeepening(node, graph);
      setPendingPatch(result); // Pass the full GraphPatch
      updateResearchTask(taskId, { status: 'complete', reasoning: result.reasoning });
    } catch (e) {
      addToast({ title: 'Research Failed', description: 'Archives unavailable.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Query failed.' });
    } finally {
      setThinking(false);
    }
  };

  const isConfirmed = node.certainty === 'confirmed';
  const rankBars = Math.ceil((node.pagerank || 0) * 5); // 1-5 scale

  // Display temporal validity
  const displayValidity = (validity?: TemporalFactType) => {
    if (!validity) return 'Unknown period';
    if (validity.type === 'instant') return validity.timestamp;
    if (validity.type === 'interval') return `${validity.start}-${validity.end}`;
    if (validity.type === 'fuzzy') return validity.approximate;
    return 'Unknown period';
  };

  return (
    <div className="h-full flex flex-col bg-deco-panel text-deco-paper relative overflow-hidden font-spectral">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-deco-pattern opacity-10 pointer-events-none z-0"></div>
      
      {/* Header (Folder Tab) */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b-2 border-double border-deco-gold/40 bg-deco-panel shadow-sm">
        <button 
          onClick={clearSelection}
          className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-deco-gold hover:text-deco-paper transition-colors"
        >
          <ArrowLeft size={14} /> Back to Intel
        </button>
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500">ID: {node.id.substring(0,8).toUpperCase()}</span>
            <button onClick={clearSelection}><X size={18} className="text-zinc-500 hover:text-deco-crimson"/></button>
        </div>
      </div>

      {/* Main Content (Paper) */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10 bg-deco-navy/20">
        
        {/* Stamp */}
        {isConfirmed && (
            <div className="absolute top-6 right-6 border-4 border-deco-gold/30 text-deco-gold/30 font-bold uppercase p-2 text-xs transform rotate-[-12deg] pointer-events-none select-none">
                VERIFIED SOURCE
            </div>
        )}
        {!isConfirmed && (
             <div className="absolute top-6 right-6 border-4 border-deco-crimson/30 text-deco-crimson/30 font-bold uppercase p-2 text-xs transform rotate-[5deg] pointer-events-none select-none">
                UNCONFIRMED
            </div>
        )}

        {/* Title Block */}
        <div className="mb-6 border-b-2 border-double border-deco-gold/30 pb-4">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-deco-gold bg-deco-panel/30 px-1 rounded">
                {node.type}
             </span>
             {node.region && node.region.label && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    • {node.region.label}
                </span>
             )}
           </div>
           <h2 className="text-3xl font-spectral font-bold text-deco-paper leading-tight">
             {node.label}
           </h2>
           {node.validity && (
             <p className="font-mono text-sm text-deco-gold mt-1">{displayValidity(node.validity)}</p>
           )}
        </div>

        {/* Rank Strip */}
        <div className="mb-6 bg-deco-panel/50 p-3 rounded-none border border-deco-gold/30 flex items-center justify-between">
           <span className="text-xs font-bold uppercase text-deco-gold">Influence Rank</span>
           <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 w-6 rounded-sm ${i < rankBars ? 'bg-deco-gold' : 'bg-zinc-700'}`}
                  ></div>
              ))}
           </div>
        </div>

        {/* Description */}
        <div className="prose prose-sm prose-p:text-deco-paper prose-headings:font-spectral mb-8">
           <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500">Subject Profile</h4>
           <p className="whitespace-pre-wrap leading-relaxed text-deco-paper/90">
             {node.description || "No detailed profile available in the current archives."}
           </p>
        </div>

        {/* Existence/Roles (NEW) */}
        {(node.existence && node.existence.length > 0) && (
            <div className="mb-8">
                <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500 flex items-center gap-2">
                    <FileText size={12} /> Existence & Status
                </h4>
                <ul className="space-y-2">
                    {node.existence.map((item, i) => (
                        <li key={i} className="text-xs font-mono text-zinc-400 flex items-start gap-2 bg-deco-navy/50 p-1.5 rounded-sm">
                            <span className="text-deco-gold select-none">[{item.status.toUpperCase()}]</span>
                            <span>{item.start}{item.end ? ` - ${item.end}` : ''}{item.context ? ` (${item.context})` : ''}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {(node.roles && node.roles.length > 0) && (
            <div className="mb-8">
                <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500 flex items-center gap-2">
                    <FileText size={12} /> Key Roles
                </h4>
                <ul className="space-y-2">
                    {node.roles.map((item, i) => (
                        <li key={i} className="text-xs font-mono text-zinc-400 flex items-start gap-2 bg-deco-navy/50 p-1.5 rounded-sm">
                            <span className="text-deco-gold select-none">[{item.role.toUpperCase()}]</span>
                            <span>{item.organization ? ` in ${item.organization}` : ''} {item.start}{item.end ? ` - ${item.end}` : ''}{item.context ? ` (${item.context})` : ''}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}


        {/* Sources / References */}
        <div className="mb-8">
            <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500 flex items-center gap-2">
                <Globe size={12} /> Intelligence Sources
            </h4>
            <ul className="space-y-2">
                {node.sources && node.sources.length > 0 ? (
                    node.sources.map((src, i) => (
                        <li key={i} className="text-xs font-mono text-zinc-400 flex items-start gap-2 bg-deco-navy/50 p-1.5 rounded-sm">
                            <span className="text-deco-gold select-none">[REF-{i+1}]</span>
                            <span className="break-all">
                              {src.label || src.uri}
                              {src.type && ` (${src.type})`}
                              {src.page && `, pg. ${src.page}`}
                            </span>
                        </li>
                    ))
                ) : (
                    <li className="text-xs italic text-zinc-500">No primary sources linked.</li>
                )}
            </ul>
        </div>

        {/* Metrics Table */}
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="bg-deco-navy/50 p-2 rounded-sm border border-deco-gold/20">
              <div className="text-[10px] uppercase text-zinc-500">Centrality</div>
              <div className="font-mono font-bold text-lg text-deco-gold">{(node.degreeCentrality || 0).toFixed(2)}</div>
           </div>
           <div className="bg-deco-navy/50 p-2 rounded-sm border border-deco-gold/20">
              <div className="text-[10px] uppercase text-zinc-500">Risk Score</div>
              <div className="font-mono font-bold text-lg text-deco-crimson">{(node.security?.risk || 0).toFixed(2)}</div>
           </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 bg-deco-panel border-t-2 border-double border-deco-gold/40 relative z-10 flex gap-2">
         <button 
           onClick={handleDeepen}
           className="flex-1 btn-deco bg-deco-gold text-deco-navy hover:bg-deco-gold/90 border-transparent shadow-lg flex items-center justify-center gap-2"
         >
           <BookOpenCheck size={16} /> Research Further
         </button>
      </div>
    </div>
  );
};