
import { KnowledgeGraph, GraphNode, GraphEdge, TemporalFactType, SourceCitation, RegionInfo, NodeData, EdgeData, NodeType } from './types';

// Theme Constants (Must match index.html Tailwind config)
export const THEME = {
  colors: {
    background: '#020617', // Deco Navy
    surface: '#0f172a', // Deco Panel
    parchment: '#fdfbf7', // Deco Paper
    antiqueBrass: '#d4af37', // Deco Gold
    forestUniform: '#0f172a', // Deco Panel for uniformity or specific background elements
    crimson: '#dc143c', // Deco Crimson
    textMain: '#fdfbf7', // Deco Paper
    textDim: '#a3a3a3' // Lighter grey for dim text
  }
};

// Historical Keyframes for Timeline
export const TIMELINE_KEYFRAMES = [
  { year: 1893, label: 'Liga', color: '#d4af37' },
  { year: 1897, label: 'SND', color: '#d4af37' },
  { year: 1905, label: 'Revol.', color: '#dc143c' },
  { year: 1918, label: 'Indep.', color: '#fdfbf7' },
  { year: 1919, label: 'Versailles', color: '#d4af37' },
  { year: 1926, label: 'Coup', color: '#dc143c' },
  { year: 1933, label: 'OWP Ban', color: '#dc143c' },
  { year: 1939, label: 'WWII', color: '#020617' }
];

// Re-using data structure but ensuring types are consistent
const DATA = {
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
  person: '#fdfbf7',      // Deco Paper (Cream)
  organization: '#d4af37', // Deco Gold
  event: '#dc143c',       // Deco Crimson
  publication: '#0f172a', // Deco Panel (Deep Navy)
  concept: '#a3a3a3',     // Ash Grey
  document: '#a3a3a3',    // Ash Grey
  location: '#34d399',    // Emerald Green (a pop of color for map entities)
};

// Art Deco Tiered Palette: Gold, Crimson, Panel, Navy, etc.
export const COMMUNITY_COLORS = [
  '#d4af37', // Deco Gold
  '#dc143c', // Deco Crimson
  '#0f172a', // Deco Panel
  '#020617', // Deco Navy
  '#e0dcd7', // Dimmer Paper
  '#78350f', // Warm Brown
];
