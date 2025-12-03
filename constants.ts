

import { KnowledgeGraph, GraphNode, GraphEdge, TemporalFactType, SourceCitation, RegionInfo } from './types';

// Theme Constants (Must match index.html Tailwind config)
export const THEME = {
  colors: {
    background: '#050a06', // Bunker Dark
    surface: '#0f1f12', // Forest Deep
    parchment: '#e5e5c0',
    antiqueBrass: '#b45309',
    forestUniform: '#1e3a25',
    crimson: '#991b1b',
    textMain: '#e5e5c0',
    textDim: '#8f8f70'
  }
};

// Historical Keyframes for Timeline
export const TIMELINE_KEYFRAMES = [
  { year: 1893, label: 'Liga', color: '#1e3a25' },
  { year: 1897, label: 'SND', color: '#b45309' },
  { year: 1905, label: 'Revol.', color: '#991b1b' },
  { year: 1918, label: 'Indep.', color: '#e5e5c0' },
  { year: 1919, label: 'Versailles', color: '#b45309' },
  { year: 1926, label: 'Coup', color: '#991b1b' },
  { year: 1933, label: 'OWP Ban', color: '#991b1b' },
  { year: 1939, label: 'WWII', color: '#000000' }
];

// Re-using data structure but ensuring types are consistent
const DATA = {
  "metadata": {
    "title": "Baza Wiedzy o Endecji (Narodowej Demokracji)",
    "version": "1.3",
  },
  "nodes": [
    // For brevity in this code update, we will assume the GraphService handles the initial seed 
    // or it's loaded via the Store's Init. The DATA object in constants is mainly a fallback seed.
    // Keeping minimal valid seed for stability:
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
      "importance": 1.0, "certainty": "confirmed"
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
    type: n.type, // Cast to any to bypass strictness if legacy type is still used
    validity: n.validity,
    importance: n.importance || 0.5,
    // Fix: Explicitly cast certainty to the correct union type
    certainty: n.certainty as NodeData['certainty'],
    sources: n.sources,
    region: n.region,
    // TODO: Map legacy 'year'/'dates' if present in DATA to 'validity'
  }
}));

const mappedEdges: GraphEdge[] = DATA.edges.map((e, i) => ({
  data: {
    id: `edge_${i}`,
    source: e.source,
    target: e.target,
    // Fix: Explicitly cast relationType to the correct union type
    relationType: e.relationType as EdgeData['relationType'],
    temporal: e.temporal,
    // Fix: Access certainty from the 'e' object
    certainty: e.certainty as EdgeData['certainty'],
    sources: e.sources,
    sign: 'positive' // Default sign for initial edges
    // TODO: Map legacy 'label'/'dates'/'validFrom'/'validTo' if present in DATA
  }
}));

export const INITIAL_GRAPH: KnowledgeGraph = {
  nodes: mappedNodes,
  edges: mappedEdges,
  meta: { version: "1.3" }
};

export const COLORS = {
  person: '#e5e5c0',      // Parchment
  organization: '#991b1b', // Crimson
  event: '#b45309',       // Brass
  publication: '#1e3a25', // Forest
  concept: '#57534e',     // Stone
  document: '#9ca3af',    // Grey
  location: '#65a30d',    // Lime Green
};

// Tier-4 Palette: Conspiratorial Grades
export const COMMUNITY_COLORS = [
  '#b45309', // Brass
  '#991b1b', // Crimson
  '#1e3a25', // Forest
  '#3f3f46', // Zinc
  '#78350f', // Amber-900
  '#064e3b', // Emerald-900',
];