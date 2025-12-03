
export type NodeType = 'person' | 'organization' | 'event' | 'concept' | 'publication' | 'document' | 'location'; // Added 'document', 'location'

// New: Structured Source Citation
export interface SourceCitation {
  uri: string; // URL, ISBN, Archival Reference ID
  label?: string; // Title or short description
  page?: string; // Page number or specific section (e.g., "pg. 42", "Chapter 3")
  type?: 'primary' | 'secondary' | 'archival' | 'memoir' | 'report' | 'website' | 'book'; // Type of source
  retrievedAt?: number; // Timestamp of when the source was used/retrieved
}

// New: Structured Location/Region Information
export interface RegionInfo {
  id: string; // e.g., 'warszawa_1934', 'wielkopolska_historical'
  label: string; // e.g., 'Warszawa (1934)', 'Wielkopolska'
  country?: string; // e.g., 'Poland'
  coordinates?: { latitude: number; longitude: number; }; // For map integration
  type?: 'city' | 'province' | 'country' | 'geopolitical_entity' | 'historical_region';
}

// ENHANCEMENT: Unified Temporal Representation for Dates/Validity
export type TemporalFactType = 
  | { type: 'instant'; timestamp: string } // e.g., "1918-11-11" or "1903"
  | { type: 'interval'; start: string; end: string } // e.g., "1918-1939"
  | { type: 'fuzzy'; approximate: string; uncertainty?: number }; // uncertainty 0.0 to 1.0 (e.g., "early 1900s", uncertainty 0.2)

export interface NodeData {
  id: string;
  label: string;
  type: NodeType;
  description?: string;

  // ENHANCEMENT: Unified Temporal Representation for Node Existence/Validity
  // Replaces 'year' and 'dates' strings. Uses 'TemporalFactType' for more nuance.
  validity?: TemporalFactType; 

  // ENHANCEMENT: Detailed existence and role history (from previous TemporalNode)
  existence?: Array<{ // For organizations, movements, etc.
    start: string; // ISO date or YYYY
    end?: string; // ISO date or YYYY
    status: 'active' | 'latent' | 'defunct' | 'reformed' | 'formed' | 'dissolved' | 'established';
    context?: string; // e.g., "Formed during the Great War"
  }>;
  roles?: Array<{ // For persons
    role: string; // e.g., 'Leader', 'Member', 'Editor'
    organization?: string; // ID of organization node
    event?: string; // ID of event node
    start: string; // ISO date or YYYY
    end?: string; // ISO date or YYYY
    context?: string; // e.g., "Assumed leadership after Dmowski's death"
  }>;

  importance?: number; // PageRank / Betweenness can derive this, or manually set
  
  // ENHANCEMENT: Structured Region
  region?: RegionInfo; // Replaced string with structured data

  parent?: string; // For Compound Nodes (Cytoscape)
  
  // --- Metrics --- 
  degreeCentrality?: number;
  pagerank?: number;
  community?: number; // Legacy/Fallback
  louvainCommunity?: number; // Real Louvain Community ID
  kCore?: number;
  betweenness?: number;
  closeness?: number;
  eigenvector?: number;
  clustering?: number; // Local Clustering Coefficient

  // --- Network Health Metrics (formerly Clandestine / Security) --- 
  networkHealth?: { // Renamed from 'security'
    efficiency: number; // Speed of info spread (Closeness)
    safety: number; // Isolation from paths (1 - Betweenness)
    balance: number; // Harmonic mean of Efficiency & Safety
    vulnerabilityScore: number; // Renamed from 'risk'
    identifiedIssues: string[]; // Renamed from 'vulnerabilities'
  };

  // --- Research Metadata ---
  embedding?: number[]; 
  // ENHANCEMENT: Structured Sources
  sources?: SourceCitation[]; // Replaced string[] with SourceCitation[]
  certainty?: 'confirmed' | 'disputed' | 'alleged' | 'hypothesized'; // Added 'hypothesized'
  // NEW: Confidence score (0-1) for more granular certainty
  confidenceScore?: number; 

  // Legacy fields to be phased out
  year?: number; // TODO: Migrate to 'validity'
  dates?: string; // TODO: Migrate to 'validity'
}


// --- 2. TEMPORAL FACT/EDGE TYPES (Major Enhancement: Core Graph Edges will become Temporal Facts) ---

// ENHANCEMENT: EdgeData will now *be* a TemporalFact, with more structured relation types.
export interface EdgeData {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  
  // ENHANCEMENT: Structured Relationship Type - use a controlled vocabulary
  relationType: 
    | 'founded' | 'member_of' | 'led' | 'published' | 'influenced' 
    | 'opposed' | 'collaborated_with' | 'participated_in' | 'created' | 'destroyed' 
    | 'related_to' | 'supported' | 'criticized' | 'authored' | 'organized'; 
  
