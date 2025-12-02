
export type NodeType = 'person' | 'organization' | 'event' | 'concept' | 'publication' | 'Person' | 'Organization' | 'Event' | 'Concept' | 'Publication';

export interface NodeData {
  id: string;
  label: string;
  type: NodeType;
  year?: number; // Approximate year of relevance
  description?: string;
  dates?: string;
  importance?: number;
  region?: string; // 'Warszawa', 'Wielkopolska', 'Galicja', 'Emigracja'
  parent?: string; // For Compound Nodes (Cytoscape)
  
  // Metrics
  degreeCentrality?: number;
  pagerank?: number;
  community?: number; // Legacy/Fallback
  louvainCommunity?: number; // Real Louvain Community ID
  kCore?: number;
  
  // Tier-3 Advanced Metrics
  betweenness?: number;
  closeness?: number;
  eigenvector?: number;
  clustering?: number; // Local Clustering Coefficient

  // Clandestine / Security Metrics (SOTA Upgrade)
  security?: {
    efficiency: number; // Speed of info spread (Closeness)
    safety: number; // Isolation from paths (1 - Betweenness)
    balance: number; // Harmonic mean of Efficiency & Safety
    risk: number; // Infiltration risk score
    vulnerabilities: string[];
  };

  // Embedding for semantic search
  embedding?: number[]; 
  sources?: string[];
  certainty?: 'confirmed' | 'disputed' | 'alleged';
}

// --- TKG ENHANCEMENTS ---

export type TemporalFactType = 
  | { type: 'instant'; timestamp: string }
  | { type: 'interval'; start: string; end: string }
  | { type: 'fuzzy'; approximate: string; uncertainty: number }; // uncertainty 0.0 to 1.0

export interface TemporalFact {
  id: string;
  subject: string; // entity ID
  relation: string;
  object: string; // entity ID
  
  // Temporal Discrimination
  temporal: TemporalFactType;
  
  // Flat Indexing Helpers
  validFrom?: string; // ISO date or year
  validTo?: string; // Optional end date
  
  certainty: 'confirmed' | 'disputed' | 'alleged';
  sources: string[];
}

export interface TemporalNode extends NodeData {
  // Timeline of existence (e.g. for organizations or movements)
  existence?: Array<{
    start: string;
    end?: string;
    status: 'active' | 'latent' | 'defunct' | 'reformed';
  }>;
  
  // Role evolution for persons
  roles?: Array<{
    role: string;
    organization: string;
    start: string;
    end?: string;
  }>;
}

export interface TemporalKnowledgeGraph {
  nodes: GraphNode[]; // Wrapper around TemporalNode data
  facts: TemporalFact[]; // Replaces standard edges in TKG mode
  meta?: KnowledgeGraph['meta'];
}

// --- STANDARD GRAPH TYPES ---

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label: string; // relationship
  dates?: string;
  validFrom?: number; // TKG Start
  validTo?: number; // TKG End
  weight?: number;
  // Triadic Balance
  sign?: 'positive' | 'negative';
  isBalanced?: boolean;
  certainty?: 'confirmed' | 'disputed' | 'alleged';
  visibility?: 'public' | 'clandestine' | 'private';
}

export interface GraphNode {
  data: NodeData | TemporalNode;
  position?: { x: number; y: number };
  selected?: boolean;
}

export interface GraphEdge {
  data: EdgeData;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta?: {
    modularity?: number;
    globalBalance?: number; // 0 to 1
    lastSaved?: number;
    version?: string; // Data version for migration
  };
}

export interface GraphPatch {
  type: 'expansion' | 'deepening';
  reasoning: string;
  thoughtSignature?: string; // Gemini 3.0 Continuity Hash
  nodes: Partial<NodeData>[];
  edges: Partial<EdgeData>[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
  reasoning?: string; // For ReAct display
  timestamp: number;
  sources?: Array<{ title: string; uri: string }>;
  toolCalls?: any[];
  toolResponses?: any[];
}

export interface Toast {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface DuplicateCandidate {
  nodeA: NodeData;
  nodeB: NodeData;
  similarity: number;
  reason?: string;
}

export interface RegionalAnalysisResult {
  isolationIndex: number; // Assortativity
  bridges: Array<{ id: string; label: string; score: number }>;
  dominantRegion: string;
}

export interface ResearchTask {
  id: string;
  type: 'expansion' | 'deepening' | 'analysis';
  target: string;
  status: 'running' | 'complete' | 'failed';
  reasoning?: string;
}

export interface LayoutParams {
  gravity: number;
  friction: number;
  spacing: number;
  nodeRepulsion: number;
  idealEdgeLength: number;
}

export interface AppState {
  graph: KnowledgeGraph;
  filteredGraph: KnowledgeGraph;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  deepeningNodeId: string | null;
  pendingPatch: GraphPatch | null;
  activeResearchTasks: ResearchTask[];
  metricsCalculated: boolean;
  activeCommunityColoring: boolean;
  showCertainty: boolean;
  isSecurityMode: boolean;
  isGroupedByRegion: boolean;
  activeLayout: string;
  layoutParams: LayoutParams;
  minDegreeFilter: number;
  isSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  timelineYear: number | null;
  isPlaying: boolean;
  regionalAnalysis: RegionalAnalysisResult | null;
  showStatsPanel: boolean;
  isSemanticSearchOpen: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  toasts: Toast[];
  _history: {
    past: KnowledgeGraph[];
    future: KnowledgeGraph[];
  };
}

export interface CommunitySummary {
  id: string;
  level: number;
  communityId: number;
  summary: string;
  entities: string[];
  timespan: string;
  region: string;
}

export interface GraphRAGIndex {
  hierarchies: Record<number, Record<string, number>>;
  summaries: CommunitySummary[];
}
