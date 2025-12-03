

import cytoscape from 'cytoscape';
import louvain from 'graphology-communities-louvain';
import { KnowledgeGraph, NodeData, EdgeData, TemporalFactType, GraphEdge } from '../types'; // Fix: Import GraphEdge
import { buildGraphologyGraph } from './graphUtils';

// Helper to extract a single year from TemporalFactType for filtering
function getYearFromTemporalFact(temporal?: TemporalFactType): number | undefined {
  if (!temporal) return undefined;
  if (temporal.type === 'instant') return parseInt(temporal.timestamp);
  if (temporal.type === 'interval') return parseInt(temporal.start);
  return undefined;
}

// --- Worker Message Handler ---
self.onmessage = (e: MessageEvent) => {
  const { graph } = e.data;
  if (!graph) return;

  try {
    const enriched = enrichGraphWithMetrics(graph);
    self.postMessage({ type: 'SUCCESS', graph: enriched });
  } catch (error: any) {
    console.error("Worker Calculation Failed:", error);
    // Return original graph to avoid app crash, but with minimal meta update
    self.postMessage({ type: 'SUCCESS', graph: { ...graph, meta: { ...graph.meta, lastSaved: Date.now() } } });
  }
};

/**
 * Calculates robust graph metrics using a headless Cytoscape instance.
 * TODO: This function needs to be updated to accept a 'timelineYear' parameter
 * and filter nodes/edges for the temporal subgraph before calculating metrics.
 */
