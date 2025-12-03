
import { KnowledgeGraph, GraphNode, GraphEdge, TemporalFactType, SourceCitation, RegionInfo, NodeData, EdgeData, NodeType } from './types';

// Theme Constants (Must match index.html Tailwind config)
export const THEME = {
  colors: {
    background: '#0a0f0d', // Deep Forest Black (OWP vibe)
    surface: '#141e18',    // Dark Green-Black Panel
    parchment: '#e8e4d9',  // Sand / OWP Uniform Shirt Color
    antiqueBrass: '#c5a059', // Tarnished Gold (Sword Hilt)
    crimson: '#8a1c1c',    // Dried Blood / Ribbon Red
    forestUniform: '#1e3a25', // Mieczyk Green (Ribbon background)
    textMain: '#e8e4d9',
    textDim: '#7a857f'     // Muted Green-Grey
  }
};

// Historical Keyframes for Timeline
export const TIMELINE_KEYFRAMES = [
  { year: 1893, label: 'Liga', color: '#c5a059' },
  { year: 1897, label: 'SND', color: '#c5a059' },
  { year: 1905, label: 'Revol.', color: '#8a1c1c' },
  { year: 1918, label: 'Indep.', color: '#e8e4d9' },
  { year: 1919, label: 'Versailles', color: '#c5a059' },
  { year: 1926, label: 'Coup', color: '#8a1c1c' },
  { year: 1933, label: 'OWP Ban', color: '#8a1c1c' },
  { year: 1939, label: 'WWII', color: '#0a0f0d' }
];

// --- New interfaces for raw data to aid type inference ---
interface RawNodeData {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  validity?: TemporalFactType;
  importance?: number;
  certainty?: NodeData['certainty'];
  sources?: SourceCitation[];
  region?: RegionInfo;
  existence?: NodeData['existence'];
  roles?: NodeData['roles'];
}

interface RawEdgeData {
  source: string;
  target: string;
  relationType: EdgeData['relationType'];
  temporal?: TemporalFactType;
  sources?: SourceCitation[];
  certainty?: EdgeData['certainty'];
  sign?: EdgeData['sign'];
  label?: string; // Allow optional label for raw data
}
// Re-using data structure but ensuring types are consistent
const DATA: { metadata: any; nodes: RawNodeData[]; edges: RawEdgeData[]; } = {
  "metadata": {
    "title": "Baza Wiedzy o Endecji (Narodowej Demokracji)",
    "version": "2.0", // Updated version
  },
  "nodes": [
    { 
      "id": "dmowski_roman", "label": "Roman Dmowski", "type": "person", 
      "validity": { type: 'interval', start: '1864', end: '1939' } as TemporalFactType, 
      "importance": 1.0, "certainty": "confirmed" as NodeData['certainty'],
      "sources": [{ uri: "https://pl.wikipedia.org/wiki/Roman_Dmowski", label: "Wikipedia", type: 'website' }] as SourceCitation[],
      "existence": [{ start: '1864', end: '1939', status: 'formed' as const, context: 'Born, died' }]
    },
    { 
      "id": "liga_narodowa", "label": "Liga Narodowa", "type": "organization", 
      "validity": { type: 'interval', start: '1893', end: '1928' } as TemporalFactType, 
      "importance": 1.0, "certainty": "confirmed" as NodeData['certainty'],
      "region": { id: 'poland', label: 'Poland', type: 'country' } as RegionInfo,
      "sources": [{ uri: "https://pl.wikipedia.org/wiki/Liga_Narodowa", label: "Wikipedia", type: 'website' }] as SourceCitation[],
      "existence": [{ start: '1893', end: '1928', status: 'formed' as const, context: 'Active as a political organization' }]
    },
    { 
      "id": "mysli_polaka", "label": "Myśli nowoczesnego Polaka", "type": "publication", 
      "validity": { type: 'instant', timestamp: '1903' } as TemporalFactType, 
      "importance": 0.8, "certainty": "confirmed" as NodeData['certainty'],
      "sources": [{ uri: "https://pl.wikipedia.org/wiki/My%C5%9Bli_nowoczesnego_Polaka", label: "Wikipedia", type: 'website' }] as SourceCitation[]
    }
  ],
  "edges": [
     { 
       "source": "dmowski_roman", "target": "liga_narodowa", "relationType": "founded" as EdgeData['relationType'], 
       "temporal": { type: 'instant', timestamp: '1893' } as TemporalFactType, 
       "sources": [{ uri: "https://pl.wikipedia.org/wiki/Liga_Narodowa", label: "Wikipedia", type: 'website' }] as SourceCitation[],
       "certainty": "confirmed" as EdgeData['certainty'],
       "sign": "positive" as EdgeData['sign']
     },
     { 
       "source": "dmowski_roman", "target": "mysli_polaka", "relationType": "authored" as EdgeData['relationType'], 
       "temporal": { type: 'instant', timestamp: '1903' } as TemporalFactType,
       "sources": [{ uri: "https://pl.wikipedia.org/wiki/My%C5%9Bli_nowoczesnego_Polaka", label: "Wikipedia", type: 'website' }] as SourceCitation[],
       "certainty": "confirmed" as EdgeData['certainty'],
       "sign": "positive" as EdgeData['sign']
     }
  ]
};

const mappedNodes: GraphNode[] = DATA.nodes.map(n => ({
  data: {
    id: n.id,
    label: n.label,
    // Fix: Explicitly cast n.type to NodeType to satisfy the type checking
    type: n.type as NodeType,
    validity: n.validity,
    importance: n.importance || 0.5,
    certainty: n.certainty,
    sources: n.sources,
    region: n.region,
    existence: n.existence,
    // Fix: Ensure roles property exists, providing an empty array if undefined
    roles: n.roles || [],
  }
}));

const mappedEdges: GraphEdge[] = DATA.edges.map((e, i) => ({
  data: {
    id: `edge_${i}`,
    source: e.source,
    target: e.target,
    relationType: e.relationType,
    temporal: e.temporal,
    certainty: e.certainty,
    sources: e.sources,
    // Fix: Ensure sign is explicitly cast to 'positive' | 'negative' | 'neutral'
    sign: e.sign || 'positive' as EdgeData['sign'] // Default sign for initial edges
  }
}));

export const INITIAL_GRAPH: KnowledgeGraph = {
  nodes: mappedNodes,
  edges: mappedEdges,
  meta: { version: "2.0" } // Updated version
};

export const COLORS = {
  person: '#e8e4d9',      // Sand
  organization: '#c5a059', // Tarnished Gold
  event: '#8a1c1c',       // Dried Blood
  publication: '#141e18', // Dark Green-Black Panel
  concept: '#7a857f',     // Muted Green-Grey
  document: '#7a857f',    // Muted Green-Grey
  location: '#34d399',    // Emerald Green (a pop of color for map entities)
};

// Mieczyk Chrobrego Tiered Palette: Tarnished Gold, Dried Blood, Dark Green-Black Panel, Deep Forest Black etc.
export const COMMUNITY_COLORS = [
  '#c5a059', // Tarnished Gold
  '#8a1c1c', // Dried Blood
  '#141e18', // Dark Green-Black Panel
  '#0a0f0d', // Deep Forest Black
  '#e8e4d9', // Sand
  '#7a857f', // Muted Green-Grey
];