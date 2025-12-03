
import { create } from 'zustand';
import { produce } from 'immer'; // Import Immer's produce function
import { 
  AppState, 
  KnowledgeGraph, 
  NodeData, 
  ChatMessage, 
  Toast, 
  RegionalAnalysisResult, 
  GraphPatch, 
  ResearchTask, 
  GraphNode, 
  GraphEdge, 
  LayoutParams, 
  PythonAnalysisResult,
  TemporalFactType,
  SourceCitation,
  RegionInfo,
  EdgeData,
  Existence,
  Role
} from './types';
import { INITIAL_GRAPH } from './constants';
import { enrichGraphWithMetricsAsync, calculateRegionalMetrics } from './services/graphService';
import { parseTemporalFact } from './services/geminiService'; 
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

// --- Type Guards for Robust Parsing ---
function isTemporalFactType(obj: any): obj is TemporalFactType {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}

function isSourceCitationArray(arr: any[]): arr is SourceCitation[] {
  return Array.isArray(arr) && arr.every(item => typeof item === 'object' && 'uri' in item);
}

function isRegionInfo(obj: any): obj is RegionInfo {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'label' in obj;
}

function isExistenceArray(arr: any[]): arr is Existence[] {
  return Array.isArray(arr) && arr.every(item => typeof item === 'object' && 'start' in item);
}

