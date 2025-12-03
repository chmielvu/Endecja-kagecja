
import { KnowledgeGraph, RegionalAnalysisResult, DuplicateCandidate, NodeData } from '../types';
import { getEmbeddingsBatch, cosineSimilarity } from './embeddingService';

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Detects duplicates using simple string similarity (Levenshtein).
 * Optimized with type grouping to avoid O(N^2) comparisons.
 */
export function detectDuplicates(graph: KnowledgeGraph, threshold: number = 0.85): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];
  const nodes = graph.nodes;
  
  // Group by type to reduce comparison space
  const nodesByType: Record<string, NodeData[]> = {};
  nodes.forEach(n => {
    if (!nodesByType[n.data.type]) nodesByType[n.data.type] = [];
    nodesByType[n.data.type].push(n.data);
  });

  Object.values(nodesByType).forEach(group => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const n1 = group[i];
        const n2 = group[j];
        
        const label1 = n1.label.toLowerCase();
        const label2 = n2.label.toLowerCase();
        
        const longer = label1.length > label2.length ? label1 : label2;
        if (longer.length === 0) continue;

        const dist = getLevenshteinDistance(label1, label2);
        const sim = (longer.length - dist) / longer.length;
        
        if (sim >= threshold) {
          candidates.push({ 
            nodeA: n1, 
            nodeB: n2, 
            similarity: sim, 
            reason: `String similarity: ${(sim*100).toFixed(0)}%` 
          });
        }
      }
    }
  });

  return candidates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Detects duplicates using Semantic Embeddings (Vector Similarity).
 */
export async function detectDuplicatesSemantic(graph: KnowledgeGraph, threshold: number = 0.88): Promise<DuplicateCandidate[]> {
  const candidates: DuplicateCandidate[] = [];
  const nodes = graph.nodes;
  // Limit to top 150 important nodes to prevent rate limiting in demo
  const nodesToCheck = nodes.sort((a,b) => (b.data.importance || 0) - (a.data.importance || 0)).slice(0, 150); 
  
  const textsToCheck = nodesToCheck.map(n => `${n.data.label}: ${n.data.description || ''}`);
  const embeddings = await getEmbeddingsBatch(textsToCheck);

  const nodeEmbeddings: Record<string, number[]> = {};
  nodesToCheck.forEach((node, i) => {
    nodeEmbeddings[node.data.id] = embeddings[i];
  });

  for (let i = 0; i < nodesToCheck.length; i++) {
    for (let j = i + 1; j < nodesToCheck.length; j++) {
      const n1 = nodesToCheck[i].data;
      const n2 = nodesToCheck[j].data;
      
      if (n1.type !== n2.type) continue;
      if (n1.id === n2.id) continue;

      const vec1 = nodeEmbeddings[n1.id];
      const vec2 = nodeEmbeddings[n2.id];
      
      if (vec1 && vec2 && vec1.length && vec2.length) {
        const sim = cosineSimilarity(vec1, vec2);
        if (sim >= threshold) {
          candidates.push({
            nodeA: n1,
            nodeB: n2,
            similarity: sim,
            reason: `Semantic match: ${(sim * 100).toFixed(1)}%`
          });
        }
      }
    }
  });
  return candidates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculates isolation index and bridges for Regional Analysis.
 * Optimized with Maps for O(1) lookups.
 */
export function calculateRegionalMetrics(graph: KnowledgeGraph): RegionalAnalysisResult {
  const nodes = graph.nodes;
  const edges = graph.edges;
  
  // Fast Lookup Map
  const nodeMap = new Map<string, NodeData>();
  nodes.forEach(n => nodeMap.set(n.data.id, n.data));

  let sameRegionEdges = 0;
  let totalValidEdges = 0;

  edges.forEach(e => {
    const src = nodeMap.get(e.data.source);
    const tgt = nodeMap.get(e.data.target);
    
    // Fix: Access region.id for comparison and check for existence
    if (src?.region?.id && tgt?.region?.id && src.region.id !== 'unknown' && tgt.region.id !== 'unknown') {
      totalValidEdges++;
      if (src.region.id === tgt.region.id) sameRegionEdges++;
    }
  });

  const isolationIndex = totalValidEdges > 0 ? (sameRegionEdges / totalValidEdges) : 0;
  const bridgeScores: Record<string, number> = {};
  
  nodes.forEach(n => {
    const data = n.data;
    // Fix: Access region.id for comparison and check for existence
    if (!data.region?.id || data.region.id === 'unknown') return;

    const neighbors = edges
      .filter(e => e.data.source === data.id || e.data.target === data.id)
      .map(e => e.data.source === data.id ? e.data.target : e.data.source);

    let differentRegionCount = 0;
    neighbors.forEach(nid => {
      const neighbor = nodeMap.get(nid);
      // Fix: Access region.id for comparison and check for existence
      if (neighbor?.region?.id && neighbor.region.id !== 'unknown' && neighbor.region.id !== data.region?.id) {
        differentRegionCount++;
      }
    });
    
    if (differentRegionCount > 0) {
        bridgeScores[data.id] = differentRegionCount * (data.importance || 1);
    }
  });

  const sortedBridges = Object.entries(bridgeScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, score]) => ({
      id,
      label: nodeMap.get(id)?.label || id,
      score
    }));

  // Calculate dominant region
  const regionCounts: Record<string, number> = {};
  nodes.forEach(n => {
      // Fix: Access region.id for comparison and check for existence
      if(n.data.region?.id && n.data.region.id !== 'unknown') {
          regionCounts[n.data.region.id] = (regionCounts[n.data.region.id] || 0) + 1;
      }
  });
  
  const dominantRegion = Object.entries(regionCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  return {
    isolationIndex,
    bridges: sortedBridges,
    dominantRegion
  };
}
