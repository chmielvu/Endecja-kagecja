


import { create } from 'zustand';
import { 
  AppState, 
  KnowledgeGraph, 
  NodeData, 
  ChatMessage, 
  Toast, 
  RegionalAnalysisResult, 
  DuplicateCandidate, 
  GraphPatch, 
  ResearchTask, 
  GraphNode, 
  GraphEdge, // Fix: Import EdgeData
  LayoutParams, 
  PythonAnalysisResult,
  TemporalFactType,
  SourceCitation,
  RegionInfo,
  EdgeData // Fix: Import EdgeData
} from './types';
import { INITIAL_GRAPH } from './constants';
import { enrichGraphWithMetricsAsync, calculateRegionalMetrics } from './services/graphService';
import { parseTemporalFact } from './services/geminiService'; // Fix: Import parseTemporalFact
import { storage } from './services/storage';

interface HistoryState {
  past: KnowledgeGraph[];
  future: KnowledgeGraph[];
}

interface Store extends AppState {
  initGraph: () => void;
  loadFromStorage: () => Promise<KnowledgeGraph | null>;
  
  // Graph Mutation
  addNodesAndEdges: (nodes: Partial<NodeData>[], edges: Partial<EdgeData>[]) => void;
  applyPatch: (nodes: Partial<NodeData>[], edges: Partial<EdgeData>[]) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  mergeNodes: (keepId: string, dropId: string) => void;
  recalculateGraph: () => Promise<void>;
  
  // Bulk Actions
  toggleNodeSelection: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  bulkDeleteSelection: () => void;
  
  // Analysis & View
  setFilterYear: (year: number | null) => void;
  toggleSidebar: () => void;
  
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  setCommunityColoring: (active: boolean) => void;
  setCertaintyMode: (active: boolean) => void;
  setSecurityMode: (active: boolean) => void; 
  setGroupedByRegion: (active: boolean) => void; 
  setLayout: (layout: string) => void;
  setLayoutParams: (params: Partial<LayoutParams>) => void;
  runRegionalAnalysis: () => void;
  setShowStatsPanel: (show: boolean) => void;
  setSemanticSearchOpen: (open: boolean) => void;
  setPendingPatch: (patch: GraphPatch | null) => void;
  addResearchTask: (task: ResearchTask) => void;
  updateResearchTask: (id: string, updates: Partial<ResearchTask>) => void;
  
