
import { create } from 'zustand';
import { AppState, KnowledgeGraph, NodeData, ChatMessage, Toast, RegionalAnalysisResult, DuplicateCandidate, GraphPatch, ResearchTask, GraphNode, GraphEdge, LayoutParams } from './types';
import { INITIAL_GRAPH } from './constants';
import { enrichGraphWithMetricsAsync, calculateRegionalMetrics } from './services/graphService';
import { storage } from './services/storage';

interface HistoryState {
  past: KnowledgeGraph[];
  future: KnowledgeGraph[];
}

interface Store extends AppState {
  initGraph: () => void;
  loadFromStorage: () => Promise<KnowledgeGraph | null>;
  
  // Graph Mutation
  addNodesAndEdges: (nodes: any[], edges: any[]) => void;
  applyPatch: (nodes: Partial<NodeData>[], edges: any[]) => void;
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
}

export const useStore = create<Store>((set, get) => ({
  graph: { nodes: [], edges: [] },
  filteredGraph: { nodes: [], edges: [] },
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
  _history: { past: [], future: [] },

  canUndo: () => get()._history.past.length > 0,
  canRedo: () => get()._history.future.length > 0,

  pushHistory: () => {
    const { graph, _history } = get();
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
        // Async metric calc
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
       set({ graph: enriched, filteredGraph: enriched, metricsCalculated: true, isThinking: false });
       storage.save(enriched);
    } catch (e) {
       console.error("Metric recalc failed", e);
       set({ isThinking: false });
    }
  },

  addNodesAndEdges: (newNodesRaw, newEdgesRaw) => {
     get().applyPatch(newNodesRaw, newEdgesRaw);
  },

  applyPatch: async (patchNodes, patchEdges) => {
    get().pushHistory();
    const { graph } = get();
    set({ isThinking: true });

    const existingNodeMap = new Map<string, GraphNode>(graph.nodes.map(n => [n.data.id, n]));
    
    patchNodes.forEach(pn => {
      if (!pn.id) return;
      let year = pn.year;
      if (!year && typeof pn.dates === 'string') {
        const match = pn.dates.match(/\d{4}/);
        if (match && match.length > 0) year = parseInt(match[0]);
      }
      
      if (existingNodeMap.has(pn.id)) {
        const existing = existingNodeMap.get(pn.id)!;
        existingNodeMap.set(pn.id, {
          ...existing,
          data: { ...existing.data, ...pn, id: pn.id, year: year || existing.data.year } as NodeData
        });
      } else {
        existingNodeMap.set(pn.id, {
          data: {
            id: pn.id,
            label: pn.label || pn.id,
            type: pn.type || 'concept',
            year: year,
            dates: pn.dates,
            description: pn.description,
            importance: 0.5,
            region: pn.region || 'Unknown',
            certainty: pn.certainty || 'confirmed'
          } as NodeData
        });
      }
    });

    const newEdges: GraphEdge[] = patchEdges.map(e => ({
      data: {
        id: e.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
        source: e.source,
        target: e.target,
        label: e.relationship || e.label || 'related',
        dates: e.dates,
        certainty: e.certainty || 'confirmed',
        sign: e.sign || 'positive'
      }
    }));

    const validNewEdges = newEdges.filter(e => 
      existingNodeMap.has(e.data.source) && existingNodeMap.has(e.data.target)
    );

    const existingEdges = graph.edges;
    const finalEdges = [...existingEdges];
    
    validNewEdges.forEach(newEdge => {
      const isDuplicate = existingEdges.some(ex => 
        ex.data.source === newEdge.data.source && 
        ex.data.target === newEdge.data.target && 
        ex.data.label === newEdge.data.label
      );
      if (!isDuplicate) finalEdges.push(newEdge);
    });

    const updatedGraph: KnowledgeGraph = {
      nodes: Array.from(existingNodeMap.values()),
      edges: finalEdges
    };

    try {
        const enriched = await enrichGraphWithMetricsAsync(updatedGraph);
        set({ graph: enriched, filteredGraph: enriched, pendingPatch: null, isThinking: false });
        storage.save(enriched);
    } catch(e) {
        set({ isThinking: false });
        get().addToast({ title: 'Metric Error', description: 'Saved without full analytics.', type: 'warning' });
        set({ graph: updatedGraph, filteredGraph: updatedGraph, pendingPatch: null });
        storage.save(updatedGraph);
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
    const { graph } = get();
    
    const keepNode = graph.nodes.find(n => n.data.id === keepId);
    const dropNode = graph.nodes.find(n => n.data.id === dropId);
    if (!keepNode || !dropNode) return;

    const newData = { ...keepNode.data };
    if ((!newData.region || newData.region === 'Unknown') && dropNode.data.region) newData.region = dropNode.data.region;
    if (!newData.description && dropNode.data.description) newData.description = dropNode.data.description;
    if (!newData.dates && dropNode.data.dates) {
       newData.dates = dropNode.data.dates;
       newData.year = dropNode.data.year;
    }

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
    
    set({ graph: newGraph, filteredGraph: newGraph });
    get().addToast({ title: 'Merged Nodes', description: `Merged ${dropNode.data.label} into ${keepNode.data.label}`, type: 'success' });
    get().recalculateGraph();
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
}));