function enrichGraphWithMetrics(graph: KnowledgeGraph): KnowledgeGraph {
  const safeEdges = graph.edges || [];
  
  if (graph.nodes.length === 0) {
     return { ...graph, meta: { ...graph.meta, modularity: 0, globalBalance: 1 } };
  }
  
  const cy = cytoscape({
    headless: true,
    elements: {
      nodes: graph.nodes.map(n => ({ data: { ...n.data } })),
      edges: safeEdges.map(e => ({ data: { ...e.data } }))
    }
  });

  // 1. Calculate Centralities
  let pr: any, bc: any, dcn: any, cc: any;
  try {
     pr = cy.elements().pageRank({ dampingFactor: 0.85, precision: 0.000001 });
     // Only calculate betweenness for smaller graphs to avoid performance bottlenecks
     // Fix: Removed 'root' option as it's not valid for betweennessCentrality
     bc = cy.elements().betweennessCentrality({ directed: true }); 
     dcn = cy.elements().degreeCentralityNormalized({ directed: true, weight: () => 1 } as any);
     cc = cy.elements().closenessCentralityNormalized({ directed: true });
  } catch (e) {
      console.warn("Worker: Centrality calculation failed", e);
      pr = { rank: () => 0.01 };
      bc = { betweenness: () => 0 };
      dcn = { degree: () => 0 };
      cc = { closeness: () => 0 };
  }
  
  // 2. Local Clustering Coefficient
  let clusteringMap: Record<string, number> = {};
  try {
     clusteringMap = calculateClusteringCoefficient(cy);
  } catch(e) {
     console.warn("Worker: Clustering failed", e);
  }

  // 3. Community Detection (Louvain)
  let comm: Record<string, number> = {};
  let modularity = 0;
  let numCommunities = 0;
  let largestCommunitySize = 0;
  
  try {
      const graphologyGraph = buildGraphologyGraph(graph);
      // Only run Louvain if graph has edges to avoid division by zero or empty errors
      if (graphologyGraph.order > 0 && graphologyGraph.size > 0) {
        // Safe check for library availability
        if (louvain && typeof (louvain as any).detailed === 'function') {
           const louvainDetails = (louvain as any).detailed(graphologyGraph);
           comm = louvainDetails.communities;
           modularity = louvainDetails.modularity;
           
           const communitySizes = new Map<number, number>();
           Object.values(comm).forEach(cId => {
             communitySizes.set(cId, (communitySizes.get(cId) || 0) + 1);
           });
           numCommunities = communitySizes.size;
           largestCommunitySize = Math.max(...Array.from(communitySizes.values()), 0);

        }
      }
  } catch (e) {
      console.warn("Worker: Louvain detection failed:", e);
  }

  // 4. Edge Metrics & Balance
  const processedEdges = processEdgeMetrics(safeEdges);
  const globalBalance = calculateTriadicBalance({ nodes: graph.nodes, edges: processedEdges });

  const pageRankMap = new Map<string, number>();

  // 5. Enrich Nodes with Metrics
  const newNodes = graph.nodes.map(node => {
    try {
        const ele = cy.getElementById(node.data.id);
        if (ele.length === 0) return node;

        const degree = (dcn as any).degree ? (dcn as any).degree(ele) : 0;
        const pagerankVal = pr && pr.rank ? parseFloat(pr.rank(ele).toFixed(6)) : 0.01;
        const betweennessVal = bc && bc.betweenness ? bc.betweenness(ele) : 0;
        const closenessVal = cc && cc.closeness ? cc.closeness(ele) : 0;
        const clusteringVal = clusteringMap[node.data.id] || 0;
        
        pageRankMap.set(node.data.id, pagerankVal);

        // Prefer existing community if Louvain didn't run for this node
        const communityId = comm[node.data.id] !== undefined ? comm[node.data.id] : (node.data.louvainCommunity || 0);

        // Security Analytics
        const safety = 1 - (betweennessVal > 0 ? (betweennessVal / (cy.nodes().length * cy.nodes().length)) : 0); // Normalized safety
        const efficiency = closenessVal;
        const balance = (safety + efficiency) > 0 ? (2 * safety * efficiency) / (safety + efficiency) : 0;

        let risk = 0;
        const vulnerabilities: string[] = [];
        
        if (betweennessVal > 0.1) {
            vulnerabilities.push('Critical information broker');
            risk += 0.3;
        }

        const edges = processedEdges.filter(e => e.data.source === node.data.id || e.data.target === node.data.id);
        const crossRegional = edges.filter(e => {
            const source = graph.nodes.find(n => n.data.id === e.data.source);
            const target = graph.nodes.find(n => n.data.id === e.data.target);
            // Fix: Update region access to structured RegionInfo
            return source?.data.region?.id && target?.data.region?.id && source.data.region.id !== target.data.region.id;
        }).length;
        
        if (crossRegional > 3) {
            vulnerabilities.push('High cross-regional exposure');
            risk += 0.2;
        }

        return {
          ...node,
          data: {
            ...node.data,
            degreeCentrality: parseFloat(degree.toFixed(6)),
            pagerank: pagerankVal,
            betweenness: parseFloat(betweennessVal.toFixed(6)),
            closeness: parseFloat(closenessVal.toFixed(6)),
            clustering: parseFloat(clusteringVal.toFixed(6)), 
            eigenvector: pagerankVal,
            community: communityId, // Legacy
            louvainCommunity: communityId,
            kCore: Math.floor(degree * 10),
            
            security: {
                efficiency: parseFloat(efficiency.toFixed(4)),
                safety: parseFloat(safety.toFixed(4)),
                balance: parseFloat(balance.toFixed(4)),
                risk: Math.min(risk, 1.0),
                vulnerabilities
            }
          }
        };
    } catch (e) {
        return node;
    }
  });

  // 6. Calculate Edge Weights based on PageRank importance
  const weightedEdges = processedEdges.map(edge => {
    const prSource = pageRankMap.get(edge.data.source) || 0;
    const prTarget = pageRankMap.get(edge.data.target) || 0;
    const weight = (prSource + prTarget) / 2;

    return {
      ...edge,
      data: {
        ...edge.data,
        weight: parseFloat(weight.toFixed(6))
      }
    };
  });

  // Calculate global metrics for meta
  const numConnectedComponents = cy.elements().components().length;
  const isConnected = numConnectedComponents === 1 && cy.nodes().length > 0;
  
  return {
    nodes: newNodes,
    edges: weightedEdges,
    meta: {
      ...graph.meta,
      modularity: parseFloat(modularity.toFixed(3)), // Legacy
      globalBalance,
      globalMetrics: { // New structured global metrics
        // Fix: Use cy.nodes().length and cy.edges().length
        density: cy.nodes().length > 1 ? (cy.edges().length * 2) / (cy.nodes().length * (cy.nodes().length - 1)) : 0,
        transitivity: clusteringMap ? Object.values(clusteringMap).reduce((sum, val) => sum + val, 0) / cy.nodes().length : 0,
        is_connected: isConnected,
        number_connected_components: numConnectedComponents
      },
      communityStructure: { // New structured community metrics
        modularity: parseFloat(modularity.toFixed(3)),
        num_communities: numCommunities,
        largest_community_size: largestCommunitySize
      }
    }
  };
}

