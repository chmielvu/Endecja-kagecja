
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { KnowledgeGraph, GraphRAGIndex, CommunitySummary, NodeData } from '../types';
import { generateCommunityInsight } from './geminiService';
import { buildGraphologyGraph } from './graphUtils';

/**
 * GraphRAG Index Builder
 * Detects communities at multiple resolutions and generates Gemini summaries.
 */
export async function buildGraphRAGIndex(graph: KnowledgeGraph): Promise<GraphRAGIndex> {
  if (graph.nodes.length === 0) return { hierarchies: {}, summaries: [] };

  const g = buildGraphologyGraph(graph);
  // Resolutions for GraphRAG hierarchy:
  // 0.8 = Coarse (Thematic macro-groups)
  // 1.2 = Granular (Specific factions/cells)
  const levels = [0.8, 1.2];
  
  const hierarchies: Record<number, Record<string, number>> = {};
  const summaries: CommunitySummary[] = [];

  for (let lvlIdx = 0; lvlIdx < levels.length; lvlIdx++) {
    const resolution = levels[lvlIdx];
    let communities: Record<string, number> = {};
    
    // 1. Detect Communities at this resolution
    try {
       // Check if installed library supports resolution param
       if (louvain && (louvain as any).detailed) {
         // @ts-ignore
         const res = (louvain as any).detailed(g, { resolution });
         communities = res.communities;
       }
    } catch (e) {
       console.warn(`Louvain failed at resolution ${resolution}`, e);
       continue;
    }
    
    hierarchies[lvlIdx] = communities;

    // 2. Group nodes by community ID
    const commMap = new Map<number, string[]>();
    Object.entries(communities).forEach(([nId, cId]) => {
      if(!commMap.has(cId)) commMap.set(cId, []);
      commMap.get(cId)?.push(nId);
    });

    // 3. Process largest communities to generate summaries
    const sortedComms = Array.from(commMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    for (const [cId, nIds] of sortedComms) {
       if (nIds.length < 3) continue;

       const commNodes = graph.nodes.filter(n => nIds.includes(n.data.id)).map(n => n.data);
       const commEdges = graph.edges.filter(e => nIds.includes(e.data.source) && nIds.includes(e.data.target)).map(e => e.data);

       const summaryText = await generateCommunityInsight(commNodes, commEdges);
       
       const years = commNodes.map(n => n.year).filter(y => y !== undefined) as number[];
       const timespan = years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : 'Unknown';
       
       const regions = commNodes.map(n => n.region).filter(r => r && r !== 'Unknown');
       const regionCounts: Record<string, number> = {};
       regions.forEach(r => regionCounts[r!] = (regionCounts[r!] || 0) + 1);
       const dominantRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';

       summaries.push({
         id: `L${lvlIdx}-C${cId}`,
         level: lvlIdx,
         communityId: cId,
         summary: summaryText,
         entities: nIds,
         timespan,
         region: dominantRegion
       });
    }
  }

  return { hierarchies, summaries };
}
