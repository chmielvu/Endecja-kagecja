
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, Search, Scissors, X, GitMerge, Map, Activity, Edit2, Trash2, BrainCircuit, Undo2, Redo2, FileJson, BookOpenCheck, ShieldAlert, PanelLeftClose, LayoutGrid, Group, Eye, Lock, Network, History } from 'lucide-react';
import { generateGraphExpansion, generateNodeDeepening } from '../services/geminiService';
import { buildGraphRAGIndex } from '../services/graphService';
import { detectDuplicatesSemantic, detectDuplicates } from '../services/metrics';
import { predictFutureConnections } from '../services/temporalReasoningService';
import { DuplicateCandidate } from '../types';
import { MieczykIcon } from './MieczykIcon';

export const SidebarLeft: React.FC = () => {
  const { 
    graph, 
    recalculateGraph,
    selectedNodeIds, 
    clearSelection,
    activeCommunityColoring, 
    setCommunityColoring, 
    showCertainty,
    setCertaintyMode,
    isSecurityMode,
    setSecurityMode,
    isGroupedByRegion,
    setGroupedByRegion,
    activeLayout,
    setLayout,
    layoutParams,
    setLayoutParams,
    setThinking,
    mergeNodes,
    addToast,
    runRegionalAnalysis,
    regionalAnalysis,
    setEditingNode,
    bulkDeleteSelection,
    setShowStatsPanel,
    isSidebarOpen,
    toggleSidebar,
    setSemanticSearchOpen,
    undo, redo, canUndo, canRedo,
    setDeepeningNode,
    setPendingPatch,
    addResearchTask,
    updateResearchTask,
    timelineYear
  } = useStore();

  const [dupeCandidates, setDupeCandidates] = useState<DuplicateCandidate[]>([]);
  const [showDupeModal, setShowDupeModal] = useState(false);
  
  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 280 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing]);

  const selectedNode = selectedNodeIds.length === 1 
    ? graph.nodes.find(n => n.data.id === selectedNodeIds[0])?.data 
    : null;

  const handleRunMetrics = () => {
    try {
      recalculateGraph();
      const { graph: updatedGraph } = useStore.getState();
      addToast({ 
        title: 'Analiza Zakończona', 
        description: `Modularity: ${(updatedGraph.meta?.modularity || 0).toFixed(3)} (Louvain)`, 
        type: 'success' 
      });
    } catch (e: any) {
      addToast({ 
        title: 'Błąd Analizy', 
        description: `Nie udało się przeliczyć metryk: ${e.message}`, 
        type: 'error' 
      });
    }
  };

  const handleExpand = async () => {
    const topic = prompt("Enter a topic or entity to expand upon:");
    if (!topic) return;
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({ id: taskId, type: 'expansion', target: topic, status: 'running', reasoning: 'Querying historical database...' });

    try {
      const result = await generateGraphExpansion(graph, topic);
      setPendingPatch({
        type: 'expansion',
        reasoning: result.thoughtProcess,
        nodes: result.newNodes,
        edges: result.newEdges
      });
      updateResearchTask(taskId, { status: 'complete', reasoning: result.thoughtProcess });
    } catch (e) {
      addToast({ title: 'Error', description: 'Expansion failed.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'API Error' });
    } finally {
      setThinking(false);
    }
  };
  
  const handleDeepen = async () => {
    if (!selectedNode) return;
    setDeepeningNode(selectedNode.id);
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({ id: taskId, type: 'deepening', target: selectedNode.label, status: 'running', reasoning: 'Searching archives...' });
    
    try {
      const result = await generateNodeDeepening(selectedNode, graph);
      
      // Mapped thoughtSignature to reasoning
      setPendingPatch({
        type: 'deepening',
        reasoning: result.thoughtSignature,
        nodes: [{ id: selectedNode.id, ...result.updatedProperties }], 
        edges: result.newEdges
      });
      updateResearchTask(taskId, { status: 'complete', reasoning: result.thoughtSignature });

    } catch (e) {
      addToast({ title: 'Błąd Archiwum', description: 'Nie udało się pogłębić wiedzy o węźle.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Search failed' });
    } finally {
      setDeepeningNode(null);
      setThinking(false);
    }
  };

  const handleGraphRAG = async () => {
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({ id: taskId, type: 'analysis', target: 'Global GraphRAG', status: 'running', reasoning: 'Building hierarchical community summaries...' });

    try {
        const index = await buildGraphRAGIndex(graph);
        const summaryCount = index.summaries.length;
        addToast({ 
            title: 'GraphRAG Index Built', 
            description: `Generated ${summaryCount} community insights across ${Object.keys(index.hierarchies).length} levels.`, 
            type: 'success' 
        });
        updateResearchTask(taskId, { status: 'complete', reasoning: `Indexed ${summaryCount} communities.` });
    } catch (e) {
        addToast({ title: 'GraphRAG Error', description: 'Failed to build index.', type: 'error' });
        updateResearchTask(taskId, { status: 'failed', reasoning: 'Indexing failed.' });
    } finally {
        setThinking(false);
    }
  };

  const handleTemporalPrediction = async () => {
    const year = timelineYear || 1926;
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({ id: taskId, type: 'analysis', target: `Future Prediction (${year})`, status: 'running', reasoning: 'Analyzing temporal patterns...' });

    try {
        const predictions = await predictFutureConnections(graph, year);
        
        if (predictions.length === 0) {
            addToast({ title: 'No Predictions', description: 'Model could not predict events for this context.', type: 'info' });
            updateResearchTask(taskId, { status: 'failed', reasoning: 'No predictions generated.' });
            return;
        }

        // Convert Predictions to Patch
        const newNodes: any[] = [];
        const newEdges: any[] = [];

        predictions.forEach(p => {
             // Heuristic: If target doesn't exist in graph, treat as new node candidate
             const exists = graph.nodes.some(n => n.data.id === p.target || n.data.label === p.target);
             if (!exists) {
                 newNodes.push({
                     id: p.target.toLowerCase().replace(/\s+/g, '_'),
                     label: p.target,
                     type: 'event', // Guess type
                     year: year,
                     description: 'AI Predicted Event/Entity',
                     certainty: 'alleged'
                 });
             }
             
             // Try to map source label to ID
             const sourceNode = graph.nodes.find(n => n.data.label === p.source || n.data.id === p.source);
             const sourceId = sourceNode ? sourceNode.data.id : p.source.toLowerCase().replace(/\s+/g, '_');

             newEdges.push({
                 source: sourceId,
                 target: p.target.toLowerCase().replace(/\s+/g, '_'),
                 label: p.relation,
                 certainty: 'alleged',
                 dates: String(year)
             });
        });

        setPendingPatch({
            type: 'expansion',
            reasoning: `Temporal Prediction for ${year}: ${predictions.map(p => p.reasoning).slice(0, 2).join('; ')}...`,
            nodes: newNodes,
            edges: newEdges
        });
        
        updateResearchTask(taskId, { status: 'complete', reasoning: 'Generated temporal predictions.' });

    } catch (e) {
        console.error(e);
        addToast({ title: 'Prediction Error', description: 'Failed to generate predictions.', type: 'error' });
        updateResearchTask(taskId, { status: 'failed', reasoning: 'Prediction failed.' });
    } finally {
        setThinking(false);
    }
  };

  const handleGroomDupes = async (semantic = false) => {
    setThinking(true);
    try {
      const candidates = semantic 
        ? await detectDuplicatesSemantic(graph, 0.88)
        : detectDuplicates(graph, 0.7);
      
      if (candidates.length === 0) {
        addToast({ title: 'Clean Graph', description: 'No duplicates detected.', type: 'success' });
      } else {
        setDupeCandidates(candidates);
        setShowDupeModal(true);
      }
    } finally {
      setThinking(false);
    }
  };

  const handleMerge = (candidate: DuplicateCandidate) => {
    const keepA = (candidate.nodeA.description?.length || 0) >= (candidate.nodeB.description?.length || 0);
    const keepId = keepA ? candidate.nodeA.id : candidate.nodeB.id;
    const dropId = keepA ? candidate.nodeB.id : candidate.nodeA.id;
    mergeNodes(keepId, dropId);
    setDupeCandidates(prev => prev.filter(c => c !== candidate));
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graph, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "endecja_kg_dump.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportObsidian = () => {
    const obsidianData = {
      nodes: graph.nodes.map(n => ({
        id: n.data.id,
        label: n.data.label,
        x: n.position?.x || 0,
        y: n.position?.y || 0,
        community: n.data.louvainCommunity
      })),
      edges: graph.edges.map(e => ({
        source: e.data.source,
        target: e.data.target,
        label: e.data.label
      })),
      groups: Array.from(new Set(graph.nodes.map(n => n.data.louvainCommunity))).map(c => ({
        id: `community-${c}`,
        label: `Wspólnota ${c}`
      }))
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obsidianData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "endecja-obsidian-graph.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`${isSidebarOpen ? 'border-r' : 'border-r-0'} bg-surface border-owp-green/30 overflow-hidden flex-shrink-0 relative shadow-2xl shadow-black z-20`}
        style={{ 
          width: isSidebarOpen ? sidebarWidth : 0, 
          transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        <div style={{ width: sidebarWidth }} className="h-full flex flex-col p-5 overflow-y-auto">
          
          {/* Header Section with Icon and Title */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3 group">
                <div className="text-owp-green group-hover:text-archival-gold transition-colors duration-500 drop-shadow-[0_0_10px_rgba(53,94,59,0.5)]">
                    <MieczykIcon size={36} />
                </div>
                <div>
                    <h1 className="font-spectral font-bold text-2xl text-zinc-100 tracking-wide leading-none">
                      ENDECJA<span className="text-owp-green">KG</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-owp-green font-mono tracking-widest border border-owp-green/30 px-1 rounded bg-owp-green/5">
                        TIER-4
                      </span>
                      <span className="text-[10px] text-zinc-500 font-serif italic">Archival System</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
               <div className="flex mr-2 bg-zinc-900/50 rounded border border-zinc-800">
                  <button onClick={undo} disabled={!canUndo()} className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"><Undo2 size={14}/></button>
                  <div className="w-[1px] bg-zinc-800"></div>
                  <button onClick={redo} disabled={!canRedo()} className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"><Redo2 size={14}/></button>
               </div>
               <button 
                  onClick={toggleSidebar} 
                  className="text-zinc-600 hover:text-owp-green transition-colors p-1"
                  title="Collapse"
               >
                  <PanelLeftClose size={20} />
               </button>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* Analysis Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-owp-green uppercase tracking-[0.2em] font-spectral opacity-80 pl-1">
                Analysis Protocols
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={handleRunMetrics} className="btn-zinc group justify-between">
                   <div className="flex items-center gap-2"><Play size={16} className="text-owp-green group-hover:text-white transition-colors"/> Analiza i Rozwój Grafu</div>
                   <div className="w-1.5 h-1.5 rounded-full bg-owp-green opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <button onClick={() => setSemanticSearchOpen(true)} className="btn-zinc group justify-between">
                   <div className="flex items-center gap-2"><Search size={16} className="text-owp-green group-hover:text-white transition-colors"/> Wyszukiwanie Semantyczne</div>
                </button>
                <button onClick={() => setShowStatsPanel(true)} className="btn-zinc group justify-between">
                   <div className="flex items-center gap-2"><Activity size={16} className="text-owp-green group-hover:text-white transition-colors"/> Graph Dashboard</div>
                </button>
                <button onClick={runRegionalAnalysis} className="btn-zinc group justify-between">
                   <div className="flex items-center gap-2"><Map size={16} className="text-owp-green group-hover:text-white transition-colors"/> Regional Analysis</div>
                </button>
                {regionalAnalysis && (
                  <div className="px-3 py-2 bg-owp-green/10 border-l-2 border-owp-green text-xs animate-in fade-in slide-in-from-left-2">
                    <div className="flex justify-between items-center">
                       <span className="text-owp-green font-bold">Isolation Index</span> 
                       <span className="font-mono text-white bg-owp-green/20 px-1 rounded">{(regionalAnalysis.isolationIndex * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Agents Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-owp-green uppercase tracking-[0.2em] font-spectral opacity-80 pl-1">
                AI Agents
              </label>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={handleExpand} className="btn-zinc text-emerald-100/80 border-emerald-900/30 hover:border-emerald-500/50 flex flex-col items-center justify-center h-16 gap-1 text-center">
                    <BrainCircuit size={18} className="text-emerald-500"/> 
                    <span className="text-[10px]">Context Expand</span>
                 </button>
                 <button onClick={() => handleGroomDupes(true)} className="btn-zinc text-amber-100/80 border-amber-900/30 hover:border-amber-500/50 flex flex-col items-center justify-center h-16 gap-1 text-center">
                    <Scissors size={18} className="text-amber-500"/> 
                    <span className="text-[10px]">Groom Data</span>
                 </button>
                 <button onClick={handleGraphRAG} className="btn-zinc text-blue-100/80 border-blue-900/30 hover:border-blue-500/50 flex flex-col items-center justify-center h-16 gap-1 text-center">
                    <Network size={18} className="text-blue-500"/> 
                    <span className="text-[10px]">GraphRAG Index</span>
                 </button>
                 <button onClick={handleTemporalPrediction} className="btn-zinc text-purple-100/80 border-purple-900/30 hover:border-purple-500/50 flex flex-col items-center justify-center h-16 gap-1 text-center">
                    <History size={18} className="text-purple-500"/> 
                    <span className="text-[10px]">Predict {timelineYear || 1926}</span>
                 </button>
              </div>
            </div>

            {/* Visualization Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-owp-green uppercase tracking-[0.2em] font-spectral opacity-80 pl-1">
                Visual Layers
              </label>
              
              <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-950 border border-owp-green/20 rounded-sm hover:border-owp-green/40 transition-colors">
                <span className="text-sm text-zinc-300">Community Colors</span>
                <button 
                  onClick={() => setCommunityColoring(!activeCommunityColoring)} 
                  className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${activeCommunityColoring ? 'bg-owp-green' : 'bg-zinc-800'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${activeCommunityColoring ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-950 border border-owp-green/20 rounded-sm hover:border-owp-green/40 transition-colors">
                <span className="text-sm text-zinc-300 flex items-center gap-2"><ShieldAlert size={14} className={showCertainty ? "text-archival-gold" : "text-zinc-600"}/> Evidence Mode</span>
                <button 
                  onClick={() => setCertaintyMode(!showCertainty)} 
                  className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${showCertainty ? 'bg-archival-gold' : 'bg-zinc-800'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${showCertainty ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>

              {/* SOTA SECURITY MODE TOGGLE */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-950 border border-owp-green/20 rounded-sm hover:border-owp-green/40 transition-colors">
                <span className="text-sm text-zinc-300 flex items-center gap-2">
                  <Lock size={14} className={isSecurityMode ? "text-crimson" : "text-zinc-600"}/> 
                  Clandestine Analysis
                </span>
                <button 
                  onClick={() => setSecurityMode(!isSecurityMode)} 
                  className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${isSecurityMode ? 'bg-crimson' : 'bg-zinc-800'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${isSecurityMode ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>

               <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-950 border border-owp-green/20 rounded-sm hover:border-owp-green/40 transition-colors">
                <span className="text-sm text-zinc-300 flex items-center gap-2"><Group size={14} className={isGroupedByRegion ? "text-archival-gold" : "text-zinc-600"}/> Group By Region</span>
                <button 
                  onClick={() => setGroupedByRegion(!isGroupedByRegion)} 
                  className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${isGroupedByRegion ? 'bg-archival-gold' : 'bg-zinc-800'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${isGroupedByRegion ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Layout Engine Selector */}
               <div className="px-3 py-2.5 bg-zinc-950 border border-owp-green/20 rounded-sm hover:border-owp-green/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-300 flex items-center gap-2"><LayoutGrid size={14} className="text-zinc-500"/> Layout Engine</span>
                  <select 
                    value={activeLayout}
                    onChange={(e) => setLayout(e.target.value)}
                    className="bg-zinc-900 text-xs text-white border border-zinc-700 rounded px-2 py-1 outline-none focus:border-archival-gold w-28"
                  >
                     <option value="cola">Cola (Physics)</option>
                     <option value="cose">Cose (Spring)</option>
                     <option value="concentric">Concentric</option>
                     <option value="grid">Grid</option>
                     <option value="circle">Circle</option>
                  </select>
                </div>
                
                {/* Parameter Controls for Physics Layouts */}
                {(activeLayout === 'cola' || activeLayout === 'cose' || activeLayout === 'concentric') && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-zinc-800 animate-in slide-in-from-top-2">
                     
                     {(activeLayout === 'cola' || activeLayout === 'cose') && (
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                              <span>Gravity</span> <span className="text-owp-green">{layoutParams.gravity.toFixed(2)}</span>
                           </div>
                           <input 
                              type="range" min="0.05" max="1" step="0.05" 
                              value={layoutParams.gravity} 
                              onChange={(e) => setLayoutParams({ gravity: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-zinc-800 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-archival-gold [&::-webkit-slider-thumb]:cursor-pointer"
                           />
                        </div>
                     )}
                     
                     {activeLayout === 'cola' && (
                       <div className="space-y-1">
                         <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                            <span>Friction</span> <span className="text-owp-green">{layoutParams.friction.toFixed(2)}</span>
                         </div>
                         <input 
                           type="range" min="0.1" max="0.9" step="0.1" 
                           value={layoutParams.friction} 
                           onChange={(e) => setLayoutParams({ friction: parseFloat(e.target.value) })}
                           className="w-full h-1 bg-zinc-800 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-archival-gold [&::-webkit-slider-thumb]:cursor-pointer"
                         />
                       </div>
                     )}

                     {activeLayout === 'cose' && (
                       <>
                         <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                              <span>Repulsion</span> <span className="text-owp-green">{layoutParams.nodeRepulsion.toLocaleString()}</span>
                           </div>
                           <input 
                             type="range" min="100000" max="1000000" step="10000" 
                             value={layoutParams.nodeRepulsion} 
                             onChange={(e) => setLayoutParams({ nodeRepulsion: parseFloat(e.target.value) })}
                             className="w-full h-1 bg-zinc-800 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-archival-gold [&::-webkit-slider-thumb]:cursor-pointer"
                           />
                         </div>
                         <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                              <span>Edge Length</span> <span className="text-owp-green">{layoutParams.idealEdgeLength}</span>
                           </div>
                           <input 
                             type="range" min="20" max="300" step="10" 
                             value={layoutParams.idealEdgeLength} 
                             onChange={(e) => setLayoutParams({ idealEdgeLength: parseFloat(e.target.value) })}
                             className="w-full h-1 bg-zinc-800 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-archival-gold [&::-webkit-slider-thumb]:cursor-pointer"
                           />
                         </div>
                       </>
                     )}

                     <div className="space-y-1">
                       <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                          <span>Node Spacing</span> <span className="text-owp-green">{layoutParams.spacing.toFixed(1)}x</span>
                       </div>
                       <input 
                         type="range" min="0.5" max="3" step="0.1" 
                         value={layoutParams.spacing} 
                         onChange={(e) => setLayoutParams({ spacing: parseFloat(e.target.value) })}
                         className="w-full h-1 bg-zinc-800 rounded appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-archival-gold [&::-webkit-slider-thumb]:cursor-pointer"
                       />
                     </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selection Panel */}
            {selectedNodeIds.length > 0 && (
              <div className="p-4 bg-owp-green/5 border border-owp-green/30 rounded-sm space-y-3 animate-in slide-in-from-left-4 backdrop-blur-sm">
                  <div className="flex justify-between items-center border-b border-owp-green/20 pb-2">
                    <h3 className="text-sm font-bold text-owp-green font-spectral tracking-wide">{selectedNodeIds.length} Selected</h3>
                    <button onClick={clearSelection} className="text-zinc-500 hover:text-white transition-colors"><X size={14}/></button>
                  </div>
                  
                  {selectedNodeIds.length === 1 && selectedNode && (
                    <div className="space-y-3 text-xs text-zinc-400">
                      <p className="font-bold text-zinc-100 text-lg font-spectral leading-tight">{selectedNode.label}</p>
                      <p className="italic border-l-2 border-archival-gold pl-3 text-zinc-400">{selectedNode.description}</p>
                      
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-2 border-t border-owp-green/10">
                         <div className="flex justify-between"><span>Centrality:</span> <span className="text-white font-mono">{(selectedNode.degreeCentrality || 0).toFixed(2)}</span></div>
                         <div className="flex justify-between"><span>PageRank:</span> <span className="text-white font-mono">{(selectedNode.pagerank || 0).toFixed(2)}</span></div>
                         <div className="col-span-2 text-owp-green flex justify-between font-bold bg-owp-green/10 px-1.5 py-0.5 rounded">
                           <span>Community:</span> <span>#{selectedNode.louvainCommunity}</span>
                         </div>
                         {/* Security Metrics Display */}
                         {selectedNode.security && (
                             <div className="col-span-2 pt-2 mt-2 border-t border-owp-green/10 text-[10px] space-y-1">
                                <div className="text-crimson font-bold uppercase tracking-wider flex justify-between">
                                   Infiltration Risk <span>{(selectedNode.security.risk * 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                                   <div className={`h-full ${selectedNode.security.risk > 0.5 ? 'bg-crimson' : 'bg-owp-green'}`} style={{ width: `${selectedNode.security.risk * 100}%` }}></div>
                                </div>
                                <div className="flex justify-between text-zinc-500">
                                   <span>Efficiency: {selectedNode.security.efficiency.toFixed(2)}</span>
                                   <span>Safety: {selectedNode.security.safety.toFixed(2)}</span>
                                </div>
                             </div>
                         )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button onClick={handleDeepen} className="btn-zinc justify-center text-owp-green border-owp-green/40 hover:bg-owp-green hover:text-white">
                           <BookOpenCheck size={14}/> Research
                        </button>
                        <button onClick={() => setEditingNode(selectedNode.id)} className="btn-zinc justify-center">
                           <Edit2 size={14}/> Edit
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedNodeIds.length > 1 && (
                    <div className="space-y-2">
                      <button onClick={bulkDeleteSelection} className="w-full btn-zinc bg-crimson/10 text-crimson border-crimson/40 hover:bg-crimson hover:text-white hover:border-crimson"><Trash2 size={14}/> Delete Selection</button>
                    </div>
                  )}
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-6 border-t border-owp-green/20 space-y-2">
            <button onClick={handleExportJSON} className="w-full btn-zinc text-xs text-zinc-500 hover:text-white border-zinc-800"><FileJson size={14}/> Export Full JSON</button>
            <button onClick={handleExportObsidian} className="w-full btn-zinc text-xs text-zinc-500 hover:text-white border-zinc-800"><FileJson size={14}/> Eksportuj do Obsidian</button>
            <div className="text-center text-[10px] text-zinc-700 font-mono pt-2">v4.2.0 • Endecja GraphLab</div>
          </div>
        </div>

        {/* Drag Handle */}
        <div 
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-owp-green z-50 transition-colors duration-300 ${isResizing ? 'bg-owp-green' : 'bg-owp-green/0'}`}
        />
      </div>

      {showDupeModal && (
        <DupeModal candidates={dupeCandidates} onClose={() => setShowDupeModal(false)} onMerge={handleMerge} />
      )}
    </>
  );
};

const DupeModal = ({ candidates, onClose, onMerge }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-surface border border-owp-green/30 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
      <div className="p-4 border-b border-owp-green/20 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white font-spectral flex items-center gap-2"><Scissors size={18} className="text-owp-green"/> Semantic Review ({candidates.length})</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {candidates.map((cand: any, i: number) => (
          <div key={i} className="bg-zinc-950 p-4 rounded border border-zinc-800 flex gap-4 items-center group hover:border-owp-green/40 transition-colors">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between"><span className="text-sm font-bold text-archival-gold">{cand.nodeA.label}</span></div>
              <div className="flex justify-between"><span className="text-sm font-bold text-archival-gold opacity-70">{cand.nodeB.label}</span></div>
              <div className="text-xs text-zinc-500 font-serif italic border-l-2 border-zinc-800 pl-2 mt-2">{cand.reason}</div>
            </div>
            <button onClick={() => onMerge(cand)} className="btn-zinc text-owp-green border-owp-green/30 hover:bg-owp-green hover:text-white"><GitMerge size={14} /> Merge</button>
          </div>
        ))}
      </div>
    </div>
  </div>
);