function calculateClusteringCoefficient(cy: cytoscape.Core): Record<string, number> {
  const coefficients: Record<string, number> = {};
  cy.nodes().forEach(node => {
    try {
        const neighbors = node.neighborhood().nodes();
        const k = neighbors.length;
        if (k < 2) { coefficients[node.id()] = 0; return; }
        
        let links = 0;
        const neighborArray = neighbors.toArray();
        for (let i = 0; i < k; i++) {
          for (let j = i + 1; j < k; j++) {
            const n1 = neighborArray[i];
            const n2 = neighborArray[j];
            if (n1 && n2 && n1.edgesWith(n2).length > 0) links++;
          }
        }
        coefficients[node.id()] = (2 * links) / (k * (k - 1));
    } catch (e) { coefficients[node.id()] = 0; }
  });
  return coefficients;
}

function processEdgeMetrics(edges: GraphEdge[]): GraphEdge[] { // Updated type to GraphEdge[]
  const negativeKeywords = ['conflict', 'rival', 'anti', 'against', 'enemy', 'opponent', 'fight', 'konflikt', 'rywal', 'przeciw', 'wro', 'oppos'];
  return edges.map(edge => {
    const text = (edge.data.label || edge.data.relationType || '').toLowerCase(); // Use relationType for sentiment analysis
    const isNegative = negativeKeywords.some(kw => text.includes(kw));
    return {
      ...edge,
      data: {
        ...edge.data,
        sign: edge.data.sign || (isNegative ? 'negative' : 'positive'),
        certainty: edge.data.certainty || 'confirmed'
      }
    };
  });
}

function calculateTriadicBalance(graph: { nodes: any[], edges: GraphEdge[] }): number { // Updated type to GraphEdge[]
  const edges = graph.edges;
  // Use Maps for O(1) adjacency lookup
  const adj: Map<string, Map<string, number>> = new Map();
  
  edges.forEach(e => {
    if (!adj.has(e.data.source)) adj.set(e.data.source, new Map());
    if (!adj.has(e.data.target)) adj.set(e.data.target, new Map());
    
    const val = e.data.sign === 'negative' ? -1 : 1;
    adj.get(e.data.source)!.set(e.data.target, val);
    adj.get(e.data.target)!.set(e.data.source, val); 
  });

  let totalTriangles = 0;
  let balancedTriangles = 0;
  const nodeIds = graph.nodes.map(n => n.data.id);
  const limit = Math.min(nodeIds.length, 100); // Strict limit for worker perf

  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      for (let k = j + 1; k < limit; k++) {
        const u = nodeIds[i];
        const v = nodeIds[j];
        const w = nodeIds[k];
        
        const uv = adj.get(u)?.get(v);
        const vw = adj.get(v)?.get(w);
        const wu = adj.get(w)?.get(u);
        
        if (uv !== undefined && vw !== undefined && wu !== undefined) {
          totalTriangles++;
          if (uv * vw * wu > 0) balancedTriangles++;
        }
      }
    }
  }
  return totalTriangles > 0 ? balancedTriangles / totalTriangles : 1;
}