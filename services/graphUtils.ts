
import Graph from 'graphology';
import { KnowledgeGraph } from '../types';

export function buildGraphologyGraph(kg: KnowledgeGraph): Graph {
  const g = new Graph();
  kg.nodes.forEach(n => { if (!g.hasNode(n.data.id)) g.addNode(n.data.id, { ...n.data }); });
  kg.edges.forEach(e => { if (g.hasNode(e.data.source) && g.hasNode(e.data.target)) g.addEdge(e.data.source, e.data.target, { ...e.data }); });
  return g;
}