  setEditingNode: (id: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  setThinking: (isThinking: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  undo: () => void;
  redo: () => void;
  _history: HistoryState;
  pushHistory: () => void;
  
  deepeningNodeId: string | null;
  setDeepeningNode: (id: string | null) => void;

  // NEW: Deep Analysis Actions
  setAnalysisResult: (result: PythonAnalysisResult | null) => void;
  setAnalysisOpen: (open: boolean) => void;
}

// Helper to extract a single year from TemporalFactType for filtering
function getYearFromTemporalFact(temporal?: TemporalFactType): number | undefined {
  if (!temporal) return undefined;
  if (temporal.type === 'instant') return parseInt(temporal.timestamp);
  if (temporal.type === 'interval') return parseInt(temporal.start);
  return undefined;
}

export const useStore = create<Store>((set, get) => ({
  graph: { nodes: [], edges: [], meta: {} },
  filteredGraph: { nodes: [], edges: [], meta: {} },
  selectedNodeIds: [],
  editingNodeId: null,
  deepeningNodeId: null,
  pendingPatch: null,
  activeResearchTasks: [],
  metricsCalculated: false,
  activeCommunityColoring: true,
  showCertainty: false,
  isSecurityMode: false,
  isGroupedByRegion: false,
  activeLayout: 'grid', 
  layoutParams: { 
    gravity: 0.25, 
    friction: 0.6, 
    spacing: 1.0,
    nodeRepulsion: 450000,
    idealEdgeLength: 100
  },
  minDegreeFilter: 0,
  isSidebarOpen: true,
  isRightSidebarOpen: true,
  timelineYear: null,
  isPlaying: false,
  regionalAnalysis: null,
  showStatsPanel: false,
  isSemanticSearchOpen: false,
  messages: [
    { 
      id: 'welcome', 
      role: 'assistant', 
      content: 'Witaj w Endecja KG Builder Tier-4. Platforma badawcza gotowa.', 
      timestamp: Date.now() 
    }
  ],
  isThinking: false,
  toasts: [],
  // NEW: Deep Analysis State
  analysisResult: null,
  isAnalysisOpen: false,
  _history: { past: [], future: [] },

  canUndo: () => get()._history.past.length > 0,
  canRedo: () => get()._history.future.length > 0,

  pushHistory: () => {
    const { graph, _history } = get();
    // Use JSON deep copy to ensure immutability
    const newPast = [JSON.parse(JSON.stringify(graph)), ..._history.past].slice(0, 50);
    set({ _history: { past: newPast, future: [] } });
  },

  undo: () => {
    const { _history } = get();
    if (_history.past.length === 0) return;
    const previous = _history.past[0];
    const newPast = _history.past.slice(1);
    const current = get().graph;
    set({ 
      graph: previous, 
      filteredGraph: previous,
      _history: { past: newPast, future: [current, ..._history.future] } 
    });
    storage.save(previous);
  },

  redo: () => {
    const { _history } = get();
    if (_history.future.length === 0) return;
    const next = _history.future[0];
    const newFuture = _history.future.slice(1);
    const current = get().graph;
    set({ 
      graph: next, 
      filteredGraph: next,
      _history: { past: [current, ..._history.past], future: newFuture } 
    });
    storage.save(next);
  },

  initGraph: async () => {
    try {
      const currentVersion = INITIAL_GRAPH.meta?.version || "1.0";
      const stored = await get().loadFromStorage();
      
      if (!stored || (stored.meta?.version !== currentVersion)) {
        console.log(`Hydrating Initial Graph. Version: ${currentVersion}`);
        set({ isThinking: true });
        const enriched = await enrichGraphWithMetricsAsync(INITIAL_GRAPH);
        set({ graph: enriched, filteredGraph: enriched, metricsCalculated: true, isThinking: false });
        get().addToast({ title: 'System Ready', description: `Loaded Base Knowledge.`, type: 'success' });
        storage.save(enriched, currentVersion);
      } else {
         set({ graph: stored, filteredGraph: stored, metricsCalculated: true });
      }
      
      setInterval(() => {
        const { graph } = get();
        if (graph.nodes.length > 0) storage.save(graph);
      }, 10000);

    } catch (e: any) {
      console.error("Initialization Error:", e);
      get().addToast({ title: 'Metric Error', description: `Loaded basic graph.`, type: 'warning' });
      set({ graph: INITIAL_GRAPH, filteredGraph: INITIAL_GRAPH, metricsCalculated: false, isThinking: false });
    }
  },

  loadFromStorage: async () => {
    try {
      const data = await storage.load();
      if (data) {
        return { ...data.graph, meta: { ...data.graph.meta, version: data.version } };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  recalculateGraph: async () => {
    set({ isThinking: true });
    const { graph } = get();
    try {
       const enriched = await enrichGraphWithMetricsAsync(graph);
       set((state) => ({ 
         graph: enriched, 
         filteredGraph: enriched, 
         metricsCalculated: true, 
         isThinking: false,
         // Update meta with new global metrics
         meta: {
           ...state.graph.meta,
           modularity: enriched.meta?.modularity, // Keep legacy if needed for old UI
           globalMetrics: enriched.meta?.globalMetrics,
           communityStructure: enriched.meta?.communityStructure,
           globalBalance: enriched.meta?.globalBalance
         }
       }));
       storage.save(enriched);
    } catch (e) {
       console.error("Metric recalc failed", e);
       // Ensure isThinking is set to false even on error to unblock UI
       set({ isThinking: false });
    }
  },

  addNodesAndEdges: (newNodesRaw, newEdgesRaw) => {
     get().applyPatch(newNodesRaw, newEdgesRaw);
  },

  applyPatch: async (patchNodes, patchEdges) => {
    get().pushHistory();
    set((state) => {
      // Functional update to ensure no race conditions with other state changes
      const { graph } = state;
      const existingNodeMap = new Map<string, GraphNode>(graph.nodes.map(n => [n.data.id, n]));
      
      patchNodes.forEach(pn => {
        if (!pn.id) return;
        
        // --- TemporalFactType parsing for NodeData.validity ---
        let validity: TemporalFactType | undefined;
        if (pn.validity) {
          validity = pn.validity;
        } else if (pn.dates) { // Fallback from old string 'dates'
          // Fix: Ensure getYearFromTemporalFact is called on the result of parseTemporalFact
          validity = getYearFromTemporalFact(parseTemporalFact(pn.dates)) ? parseTemporalFact(pn.dates) : undefined;
        } else if (pn.year) { // Fallback from old 'year' number
          validity = { type: 'instant', timestamp: String(pn.year) };
        }

        // --- RegionInfo parsing ---
        let region: RegionInfo | undefined;
        if (pn.region && typeof pn.region === 'object' && 'id' in pn.region) {
          region = pn.region;
        } else if (pn.region && typeof pn.region === 'string') { // Fallback from old 'region' string
          region = { id: pn.region.toLowerCase().replace(/\s/g, '_'), label: pn.region };
        }

        // --- SourceCitation parsing ---
        let sources: SourceCitation[] | undefined;
        if (pn.sources && Array.isArray(pn.sources) && pn.sources.every(s => typeof s === 'object' && 'uri' in s)) {
          sources = pn.sources as SourceCitation[];
        } else if (pn.sources && Array.isArray(pn.sources) && pn.sources.every(s => typeof s === 'string')) { // Fallback from old string[]
          sources = (pn.sources as string[]).map(uri => ({ uri, label: uri.length > 50 ? uri.substring(0,47)+'...' : uri, type: 'website' }));
        }

        const newNodeData: NodeData = {
          id: pn.id,
          label: pn.label || pn.id,
          type: pn.type || 'concept',
          description: pn.description,
          validity: validity,
          region: region,
          certainty: pn.certainty || 'confirmed',
          confidenceScore: pn.confidenceScore,
          existence: pn.existence,
          roles: pn.roles,
          sources: sources,
          // Copy other metrics/props if they exist in patch, otherwise default below
          degreeCentrality: pn.degreeCentrality, pagerank: pn.pagerank, community: pn.community,
          louvainCommunity: pn.louvainCommunity, kCore: pn.kCore, betweenness: pn.betweenness,
          closeness: pn.closeness, eigenvector: pn.eigenvector, clustering: pn.clustering,
          security: pn.security, embedding: pn.embedding, parent: pn.parent,
          // Legacy fields - these will be eventually removed
          year: pn.year, dates: pn.dates
        };
        
        if (existingNodeMap.has(pn.id)) {
          const existing = existingNodeMap.get(pn.id)!;
          existingNodeMap.set(pn.id, {
            ...existing,
            data: { ...existing.data, ...newNodeData, id: pn.id } // Merge new data with existing
          });
        } else {
          existingNodeMap.set(pn.id, { data: newNodeData });
        }
      });

      const newEdges: GraphEdge[] = patchEdges.map(pe => {
        // --- TemporalFactType parsing for EdgeData.temporal ---
        let temporal: TemporalFactType | undefined;
        if (pe.temporal) {
          temporal = pe.temporal;
        } else if (pe.dates) { // Fallback from old string 'dates'
          // Fix: Ensure getYearFromTemporalFact is called on the result of parseTemporalFact
          temporal = getYearFromTemporalFact(parseTemporalFact(pe.dates)) ? parseTemporalFact(pe.dates) : undefined;
        } else if (pe.validFrom) { // Fallback from old 'validFrom' number
          temporal = { type: 'instant', timestamp: String(pe.validFrom) };
        }

        // --- SourceCitation parsing for edges ---
        let sources: SourceCitation[] | undefined;
        if (pe.sources && Array.isArray(pe.sources) && pe.sources.every(s => typeof s === 'object' && 'uri' in s)) {
          sources = pe.sources as SourceCitation[];
        } else if (pe.sources && Array.isArray(pe.sources) && pe.sources.every(s => typeof s === 'string')) { // Fallback from old string[]
          sources = (pe.sources as string[]).map(uri => ({ uri, label: uri.length > 50 ? uri.substring(0,47)+'...' : uri, type: 'website' }));
        }

        const newEdgeData: EdgeData = {
          id: pe.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
          source: pe.source || '',
          target: pe.target || '',
          relationType: pe.relationType || 'related_to', // New required field
          label: pe.label, // Keep old label if relationType isn't enough
          temporal: temporal,
          sources: sources,
          certainty: pe.certainty || 'confirmed',
          confidenceScore: pe.confidenceScore,
          sign: pe.sign || 'positive',
          isBalanced: pe.isBalanced,
          weight: pe.weight,
          visibility: pe.visibility,
          // Legacy fields
          dates: pe.dates, validFrom: pe.validFrom, validTo: pe.validTo
        };

        return { data: newEdgeData };
      });

      const validNewEdges = newEdges.filter(e => 
        existingNodeMap.has(e.data.source) && existingNodeMap.has(e.data.target)
      );

      const existingEdges = graph.edges;
      const finalEdges = [...existingEdges];
      
      validNewEdges.forEach(newEdge => {
        const isDuplicate = existingEdges.some(ex => 
          ex.data.source === newEdge.data.source && 
          ex.data.target === newEdge.data.target && 
          ex.data.relationType === newEdge.data.relationType // Compare by relationType
        );
        if (!isDuplicate) finalEdges.push(newEdge);
      });

      const updatedGraph: KnowledgeGraph = {
        nodes: Array.from(existingNodeMap.values()),
        edges: finalEdges,
        meta: graph.meta // Preserve meta data
      };
      return { graph: updatedGraph, filteredGraph: updatedGraph, pendingPatch: null, isThinking: true }; // Set thinking here
    });

    // Run async enrichment outside of set() to prevent blocking
    const currentGraphAfterPatch = get().graph; // Get the latest graph state after the synchronous part
    try {
        const enriched = await enrichGraphWithMetricsAsync(currentGraphAfterPatch);
        set((state) => ({ 
          graph: enriched, 
          filteredGraph: enriched, 
          isThinking: false,
          meta: { // Update meta with new global metrics
            ...state.graph.meta,
            modularity: enriched.meta?.modularity, // Keep legacy if needed for old UI
            globalMetrics: enriched.meta?.globalMetrics,
            communityStructure: enriched.meta?.communityStructure,
            globalBalance: enriched.meta?.globalBalance
          }
        }));
        storage.save(enriched);
    } catch(e) {
        console.error("Metric enrichment failed after patch:", e);
        set({ isThinking: false });
        get().addToast({ title: 'Metric Error', description: 'Saved without full analytics.', type: 'warning' });
        storage.save(currentGraphAfterPatch);
    }
  },

  updateNode: (id, data) => {
    get().pushHistory();
    const { graph } = get();
    const newNodes = graph.nodes.map(n => n.data.id === id ? { ...n, data: { ...n.data, ...data } } : n);
    const newGraph = { ...graph, nodes: newNodes };
    // Optimistic update (no recalc)
    set({ graph: newGraph, filteredGraph: newGraph });
    storage.save(newGraph);
  },

  removeNode: (nodeId) => {
    get().pushHistory();
    const { graph } = get();
    const newNodes = graph.nodes.filter(n => n.data.id !== nodeId);
    const newEdges = graph.edges.filter(e => e.data.source !== nodeId && e.data.target !== nodeId);
    const newGraph = { ...graph, nodes: newNodes, edges: newEdges };
    set({ graph: newGraph, filteredGraph: newGraph, selectedNodeIds: [] });
    get().recalculateGraph(); // Trigger background recalc
  },

  bulkDeleteSelection: () => {
    get().pushHistory();
    const { graph, selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;
    
    const newNodes = graph.nodes.filter(n => !selectedNodeIds.includes(n.data.id));
    const newEdges = graph.edges.filter(e => !selectedNodeIds.includes(e.data.source) && !selectedNodeIds.includes(e.data.target));
    
    const newGraph = { ...graph, nodes: newNodes, edges: newEdges };
    set({ graph: newGraph, filteredGraph: newGraph, selectedNodeIds: [] });
    get().addToast({ title: 'Bulk Delete', description: `Removed ${selectedNodeIds.length} nodes.`, type: 'info' });
    get().recalculateGraph();
  },

  mergeNodes: (keepId, dropId) => {
    get().pushHistory();
    set((state) => {
      const { graph } = state;
      
      const keepNode = graph.nodes.find(n => n.data.id === keepId);
      const dropNode = graph.nodes.find(n => n.data.id === dropId);
      if (!keepNode || !dropNode) return state;

      const newData = { ...keepNode.data };
      
      // Merge richer data, prioritizing existing or more detailed info
      if (!newData.region || (typeof newData.region === 'object' && !newData.region.id) && dropNode.data.region) newData.region = dropNode.data.region;
      if (!newData.description && dropNode.data.description) newData.description = dropNode.data.description;
      if (!newData.validity && dropNode.data.validity) newData.validity = dropNode.data.validity;
      if (!newData.sources && dropNode.data.sources) newData.sources = dropNode.data.sources;
      // TODO: Smarter merging of arrays like 'existence', 'roles', 'sources'

      const updatedEdges = graph.edges.map(e => {
        let edgeData = { ...e.data };
        if (edgeData.source === dropId) edgeData.source = keepId;
        if (edgeData.target === dropId) edgeData.target = keepId;
        return { data: edgeData };
      });
      
      const updatedNodes = graph.nodes
        .filter(n => n.data.id !== dropId)
        .map(n => n.data.id === keepId ? { ...n, data: newData } : n);
        
      const finalEdges = updatedEdges.filter(e => e.data.source !== e.data.target);
      const newGraph = { ...graph, nodes: updatedNodes, edges: finalEdges };
      
      get().addToast({ title: 'Merged Nodes', description: `Merged ${dropNode.data.label} into ${keepNode.data.label}`, type: 'success' });
      return { graph: newGraph, filteredGraph: newGraph };
    });
    get().recalculateGraph(); // Recalc metrics after merge
  },

  toggleNodeSelection: (id, multi) => {
    const { selectedNodeIds } = get();
    if (multi) {
      if (selectedNodeIds.includes(id)) {
        set({ selectedNodeIds: selectedNodeIds.filter(nid => nid !== id) });
      } else {
        set({ selectedNodeIds: [...selectedNodeIds, id] });
      }
    } else {
      set({ selectedNodeIds: [id] });
    }
  },

  clearSelection: () => set({ selectedNodeIds: [] }),
  setEditingNode: (id) => set({ editingNodeId: id }),
  
  runRegionalAnalysis: () => {
    const { graph } = get();
    const result = calculateRegionalMetrics(graph);
    set({ regionalAnalysis: result });
    get().addToast({ title: 'Regional Analysis', description: `Isolation Index: ${(result.isolationIndex * 100).toFixed(1)}%`, type: 'info' });
  },

  addToast: (t) => {
    const id = Math.random().toString(36).substr(2, 9);
    set(state => ({ toasts: [...state.toasts, { ...t, id }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleRightSidebar: () => set(state => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
  
  setThinking: (val) => set({ isThinking: val }),
  addMessage: (msg) => set(state => ({ messages: [...state.messages, msg] })),
  setCommunityColoring: (val) => set({ activeCommunityColoring: val }),
  setCertaintyMode: (val) => set({ showCertainty: val }),
  setSecurityMode: (val) => set({ isSecurityMode: val }),
  setGroupedByRegion: (val) => set({ isGroupedByRegion: val }),
  setLayout: (layout) => set({ activeLayout: layout }),
  setLayoutParams: (params) => set(state => ({ layoutParams: { ...state.layoutParams, ...params } })),
  setFilterYear: (y) => set({ timelineYear: y }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setShowStatsPanel: (show) => set({ showStatsPanel: show }),
  setSemanticSearchOpen: (open) => set({ isSemanticSearchOpen: open }),
  setPendingPatch: (patch) => set({ pendingPatch: patch }),
  
  setDeepeningNode: (id) => set({ deepeningNodeId: id }),
  addResearchTask: (task) => set(state => ({ activeResearchTasks: [task, ...state.activeResearchTasks] })),
  updateResearchTask: (id, updates) => set(state => ({ 
    activeResearchTasks: state.activeResearchTasks.map(t => t.id === id ? { ...t, ...updates } : t) 
  })),

  // NEW: Deep Analysis Actions
  setAnalysisResult: (result) => set((state) => {
    // Update KnowledgeGraph.meta with the latest analysis results
    const updatedGraphMeta = {
      ...state.graph.meta,
      globalMetrics: result?.global_metrics,
      communityStructure: result?.community_structure,
      keyInfluencers: result?.key_influencers,
      strategicCommentary: result?.strategic_commentary,
      rawAnalysisOutput: result?.raw_output,
      lastSaved: Date.now() // Update timestamp for consistency
    };

    return { 
      analysisResult: result, 
      graph: { ...state.graph, meta: updatedGraphMeta },
      filteredGraph: { ...state.filteredGraph, meta: updatedGraphMeta } // Keep filtered graph meta in sync
    };
  }),
  setAnalysisOpen: (open) => set({ isAnalysisOpen: open }),
}));