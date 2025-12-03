
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
      "importance": 1.0, "certainty": "confirmed",
      "sources": [{ uri: "https://pl.wikipedia.org/wiki/Roman_Dmowski", label: "Wikipedia" }] as SourceCitation[]
    },
    { 
      "id": "liga_narodowa", "label": "Liga Narodowa", "type": "organization", 
      "validity": { type: 'interval', start: '1893', end: '1928' } as TemporalFactType, 
      "importance": 1.0, "certainty": "confirmed",
      "region": { id: 'poland', label: 'Poland', type: 'country' } as RegionInfo
    },
    { 
      "id": "mysli_polaka", "label": "Myśli nowoczesnego Polaka", "type": "publication", 
      "validity": { type: 'instant', timestamp: '1903' } as TemporalFactType, 
      "importance": 0.8, "certainty": "confirmed"
    }
  ],
  "edges": [
     { 
       "source": "dmowski_roman", "target": "liga_narodowa", "relationType": "founded", 
       "temporal": { type: 'instant', timestamp: '1893' } as TemporalFactType, 
       "sources": [{ uri: "https://pl.wikipedia.org/wiki/Liga_Narodowa", label: "Wikipedia" }] as SourceCitation[],
       "certainty": "confirmed"
     },
     { 
       "source": "dmowski_roman", "target": "mysli_polaka", "relationType": "authored", 
       "temporal": { type: 'instant', timestamp: '1903' } as TemporalFactType,
       "sources": [{ uri: "https://pl.wikipedia.org/wiki/My%C5%9Bli_nowoczesnego_Polaka", label: "Wikipedia" }] as SourceCitation[],
       "certainty": "confirmed"
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
    certainty: n.certainty as NodeData['certainty'],
    sources: n.sources,
    region: n.region,
  }
}));

const mappedEdges: GraphEdge[] = DATA.edges.map((e, i) => ({
  data: {
    id: `edge_${i}`,
    source: e.source,
    target: e.target,
    relationType: e.relationType as EdgeData['relationType'],
    temporal: e.temporal,
    certainty: e.certainty as EdgeData['certainty'],
    sources: e.sources,
    sign: 'positive' // Default sign for initial edges
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