  label?: string; // Optional human-readable label if relationType isn't enough (e.g., "secretly founded"). TODO: Make relationType primary, label secondary.
  
  // ENHANCEMENT: Unified Temporal Data for the Relationship Itself
  temporal?: TemporalFactType;
  
  // Metadata for the relationship
  weight?: number; // Strength of relationship
  sign?: 'positive' | 'negative' | 'neutral'; // Added 'neutral'
  isBalanced?: boolean; // From Triadic Balance
  
  // ENHANCEMENT: Structured Sources for the Relationship
  sources?: SourceCitation[]; // Replaced string[] with SourceCitation[]
  certainty?: 'confirmed' | 'disputed' | 'alleged' | 'hypothesized'; // Added 'hypothesized'
  confidenceScore?: number; // Granular confidence for this specific edge/fact
  
  visibility?: 'public' | 'clandestine' | 'private' | 'restricted'; // Added 'restricted'

  // Legacy fields to be phased out
  dates?: string; // TODO: Migrate to 'temporal'
  validFrom?: number; // TODO: Migrate to 'temporal'
  validTo?: number; // TODO: Migrate to 'temporal'
}


// --- 3. GRAPH STRUCTURES (Update to use enhanced types) ---

export interface GraphNode {
  data: NodeData; // Now uses the enriched NodeData
  position?: { x: number; y: number };
  selected?: boolean;
}

export interface GraphEdge {
  data: EdgeData; // Now uses the enriched EdgeData
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  // ENHANCEMENT: Consolidate Graph-Level Analysis Metrics
  meta?: {
    lastSaved?: number;
    version?: string;

    // Direct integration of PythonAnalysisResult's global metrics
    globalMetrics?: {
      density: number;
      transitivity: number;
      number_connected_components: number;
      is_connected?: boolean; // Added from PythonAnalysisResult
    };
    communityStructure?: {
      modularity: number;
      num_communities: number;
      // Added for more granular info from Python analysis
      largest_community_size?: number; 
    };
    // Keep key influencers as a top-level summary
    keyInfluencers?: Array<{ id: string; label: string; score: number; metric: 'pagerank' | 'betweenness' }>;
    // The "Dmowski" insight for the *current* graph state
    strategicCommentary?: string; 
    // Any raw output for debugging
    rawAnalysisOutput?: string;

    modularity?: number; // Legacy, will be replaced by communityStructure.modularity
    globalBalance?: number; // 0 to 1
  };
}

export interface GraphPatch {
  type: 'expansion' | 'deepening' | 'document_ingestion'; // Added 'document_ingestion'
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
  sources?: SourceCitation[]; // ENHANCEMENT: Structured sources
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
  type: 'expansion' | 'deepening' | 'analysis' | 'ingestion'; // Added 'ingestion'
  target: string;
  status: 'running' | 'complete' | 'failed';
  reasoning?: string;
  progress?: number; // 0-100
}

export interface LayoutParams {
  gravity: number;
  friction: number;
  spacing: number;
  nodeRepulsion: number;
  idealEdgeLength: number;
}

// --- PYTHON ANALYSIS RESULTS (Keep as a specific *record* of an analysis run) ---
// This is now the *result of a specific analysis run*, which can then update KnowledgeGraph.meta
export interface PythonAnalysisResult {
  timestamp: number;
  global_metrics: {
    density: number;
    transitivity: number; // Global Clustering
    is_connected: boolean; // Added for consistency
    number_connected_components: number;
  };
  community_structure: {
    modularity: number;
    num_communities: number;
    largest_community_size: number; // Added for consistency
  };
  key_influencers: Array<{ id: string; label: string; score: number; metric: 'pagerank' | 'betweenness' }>; // Added 'betweenness'
  strategic_commentary: string; 
  raw_output?: string;
}

export interface AppState {
  graph: KnowledgeGraph;
  filteredGraph: KnowledgeGraph;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  deepeningNodeId: string | null;
  pendingPatch: GraphPatch | null;
  activeResearchTasks: ResearchTask[];
  metricsCalculated: boolean; // Will now reflect successful update of KnowledgeGraph.meta
  activeCommunityColoring: boolean;
  showCertainty: boolean;
  isSecurityMode: boolean; // Renamed from isClandestineMode
  isGroupedByRegion: boolean;
  activeLayout: string;
  layoutParams: LayoutParams;
  minDegreeFilter: number;
  isSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  timelineYear: number | null; // This will now filter nodes based on NodeData.validity
  isPlaying: boolean;
  regionalAnalysis: RegionalAnalysisResult | null;
  showStatsPanel: boolean;
  isSemanticSearchOpen: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  toasts: Toast[];

  // This could become an array if we want a history of analysis runs
  analysisResult: PythonAnalysisResult | null; 
  isAnalysisOpen: boolean;
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
