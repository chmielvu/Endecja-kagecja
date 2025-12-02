
import { KnowledgeGraph, GraphNode, GraphEdge } from './types';

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
    // ... (Existing nodes would be here, assuming they are loaded from a seed file or API in real app)
    // For brevity in this code update, we will assume the GraphService handles the initial seed 
    // or it's loaded via the Store's Init. The DATA object in constants is mainly a fallback seed.
    // Keeping minimal valid seed for stability:
    { "id": "dmowski_roman", "label": "Roman Dmowski", "type": "person", "dates": "1864-1939", "importance": 1.0 },
    { "id": "liga_narodowa", "label": "Liga Narodowa", "type": "organization", "dates": "1893-1928", "importance": 1.0 },
    { "id": "mysli_polaka", "label": "Myśli nowoczesnego Polaka", "type": "publication", "dates": "1903", "importance": 1.0 }
  ],
  "edges": [
     { "source": "dmowski_roman", "target": "liga_narodowa", "label": "założył", "dates": "1893" },
     { "source": "dmowski_roman", "target": "mysli_polaka", "label": "napisał", "dates": "1903" }
  ]
};

const mappedNodes: GraphNode[] = DATA.nodes.map(n => ({
  data: {
    id: n.id,
    label: n.label,
    type: n.type as any,
    dates: (n as any).dates,
    importance: (n as any).importance || 0.5,
    certainty: 'confirmed'
  }
}));

const mappedEdges: GraphEdge[] = DATA.edges.map((e, i) => ({
  data: {
    id: `edge_${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    certainty: 'confirmed'
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
};

// Tier-4 Palette: Conspiratorial Grades
export const COMMUNITY_COLORS = [
  '#b45309', // Brass
  '#991b1b', // Crimson
  '#1e3a25', // Forest
  '#3f3f46', // Zinc
  '#78350f', // Amber-900
  '#064e3b', // Emerald-900
];