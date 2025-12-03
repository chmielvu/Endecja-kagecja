import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, Search, Scissors, Undo2, Redo2, FileJson, PanelLeftClose, LayoutGrid, Group, Eye, Lock, Activity, Map, BrainCircuit, X } from 'lucide-react';
import { generateGraphExpansion, runDeepAnalysis } from '../services/geminiService'; // Import runDeepAnalysis
import { detectDuplicates } from '../services/metrics';
import { MieczykLoader } from './MieczykLoader';
import { IngestionZone } from './IngestionZone';
import { BakeliteButton } from './BakeliteButton'; // NEW IMPORT
import { BakeliteCard } from './BakeliteCard'; // NEW IMPORT for duplicate modal

export const SidebarLeft: React.FC = () => {
  const { 
    graph, 
    recalculateGraph,
    selectedNodeIds, 
    activeCommunityColoring, 
    setCommunityColoring, 
    showCertainty,
    setCertaintyMode,
    isSecurityMode,
    setSecurityMode,
    activeLayout,
    setLayout,
    setThinking,
    isThinking,
    addToast,
    isSidebarOpen,
    toggleSidebar,
    undo, redo, canUndo, canRedo,
    setPendingPatch,
    addResearchTask,
    updateResearchTask,
    setAnalysisResult, // New
    setAnalysisOpen, // New
    mergeNodes // Existing merge function
  } = useStore();

  const [sidebarWidth, setSidebarWidth] = useState(380);

  // --- NEW DUPLICATE MERGER STATE ---
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [dupeCandidates, setDupeCandidates] = useState<any[]>([]);

  const handleExpand = async () => {
    const topic = prompt("Target Topic for Expansion:");
    if (!topic) return;
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({ id: taskId, type: 'expansion', target: topic, status: 'running', reasoning: 'Deploying agents...' });

    try {
      const result = await generateGraphExpansion(graph, topic);
      setPendingPatch({
        type: 'expansion',
        // Fix: Access correct properties from GraphPatch
        reasoning: result.reasoning,
        nodes: result.nodes,
        edges: result.edges
      });
      // Fix: Access correct property from GraphPatch
      updateResearchTask(taskId, { status: 'complete', reasoning: result.reasoning });
    } catch (e: any) {
      addToast({ title: 'Operation Compromised', description: e.message || 'Intelligence gathering failed.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Operation compromised.' });
    } finally {
      setThinking(false);
    }
  };

  // --- NEW HANDLERS ---
  const handleDeepAnalysis = async () => {
    setThinking(true);
    addToast({ title: 'Establishing Link', description: 'Connecting to NetworkX Python Runtime...', type: 'info' });
    try {
      const result = await runDeepAnalysis(graph);
      setAnalysisResult(result);
      setAnalysisOpen(true);
      addToast({ title: 'Intelligence Received', description: 'Deep structural analysis complete.', type: 'success' });
    } catch (e: any) {
      addToast({ title: 'Connection Failed', description: e.message, type: 'error' });
    } finally {
      setThinking(false);
    }
  };

  const handleGrooming = () => {
    const dupes = detectDuplicates(graph, 0.85); // Using string similarity for quick check
    if (dupes.length === 0) {
      addToast({ title: 'Archives Clean', description: 'No immediate duplicates detected.', type: 'success' });
    } else {
      setDupeCandidates(dupes);
      setShowDupeModal(true);
      addToast({ title: 'Duplicate Entities', description: `${dupes.length} potential duplicates found.`, type: 'warning' });
    }
  };

  const executeMerge = (candidate: any) => {
    mergeNodes(candidate.nodeA.id, candidate.nodeB.id);
    setDupeCandidates(prev => prev.filter(c => c !== candidate)); // Remove merged from list
    if(dupeCandidates.length <= 1) setShowDupeModal(false); // Close if no more candidates
    addToast({ title: 'Merge Complete', description: `Merged '${candidate.nodeB.label}' into '${candidate.nodeA.label}'.`, type: 'success' });
  };


  return (
    <div 
      className={`${isSidebarOpen ? 'border-r' : 'border-r-0'} bg-deco-navy border-deco-gold/30 overflow-hidden flex-shrink-0 relative shadow-2xl z-20 transition-all duration-300`}
      style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
    >
      <div style={{ width: sidebarWidth }} className="h-full flex flex-col p-5 overflow-y-auto bg-deco-pattern">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b border-deco-gold/20 pb-4">
          <div className="flex items-center gap-3">
              {isThinking ? (
                 <MieczykLoader size={40} className="text-deco-gold" />
              ) : (
                 <div className="w-10 h-10 border-2 border-deco-gold rounded-full flex items-center justify-center bg-deco-panel">
                    <span className="font-spectral font-bold text-2xl text-deco-paper">E</span>
                 </div>
              )}
              <div>
                  <h1 className="font-spectral font-bold text-4xl text-deco-gold tracking-widest leading-none uppercase">
                    Endecja<span className="text-deco-paper">KG</span>
                  </h1>
                  <span className="text-[10px] text-deco-green font-mono tracking-widest border border-deco-green/30 px-1 rounded bg-deco-paper/10">
                    HQ 1928
                  </span>
              </div>
          </div>
          
          <div className="flex items-center gap-1">
             <BakeliteButton variant="secondary" onClick={undo} disabled={!canUndo()} icon={<Undo2 size={16}/>} className="!p-1 !px-2"><span className="sr-only">Undo</span></BakeliteButton>
             <BakeliteButton variant="secondary" onClick={redo} disabled={!canRedo()} icon={<Redo2 size={16}/>} className="!p-1 !px-2"><span className="sr-only">Redo</span></BakeliteButton>
             <BakeliteButton variant="secondary" onClick={toggleSidebar} icon={<PanelLeftClose size={20}/>} className="!p-1 !px-2 ml-2"><span className="sr-only">Toggle Sidebar</span></BakeliteButton>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Ingestion Zone */}
          <BakeliteCard title="Document Intelligence" icon={<FileJson size={16}/>} bodyClassName="!p-0" className="!bg-transparent !border-none !shadow-none !clip-none">
             <IngestionZone />
          </BakeliteCard>

          {/* Operations */}
          <BakeliteCard title="Field Operations" icon={<Activity size={16}/>} className="!bg-transparent !border-none !shadow-none !clip-none">
            <div className="grid grid-cols-2 gap-2">
               <BakeliteButton onClick={handleExpand} icon={<Search size={18}/>} className="flex-col h-16 gap-1">
                  <span className="text-[10px]">Expand Context</span>
               </BakeliteButton>
               <BakeliteButton onClick={() => recalculateGraph()} icon={<Activity size={18}/>} className="flex-col h-16 gap-1">
                  <span className="text-[10px]">Update Metrics</span>
               </BakeliteButton>
            </div>
          </BakeliteCard>

          {/* Intelligence & Hygiene */}
          <BakeliteCard title="Intelligence & Hygiene" icon={<BrainCircuit size={16} />} className="!bg-transparent !border-none !shadow-none !clip-none">
            <div className="grid grid-cols-1 gap-2">
               <BakeliteButton onClick={handleDeepAnalysis} icon={<BrainCircuit size={16} />}>
                  <span className="text-xs">NetworkX Analysis (Python)</span>
               </BakeliteButton>
               <BakeliteButton onClick={handleGrooming} icon={<Scissors size={16} />}>
                  <span className="text-xs">Groom Duplicates</span>
               </BakeliteButton>
            </div>
          </BakeliteCard>

          {/* Visualization Controls */}
          <BakeliteCard title="Map Layers" icon={<Map size={16}/>} className="!bg-transparent !border-none !shadow-none !clip-none">
            <div className="grid grid-cols-1 gap-2">
            <BakeliteButton 
              onClick={() => setSecurityMode(!isSecurityMode)} 
              className="justify-between"
              variant={isSecurityMode ? 'danger' : 'primary'}
            >
               <div className="flex items-center gap-2"><Lock size={14}/> Clandestine Risk</div>
               <div className={`w-2 h-2 rounded-full ${isSecurityMode ? 'bg-deco-crimson' : 'bg-zinc-700'}`}></div>
            </BakeliteButton>

            <BakeliteButton 
              onClick={() => setCommunityColoring(!activeCommunityColoring)} 
              className="justify-between"
              variant={activeCommunityColoring ? 'primary' : 'secondary'}
            >
               <div className="flex items-center gap-2"><Group size={14}/> Faction Colors</div>
               <div className={`w-2 h-2 rounded-full ${activeCommunityColoring ? 'bg-deco-gold' : 'bg-zinc-700'}`}></div>
            </BakeliteButton>
            </div>
          </BakeliteCard>

          {/* Selected Intelligence */}
          {selectedNodeIds.length > 0 && (
            <BakeliteCard className="!bg-deco-panel/50 !border-deco-gold/30" chamfered={false}>
               <div className="absolute top-0 right-0 p-2">
                  <div className="text-[9px] font-mono text-deco-gold border border-deco-gold/50 px-1 py-0.5 rounded-sm bg-deco-panel/50">CONFIDENTIAL</div>
               </div>
               <h3 className="font-spectral font-bold text-deco-paper text-lg">{selectedNodeIds.length} Targets Selected</h3>
               <p className="text-xs text-zinc-400 mt-1 italic">Awaiting orders.</p>
            </BakeliteCard>
          )}

        </div>
        
        <div className="mt-auto pt-6 border-t border-deco-gold/20 text-center">
          <span className="text-[10px] text-zinc-600 font-mono">Dmowski Salon Terminal v2.0.0</span>
        </div>
      </div>

      {/* NEW: Inline Duplicate Merger Modal */}
      {showDupeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <BakeliteCard 
             title="Duplicate Candidates" 
             icon={<Scissors size={20}/>} 
             className="max-w-lg w-full"
           >
              <p className="text-sm text-zinc-400 mb-4 font-spectral italic">Review and merge redundant entities to cleanse the archives.</p>
              
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                 {dupeCandidates.length > 0 ? dupeCandidates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-deco-panel/50 rounded-none border border-deco-gold/30">
                       <div className="text-sm text-zinc-300 flex-1 min-w-0">
                          <span className="text-deco-gold font-bold">{d.nodeA.label}</span> 
                          <span className="text-zinc-500 mx-1">vs</span> 
                          <span className="text-deco-paper font-bold">{d.nodeB.label}</span>
                          <p className="text-[10px] text-zinc-600 mt-1 italic truncate">{d.reason}</p>
                       </div>
                       <BakeliteButton 
                         onClick={() => executeMerge(d)} 
                         className="ml-4 text-xs"
                         variant="secondary"
                       >
                         Merge
                       </BakeliteButton>
                    </div>
                 )) : (
                   <div className="text-center text-zinc-600 py-8 text-sm italic">
                     No more duplicates to review.
                   </div>
                 )}
              </div>
              
              {dupeCandidates.length > 0 && (
                <div className="mt-6 border-t border-deco-gold/20 pt-4">
                  <BakeliteButton onClick={() => setShowDupeModal(false)} className="w-full" variant="secondary">
                    Close (Review Later)
                  </BakeliteButton>
                </div>
              )}
           </BakeliteCard>
        </div>
      )}
    </div>
  );
};