function isRoleArray(arr: any[]): arr is Role[] {
  return Array.isArray(arr) && arr.every(item => typeof item === 'object' && 'role' in item);
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
  analysisResult: null,
  isAnalysisOpen: false,
  _history: { past: [], future: [] },

  canUndo: () => get()._history.past.length > 0,
  canRedo: () => get()._history.future.length > 0,

  // Optimized History Push using Immer structural sharing
  pushHistory: () => {
    const { graph, _history } = get();
    const MAX_HISTORY_SIZE = 15;

    // Lightweight check to avoid duplicates
    if (_history.past.length > 0) {
        const lastSavedGraph = _history.past[0];
        if (lastSavedGraph === graph) return; // Structural equality check is fast with Immer/frozen objects
        if (lastSavedGraph.nodes.length === graph.nodes.length && 
            lastSavedGraph.edges.length === graph.edges.length &&
            lastSavedGraph.meta?.lastSaved === graph.meta?.lastSaved) {
            return; 
        }
    }

    set(
      produce((state: Store) => {
        state._history.future = [];
        state._history.past.unshift(state.graph); // Immer handles the structural sharing
        if (state._history.past.length > MAX_HISTORY_SIZE) {
            state._history.past.pop();
        }
      })
    );
  },

  undo: () => {
    set(
      produce((state: Store) => {
        if (state._history.past.length === 0) return;
        const previous = state._history.past.shift();
        if (previous) {
          state._history.future.unshift(state.graph);
          state.graph = previous;
          state.filteredGraph = previous; // Sync view
          // We don't save to storage on undo to allow "redoing" back to latest if needed, 
          // or we can save. Saving is safer for refresh.
          storage.save(previous);
        }
      })
    );
  },

  redo: () => {
    set(
      produce((state: Store) => {
        if (state._history.future.length === 0) return;
        const next = state._history.future.shift();
        if (next) {
          state._history.past.unshift(state.graph);
          state.graph = next;
          state.filteredGraph = next;
          storage.save(next);
        }
      })
    );
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
       set(
        produce((state: Store) => {
            state.graph = enriched;
            state.filteredGraph = enriched;
            state.metricsCalculated = true;
            state.isThinking = false;
            state.graph.meta = {
              ...state.graph.meta,
              modularity: enriched.meta?.modularity,
              globalMetrics: enriched.meta?.globalMetrics,
              communityStructure: enriched.meta?.communityStructure,
              globalBalance: enriched.meta?.globalBalance,
              lastSaved: Date.now(),
            };
            state.filteredGraph.meta = state.graph.meta;
        })
       );
       storage.save(enriched);
    } catch (e) {
       console.error("Metric recalc failed", e);
       set({ isThinking: false });
    }
  },

  addNodesAndEdges: (newNodesRaw, newEdgesRaw) => {
     get().applyPatch(newNodesRaw, newEdgesRaw);
  },

  // Optimized ApplyPatch with robust parsing and type guards
  applyPatch: async (patchNodes, patchEdges) => {
    get().pushHistory();
    set(
      produce((state: Store) => {
        const { graph } = state;
        const existingNodeMap = new Map<string, GraphNode>(graph.nodes.map(n => [n.data.id, n]));
        
        patchNodes.forEach(pn => {
          if (!pn.id) return;
          
          let validity: TemporalFactType | undefined;
          if (pn.validity && isTemporalFactType(pn.validity)) {
            validity = pn.validity;
          } else if (pn.dates) { 
            validity = parseTemporalFact(pn.dates);
          } else if (pn.year) { 
            validity = { type: 'instant', timestamp: String(pn.year) };
          }

          let region: RegionInfo | undefined;
          if (pn.region && isRegionInfo(pn.region)) {
            region = pn.region;
          } else if (pn.region && typeof pn.region === 'string') { 
            region = { id: pn.region.toLowerCase().replace(/\s/g, '_'), label: pn.region, type: 'historical_region' };
          }

          let sources: SourceCitation[] | undefined;
          if (pn.sources && isSourceCitationArray(pn.sources as any[])) {
            sources = pn.sources;
          } else if (pn.sources && Array.isArray(pn.sources) && pn.sources.every(s => typeof s === 'string')) { 
            sources = (pn.sources as string[]).map(uri => ({ uri, label: uri.length > 50 ? uri.substring(0,47)+'...' : uri, type: 'website' }));
          }

          let existence: Existence[] | undefined;
          if (pn.existence && isExistenceArray(pn.existence as any[])) existence = pn.existence;

          let roles: Role[] | undefined;
          if (pn.roles && isRoleArray(pn.roles as any[])) roles = pn.roles;


          const newNodeData: NodeData = {
            id: pn.id,
            label: pn.label || pn.id,
            type: pn.type || 'concept',
            description: pn.description,
            validity: validity,
            region: region,
            certainty: pn.certainty || 'confirmed',
            confidenceScore: pn.confidenceScore,
            existence: existence,
            roles: roles,
            sources: sources,
            degreeCentrality: pn.degreeCentrality, pagerank: pn.pagerank, community: pn.community,
            louvainCommunity: pn.louvainCommunity, kCore: pn.kCore, betweenness: pn.betweenness,
            closeness: pn.closeness, eigenvector: pn.eigenvector, clustering: pn.clustering,
            networkHealth: pn.networkHealth, embedding: pn.embedding, parent: pn.parent,
            year: undefined,
            dates: undefined
          };
          
          if (existingNodeMap.has(pn.id)) {
            const existing = existingNodeMap.get(pn.id)!;
            // Immer allows direct mutation of the 'draft' map values if we were using a Draft Map, 
            // but here we are rebuilding the array.
            // We update the map to track changes for edge validation later.
            existingNodeMap.set(pn.id, {
              ...existing,
              data: { ...existing.data, ...newNodeData, id: pn.id }
            });
          } else {
            existingNodeMap.set(pn.id, { data: newNodeData });
          }
        });

        const newEdges: GraphEdge[] = patchEdges.map(pe => {
          let temporal: TemporalFactType | undefined;
          if (pe.temporal && isTemporalFactType(pe.temporal)) {
            temporal = pe.temporal;
          } else if (pe.dates) { 
            temporal = parseTemporalFact(pe.dates);
          } else if (pe.validFrom) { 
            temporal = { type: 'instant', timestamp: String(pe.validFrom) };
          }

          let sources: SourceCitation[] | undefined;
          if (pe.sources && isSourceCitationArray(pe.sources as any[])) {
            sources = pe.sources;
          } else if (pe.sources && Array.isArray(pe.sources) && pe.sources.every(s => typeof s === 'string')) { 
            sources = (pe.sources as string[]).map(uri => ({ uri, label: uri.length > 50 ? uri.substring(0,47)+'...' : uri, type: 'website' }));
          }

          const newEdgeData: EdgeData = {
            id: pe.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
            source: pe.source || '',
            target: pe.target || '',
            relationType: pe.relationType || 'related_to',
            label: pe.label,
            temporal: temporal,
            sources: sources,
            certainty: pe.certainty || 'confirmed',
            confidenceScore: pe.confidenceScore,
            sign: pe.sign || 'positive',
            isBalanced: pe.isBalanced,
            weight: pe.weight,
            visibility: pe.visibility,
            dates: undefined, validFrom: undefined, validTo: undefined
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
            ex.data.relationType === newEdge.data.relationType
          );
          if (!isDuplicate) finalEdges.push(newEdge);
        });

        state.graph = {
          nodes: Array.from(existingNodeMap.values()),
          edges: finalEdges,
          meta: { ...graph.meta, lastSaved: Date.now() }
        };
        state.filteredGraph = state.graph;
        state.pendingPatch = null; 
        state.isThinking = true;
      })
    );

    const currentGraphAfterPatch = get().graph;
    try {
        const enriched = await enrichGraphWithMetricsAsync(currentGraphAfterPatch);
        set(
          produce((state: Store) => {
            state.graph = enriched; 
            state.filteredGraph = enriched; 
            state.isThinking = false;
            state.graph.meta = {
              ...state.graph.meta,
              modularity: enriched.meta?.modularity,
              globalMetrics: enriched.meta?.globalMetrics,
              communityStructure: enriched.meta?.communityStructure,
              globalBalance: enriched.meta?.globalBalance,
              lastSaved: Date.now()
            };
            state.filteredGraph.meta = state.graph.meta;
          })
        );
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
    set(
      produce((state: Store) => {
        const node = state.graph.nodes.find(n => n.data.id === id);
        if (node) {
            node.data = { ...node.data, ...data };
            state.graph.meta.lastSaved = Date.now();
            state.filteredGraph = state.graph; // Assuming full sync is okay for now
        }
      })
    );
    storage.save(get().graph);
  },

  removeNode: (nodeId) => {
    get().pushHistory();
    set(
      produce((state: Store) => {
        state.graph.nodes = state.graph.nodes.filter(n => n.data.id !== nodeId);
        state.graph.edges = state.graph.edges.filter(e => e.data.source !== nodeId && e.data.target !== nodeId);
        state.graph.meta.lastSaved = Date.now();
        state.filteredGraph = state.graph;
        state.selectedNodeIds = [];
      })
    );
    get().recalculateGraph();
  },

  bulkDeleteSelection: () => {
    get().pushHistory();
    set(
      produce((state: Store) => {
        const ids = state.selectedNodeIds;
        if (ids.length === 0) return;
        
        state.graph.nodes = state.graph.nodes.filter(n => !ids.includes(n.data.id));
        state.graph.edges = state.graph.edges.filter(e => !ids.includes(e.data.source) && !ids.includes(e.data.target));
        state.graph.meta.lastSaved = Date.now();
        state.filteredGraph = state.graph;
        state.selectedNodeIds = [];
      })
    );
    get().addToast({ title: 'Bulk Delete', description: `Removed nodes.`, type: 'info' });
    get().recalculateGraph();
  },

  mergeNodes: (keepId, dropId) => {
    get().pushHistory();
    set(
      produce((state: Store) => {
        const { graph } = state;
        
        const keepNodeIndex = graph.nodes.findIndex(n => n.data.id === keepId);
        const dropNodeIndex = graph.nodes.findIndex(n => n.data.id === dropId);
        
        if (keepNodeIndex === -1 || dropNodeIndex === -1) return;
        
        const keepNode = graph.nodes[keepNodeIndex];
        const dropNode = graph.nodes[dropNodeIndex];

        // Merge logic
        const newData = keepNode.data;
        if (!newData.region || (typeof newData.region === 'object' && !newData.region.id) && dropNode.data.region) newData.region = dropNode.data.region;
        if (!newData.description && dropNode.data.description) newData.description = dropNode.data.description;
        if (!newData.validity && dropNode.data.validity) newData.validity = dropNode.data.validity;
        
        // Concat arrays
        if (dropNode.data.sources) {
            newData.sources = [...(newData.sources || []), ...dropNode.data.sources];
            // Basic dedup by URI
            const seen = new Set();
            newData.sources = newData.sources.filter(s => {
                if (seen.has(s.uri)) return false;
                seen.add(s.uri);
                return true;
            });
        }
        // Similar merge logic for existence/roles could be added here

        // Update Edges
        graph.edges.forEach(e => {
            if (e.data.source === dropId) e.data.source = keepId;
            if (e.data.target === dropId) e.data.target = keepId;
        });

        // Remove drop node
        graph.nodes.splice(dropNodeIndex, 1);
        
        // Remove self-loops created by merge
        state.graph.edges = graph.edges.filter(e => e.data.source !== e.data.target);
        
        state.graph.meta.lastSaved = Date.now();
        state.filteredGraph = state.graph;
      })
    );
    get().addToast({ title: 'Merged Nodes', description: `Merged nodes successfully.`, type: 'success' });
    get().recalculateGraph();
  },

  toggleNodeSelection: (id, multi) => {
    set(
      produce((state: Store) => {
        if (multi) {
          if (state.selectedNodeIds.includes(id)) {
            state.selectedNodeIds = state.selectedNodeIds.filter(nid => nid !== id);
          } else {
            state.selectedNodeIds.push(id);
          }
        } else {
          state.selectedNodeIds = [id];
        }
      })
    );
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
  setAnalysisResult: (result) => set(produce((state: Store) => {
    const updatedGraphMeta = {
      ...state.graph.meta,
      globalMetrics: result?.global_metrics,
      communityStructure: result?.community_structure,
      keyInfluencers: result?.key_influencers,
      strategicCommentary: result?.strategic_commentary,
      rawAnalysisOutput: result?.raw_output,
      lastSaved: Date.now()
    };

    state.analysisResult = result;
    state.graph.meta = updatedGraphMeta;
    state.filteredGraph.meta = updatedGraphMeta;
  })),
  setAnalysisOpen: (open) => set({ isAnalysisOpen: open }),
}));
