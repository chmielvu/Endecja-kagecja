import React from 'react';
import { useStore } from '../store';
import { NodeData, TemporalFactType } from '../types';
import { X, BookOpenCheck, ArrowLeft, FileText, Globe, Shield, ExternalLink } from 'lucide-react';
import { generateNodeDeepening } from '../services/geminiService';
import { BakeliteButton } from './BakeliteButton';
import { BakeliteCard } from './BakeliteCard';

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
    // Keep dossier open during deepening for context, but disable actions
    // clearSelection(); // Decided to keep dossier open, as requested in previous analysis
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({
        id: taskId,
        type: 'deepening',
        target: node.label,
        status: 'running',
        reasoning: 'Querying historical database for entity expansion...'
    });

    try {
      const result = await generateNodeDeepening(node, graph);
      setPendingPatch(result); // Pass the full GraphPatch
      updateResearchTask(taskId, { status: 'complete', reasoning: result.reasoning });
      addToast({ title: 'Graph Expanded', description: `New nodes and edges added for ${node.label}.`, type: 'success' });
    } catch (e) {
      addToast({ title: 'Expansion Failed', description: 'Data retrieval failed.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Query failed.' });
    } finally {
      setThinking(false);
    }
  };

  const isConfirmed = node.certainty === 'confirmed';
  const rankBars = Math.ceil((node.pagerank || 0) * 5); // 1-5 scale for visual rank

  // Helper to display TemporalFactType
  const displayValidity = (validity?: TemporalFactType) => {
    if (!validity) return 'Unknown period';
    switch (validity.type) {
      case 'instant': return validity.timestamp;
      case 'interval': return `${validity.start} - ${validity.end}`;
      case 'fuzzy': return `Approx. ${validity.approximate}`;
      default: return 'Unknown period';
    }
  };

  return (
    <BakeliteCard
      title={node.label} 
      icon={<FileText size={20} className="text-deco-gold"/>}
      className="h-full flex flex-col font-spectral"
      headerClassName="!p-4 !border-b-2 !border-double !border-deco-gold/40 !bg-deco-panel !shadow-sm !rounded-none"
      chamfered={false} 
    >
      {/* Header (Navigation) */}
      <div className="absolute top-0 right-0 z-10 flex items-center gap-2 p-4">
        <BakeliteButton 
          onClick={clearSelection}
          className="!px-3 !py-1 !text-xs !font-bold !uppercase !tracking-widest"
          icon={<ArrowLeft size={14} />}
          variant="secondary"
        >
          Close
        </BakeliteButton>
        <BakeliteButton onClick={clearSelection} className="!p-1 !px-2" variant="secondary" icon={<X size={18} />}>
          <span className="sr-only">Close Inspector</span>
        </BakeliteButton>
      </div>
      <p className="text-[10px] font-mono text-zinc-500 absolute top-10 left-16">UUID: {node.id.substring(0, 8).toUpperCase()}</p>

      {/* Main Content (Paper) */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10 bg-deco-navy/20">
        
        {/* Verification Stamp */}
        {isConfirmed && (
            <div className="absolute top-6 right-6 border-4 border-deco-gold/30 text-deco-gold/30 font-bold uppercase p-2 text-xs transform rotate-[-12deg] pointer-events-none select-none">
                VERIFIED FACT
            </div>
        )}
        {!isConfirmed && (
             <div className="absolute top-6 right-6 border-4 border-deco-crimson/30 text-deco-crimson/30 font-bold uppercase p-2 text-xs transform rotate-[5deg] pointer-events-none select-none">
                CITATION NEEDED
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
           {node.validity && (
             <p className="font-mono text-sm text-deco-gold mt-1">{displayValidity(node.validity)}</p>
           )}
        </div>

        {/* Technical Metrics Strip */}
        <div className="mb-6 bg-deco-panel/50 p-3 rounded-none border border-deco-gold/30 flex items-center justify-between">
           <span className="text-xs font-bold uppercase text-deco-gold">PageRank Score</span>
           <div className="flex gap-1" title={`PageRank: ${node.pagerank?.toFixed(4) || 0}`}>
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
           <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500">Entity Properties</h4>
           <p className="whitespace-pre-wrap leading-relaxed text-deco-paper/90 font-serif">
             {node.description || "No biographical data available."}
           </p>
        </div>

        {/* Existence/Roles */}
        {(node.existence && node.existence.length > 0) && (
            <div className="mb-8">
                <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500 flex items-center gap-2">
                    <FileText size={12} className="text-zinc-500"/> Timeline & Status
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
                    <FileText size={12} className="text-zinc-500"/> Roles & Affiliations
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

        {/* Bibliography */}
        <div className="mb-8">
            <h4 className="text-xs font-bold uppercase border-b border-deco-gold/30 mb-2 pb-1 text-zinc-500 flex items-center gap-2">
                <Globe size={12} className="text-zinc-500"/> Bibliography
            </h4>
            <ul className="space-y-2">
                {node.sources && node.sources.length > 0 ? (
                    node.sources.map((src, i) => (
                        <li key={i} className="text-xs font-mono text-zinc-400 flex items-start gap-2 bg-deco-navy/50 p-1.5 rounded-sm">
                            <span className="text-deco-gold select-none">[REF-{i+1}]</span>
                            <span className="break-all">
                              {src.uri ? <a href={src.uri} target="_blank" rel="noopener noreferrer" className="text-deco-gold hover:underline">{src.label || src.uri} <ExternalLink size={10} className="inline-block ml-1"/></a> : src.label}
                              {src.type && ` (${src.type})`}
                              {src.page && `, pg. ${src.page}`}
                            </span>
                        </li>
                    ))
                ) : (
                    <li className="text-xs italic text-zinc-500">No sources linked.</li>
                )}
            </ul>
        </div>

        {/* Graph Metrics Table */}
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="bg-deco-navy/50 p-2 rounded-sm border border-deco-gold/20">
              <div className="text-[10px] uppercase text-zinc-500">Degree Centrality</div>
              <div className="font-mono font-bold text-lg text-deco-gold">{(node.degreeCentrality || 0).toFixed(4)}</div>
           </div>
           <div className="bg-deco-navy/50 p-2 rounded-sm border border-deco-gold/20">
              <div className="text-[10px] uppercase text-zinc-500">Betweenness</div>
              <div className="font-mono font-bold text-lg text-deco-crimson">{(node.betweenness || 0).toFixed(4)}</div>
           </div>
           {/* NEW: Closeness Centrality */}
           <div className="bg-deco-navy/50 p-2 rounded-sm border border-deco-gold/20">
              <div className="text-[10px] uppercase text-zinc-500">Closeness</div>
              <div className="font-mono font-bold text-lg text-deco-gold">{(node.closeness || 0).toFixed(4)}</div>
           </div>
           {/* NEW: Clustering Coefficient */}
           <div className="bg-deco-navy/50 p-2 rounded-sm border border-deco-gold/20">
              <div className="text-[10px] uppercase text-zinc-500">Clustering</div>
              <div className="font-mono font-bold text-lg text-deco-gold">{(node.clustering || 0).toFixed(4)}</div>
           </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 bg-deco-panel border-t-2 border-double border-deco-gold/40 relative z-10 flex gap-2">
         <BakeliteButton 
           onClick={handleDeepen}
           className="flex-1 text-deco-navy bg-deco-gold hover:bg-deco-gold/90 border-transparent shadow-lg flex items-center justify-center gap-2"
           icon={<BookOpenCheck size={16} />}
           variant="primary"
         >
           Auto-Expand Node
         </BakeliteButton>
      </div>
    </BakeliteCard>
  );
};