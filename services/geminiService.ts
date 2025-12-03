

import { GoogleGenAI } from "@google/genai";
import { 
  ChatMessage, 
  KnowledgeGraph, 
  NodeData, 
  PythonAnalysisResult, 
  GraphPatch, 
  TemporalFactType, 
  SourceCitation,
  RegionInfo,
  EdgeData
} from "../types";
import { getEmbedding, cosineSimilarity } from './embeddingService';

const API_KEY = process.env.API_KEY || '';
const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

// --- Helper to parse temporal strings ---
// Exported to be used in store.ts
export function parseTemporalFact(dateString?: string, yearNum?: number): TemporalFactType | undefined {
  if (dateString) {
    const intervalMatch = dateString.match(/^(\d{4})-(\d{4})$/);
    if (intervalMatch) {
      return { type: 'interval', start: intervalMatch[1], end: intervalMatch[2] };
    }
    const yearMatch = dateString.match(/^\d{4}$/);
    if (yearMatch) {
      return { type: 'instant', timestamp: dateString };
    }
    // Fallback for more complex strings
    return { type: 'fuzzy', approximate: dateString };
  }
  if (yearNum) {
    return { type: 'instant', timestamp: String(yearNum) };
  }
  return undefined;
}

// --- Smart Context Helper ---
async function getSmartContext(
  graph: KnowledgeGraph, 
  focusNode?: NodeData, 
  limit: number = 150,
  query?: string
): Promise<string> {
  const nodes = graph.nodes;
  const selectedNodes = new Set<string>();
  const contextList: string[] = [];

  if (query) {
      try {
          const queryEmb = await getEmbedding(query);
          if (queryEmb.length > 0) {
              const scoredNodes = [];
              for (const n of nodes) {
                  const text = `${n.data.label} ${n.data.description || ''}`;
                  const emb = await getEmbedding(text);
                  if (emb.length > 0) {
                      const score = cosineSimilarity(queryEmb, emb);
                      scoredNodes.push({ node: n, score });
                  }
              }
              scoredNodes.sort((a, b) => b.score - a.score)
                         .slice(0, Math.floor(limit / 2))
                         .forEach(item => {
                             if (!selectedNodes.has(item.node.data.id)) {
                                 selectedNodes.add(item.node.data.id);
                                 contextList.push(`${item.node.data.label} (${item.node.data.type})`);
                             }
                         });
          }
      } catch (e) {
          console.warn("Vector search failed", e);
      }
  }

  if (focusNode) {
    if (!selectedNodes.has(focusNode.id)) {
        selectedNodes.add(focusNode.id);
        contextList.push(`${focusNode.label} (${focusNode.type}) [FOCUS]`);
    }
    const neighbors = graph.edges
      .filter(e => e.data.source === focusNode.id || e.data.target === focusNode.id)
      .map(e => e.data.source === focusNode.id ? e.data.target : e.data.source);
      
    neighbors.forEach(nid => {
      if (!selectedNodes.has(nid) && selectedNodes.size < limit) {
        const n = nodes.find(node => node.data.id === nid);
        if (n) {
          selectedNodes.add(nid);
          contextList.push(`${n.data.label} (${n.data.type})`);
        }
      }
    });
  }

  const sortedByImportance = [...nodes].sort((a, b) => (b.data.pagerank || 0) - (a.data.pagerank || 0));
  for (const n of sortedByImportance) {
    if (selectedNodes.size >= limit) break;
    if (!selectedNodes.has(n.data.id)) {
      selectedNodes.add(n.data.id);
      contextList.push(`${n.data.label} (${n.data.type})`);
    }
  }

  return contextList.join(', ');
}

// --- Dmowski Persona (1934 Version for this Vibe) ---
const DMOWSKI_SYSTEM_INSTRUCTION = `
Jesteś Romanem Dmowskim w roku 1934. Znajdujesz się w Chludowie. Twoja mowa jest stanowcza, archaiczna, pełna troski o los Narodu.
Analizujesz zagrożenia ze strony Niemiec i Rosji. Oceniasz sytuację przez pryzmat interesu narodowego.
`;

function cleanAndParseJSON(text: string): any {
  if (!text) return {};
  let clean = text.replace(/^```json\s*/gm, '')
                  .replace(/^```\s*/gm, '')
                  .replace(/\s*```$/gm, '')
                  .trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Failed to parse JSON:", clean, e); // Log for debugging
    return {}; 
  }
}

export async function chatWithAgent(
  history: ChatMessage[], 
  userMessage: string,
  graphContext: KnowledgeGraph
): Promise<{ text: string, reasoning: string, sources?: SourceCitation[] }> { // Updated sources type
    if (!API_KEY) throw new Error("API Key missing");
    const ai = getAiClient();
    try {
      const formattedHistory = history
        .filter(h => h.role !== 'system')
        .map(h => ({ 
           role: h.role === 'assistant' ? 'model' : 'user', 
           parts: [{ text: h.content }] 
        }));
      const chat = ai.chats.create({
         model: 'gemini-3-pro-preview',
         config: {
            systemInstruction: DMOWSKI_SYSTEM_INSTRUCTION,
            temperature: 0.7,
         },
         history: formattedHistory
      });
      const result = await chat.sendMessage({ message: userMessage });
      return { 
        text: result.text || "...", 
        reasoning: "Analiza geopolityczna...", 
        sources: [] 
      };
    } catch (e: any) {
      return { text: `Błąd: ${e.message}`, reasoning: "" };
    }
}

/**
 * INGESTION PIPELINE: Analyze Documents (PDF/Images)
 * Agile Graph Architect: This function leverages Gemini's multimodal vision
 * to extract entities and relationships from unstructured historical documents.
 * It's crucial for populating the graph from primary sources.
 */
export async function analyzeDocument(
  file: File,
  currentGraph: KnowledgeGraph
): Promise<GraphPatch> { // Updated return type to GraphPatch
  const ai = getAiClient();
  
  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const mimeType = file.type;
  
  const prompt = `
    You are an Intelligence Officer analyzing a captured archival document from the Endecja era (1893-1939).
    
    TASK:
    1. Extract all key entities (People, Organizations, Events, Publications, Concepts, Locations, Documents related to the file itself) and relationships.
    2. Focus on the Endecja movement context and Polish history.
    3. For each extracted entity, determine its 'validity' (temporal existence) as an 'instant' (e.g., "1934") or 'interval' (e.g., "1918-1939") or 'fuzzy'.
    4. For each relationship, determine its 'temporal' context.
    5. Provide specific 'sources' as a structured array for *each* node and edge, referencing the document.
    6. For node 'region', if location is clear, provide structured RegionInfo.
    
    SCHEMA for Nodes:
    - id: "slug_name"
    - label: "Full Name"
    - type: "person|organization|event|concept|publication|location|document"
    - description: "Brief context"
    - validity: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - region?: { id: "slug", label: "Region Name", type: "city|province|country" }
    - sources: [{ uri: "${file.name}", label: "Document Scan", type: "archival" }]
    
    SCHEMA for Edges:
    - source: "source_id"
    - target: "target_id"
    - relationType: "founded|member_of|led|published|influenced|opposed|collaborated_with|participated_in|authored|organized|related_to|supported|criticized"
    - temporal: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - sources: [{ uri: "${file.name}", label: "Document Scan", type: "archival" }]
    
    RETURN ONLY A JSON OBJECT.
    {
      "thoughtSignature": "Brief analysis of the document's significance and key takeaways.",
      "nodes": [ { id: string, label: string, type: string, description?: string, validity?: TemporalFactType, region?: RegionInfo, sources?: SourceCitation[] } ],
      "edges": [ { source: string, target: string, relationType: string, temporal?: TemporalFactType, sources?: SourceCitation[] } ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
        ],
        config: {
            thinkingConfig: { thinkingLevel: 'high' } as any,
        }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
        type: 'document_ingestion', // Changed type
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        reasoning: parsed.thoughtSignature || "Document analysis complete."
    };
  } catch (e) {
      console.error("Ingestion failed:", e);
      throw e;
  }
}

/**
 * Agentic Graph Expansion.
 * Agile Graph Architect: Expands the graph by searching for new entities and relationships
 * based on a user query, ensuring historical context and source attribution.
 */
export async function generateGraphExpansion(
  currentGraph: KnowledgeGraph, 
  query: string
): Promise<GraphPatch> { // Updated return type to GraphPatch
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, undefined, 120, query);

  const prompt = `
    You are a Historical Intelligence Agent, specializing in the Endecja movement (1893-1939).
    Expand the knowledge graph based on the query: "${query}".
    
    Current Graph Context: ${contextString}
    
    TASK:
    1. Identify new entities (person, organization, event, concept, publication, location) and their key relationships.
    2. For each extracted entity, determine its 'validity' (temporal existence) as an 'instant' (e.g., "1934") or 'interval' (e.g., "1918-1939") or 'fuzzy'.
    3. For each relationship, determine its 'temporal' context.
    4. Provide specific 'sources' as a structured array for *each* node and edge.
    5. For node 'region', provide structured RegionInfo if location is clear.
    6. Prioritize historically relevant information directly related to the Endecja movement.
    
    TOOLS: Use Google Search to verify dates, names, relationships, and sources.
    
    RETURN ONLY A JSON OBJECT.
    SCHEMA for Nodes:
    - id: "slug_name"
    - label: "Full Name"
    - type: "person|organization|event|concept|publication|location"
    - description: "Short description with historical context."
    - validity: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - region?: { id: "slug", label: "Region Name", type: "city|province|country" }
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    SCHEMA for Edges:
    - source: "source_id"
    - target: "target_id"
    - relationType: "founded|member_of|led|published|influenced|opposed|collaborated_with|participated_in|authored|organized|related_to|supported|criticized"
    - temporal: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    {
      "thoughtSignature": "Brief reasoning for the expansion, citing key findings.",
      "nodes": [ { id: string, label: string, type: string, description?: string, validity?: TemporalFactType, region?: RegionInfo, sources?: SourceCitation[] } ],
      "edges": [ { source: string, target: string, relationType: string, temporal?: TemporalFactType, sources?: SourceCitation[] } ]
    }
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingLevel: 'high' } as any,
          tools: [{ googleSearch: {} }],
        }
    });
    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
        type: 'expansion',
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        reasoning: parsed.thoughtSignature || "Expansion complete."
    };
  } catch (e) {
    console.error("Graph expansion failed:", e);
    throw new Error("Intelligence Expansion Failed: " + (e as any).message);
  }
}

/**
 * Agentic Node Deepening.
 * Agile Graph Architect: Conducts deep research on a specific node, enriching its
 * properties and discovering new relationships with full source attribution.
 */
export async function generateNodeDeepening(
  node: NodeData,
  currentGraph: KnowledgeGraph
): Promise<GraphPatch> { // Updated return type to GraphPatch
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, node, 100);

  const prompt = `
    You are a Historical Intelligence Agent, specializing in the Endecja movement.
    Conduct deep research on the entity: "${node.label}" (ID: ${node.id}, Type: ${node.type}).
    
    Current Graph Context (related entities): ${contextString}
    
    TASK:
    1. Enrich the node's existing properties (description, validity, region) with more detail and precision.
    2. If the node is a 'person' or 'organization', discover specific 'existence' (e.g., dates of formation/dissolution) or 'roles' (for persons).
    3. Discover specific, sourced new relationships (edges) involving this node.
    4. Ensure all new information (properties, existence/roles, edges) is historically accurate and attributed to structured 'sources'.
    
    TOOLS: Use Google Search to find detailed historical information.
    
    OUTPUT SCHEMA for updatedProperties:
    - description: "More detailed biography/context."
    - validity?: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - region?: { id: "slug", label: "Region Name", type: "city|province|country" }
    - existence?: Array<{ start: string; end?: string; status: string; context?: string; }> (for orgs)
    - roles?: Array<{ role: string; organization?: string; start: string; end?: string; context?: string; }> (for persons)
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    OUTPUT SCHEMA for newEdges:
    - source: "${node.id}" (or other ID if the deepened node is the target)
    - target: "slug_of_related_entity"
    - relationType: "founded|member_of|led|published|influenced|opposed|collaborated_with|participated_in|authored|organized|related_to|supported|criticized"
    - temporal: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    RETURN ONLY A JSON OBJECT.
    {
      "thoughtSignature": "Concise summary of research findings for ${node.label}.",
      "updatedProperties": { /* properties as per schema above */ },
      "newEdges": [ /* edges as per schema above */ ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingLevel: 'high' } as any,
        tools: [{ googleSearch: {} }],
      }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
      type: 'deepening',
      nodes: parsed.updatedProperties ? [{ id: node.id, ...parsed.updatedProperties }] : [],
      edges: parsed.newEdges || [],
      reasoning: parsed.thoughtSignature || "Research complete."
    };
  } catch (e) {
    console.error("Node deepening failed:", e);
    throw new Error("Intelligence Deepening Failed: " + (e as any).message);
  }
}

export async function generateCommunityInsight(nodes: NodeData[], edges: EdgeData[]): Promise<string> { // Updated EdgeData type
    const ai = getAiClient();
    const prompt = `Summarize this community: ${nodes.map(n=>n.label).join(', ')}.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "";
}

/**
 * 🚀 NEW: Python-Powered Graph Analysis
 * Simulates a Python environment to run NetworkX algorithms on the current graph state.
 * Uses Gemini's codeExecution tool.
 */
export async function runDeepAnalysis(graph: KnowledgeGraph): Promise<PythonAnalysisResult> {
  const ai = getAiClient();
  
  // 1. Sanitize Graph for Python (Minimal payload to save tokens)
  const pyGraph = {
    nodes: graph.nodes.map(n => ({ 
      id: n.data.id, 
      label: n.data.label, 
      type: n.data.type,
      // Pass primary year for temporal filtering within Python
      year: (n.data.validity?.type === 'instant' || n.data.validity?.type === 'interval') 
              ? parseInt(n.data.validity.type === 'instant' ? n.data.validity.timestamp : n.data.validity.start) 
              : undefined
    })),
    edges: graph.edges.map(e => ({ 
      source: e.data.source, 
      target: e.data.target,
      // Pass sign and temporal info for temporal/signed graph analysis in Python
      sign: e.data.sign === 'negative' ? -1 : 1,
      year: (e.data.temporal?.type === 'instant' || e.data.temporal?.type === 'interval') 
              ? parseInt(e.data.temporal.type === 'instant' ? e.data.temporal.timestamp : e.data.temporal.start) 
              : undefined
    }))
  };

  const prompt = `
    You are the "Graph Intelligence Officer" for the Endecja Movement.
    
    TASK: Perform a deep structural analysis of this network using Python and NetworkX.
    
    DATA (JSON):
    ${JSON.stringify(pyGraph)}

    PYTHON SCRIPT REQUIREMENTS:
    1. Load data into a NetworkX DiGraph or Graph, considering edge 'sign' for signed networks if applicable.
    2. Compute the following metrics:
       - Density.
       - Transitivity (global clustering coefficient).
       - Check if the graph is connected (weakly connected for directed graphs) and count weakly connected components.
       - PageRank (find top 5 influencers by ID and label).
       - Betweenness Centrality (find top 3 influencers by ID and label, if graph size <= 500 to avoid performance issues).
       - Louvain Communities (using \`python-louvain\` or NetworkX's community algorithms).
       - Largest community size.
    3. The final output MUST be a JSON string with the results.
    
    After the code, provide a "Strategic Commentary" as Roman Dmowski (1934), interpreting these stats. 
    Is the movement fragmented (many components)? Who controls the flow of information (high betweenness/pagerank)? How cohesive are the factions (modularity)?
    
    RETURN JSON SCHEMA (ENSURE IT IS VALID JSON):
    {
      "global_metrics": { "density": float, "transitivity": float, "is_connected": boolean, "number_connected_components": int },
      "community_structure": { "modularity": float, "num_communities": int, "largest_community_size": int },
      "key_influencers": [ {"id": str, "label": str, "score": float, "metric": "pagerank" | "betweenness"} ],
      "strategic_commentary": "String"
    }
    
    Only output the Python script and then the JSON output, followed by the strategic commentary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use the smart model for code gen
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ codeExecution: {} }], // Enable Python Sandbox
      }
    });

    const text = response.text || "{}";
    
    // Extract JSON from potential markdown blocks, prioritizing the schema output
    let jsonStr = text;
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    } else {
      // Fallback if not wrapped in markdown
      const directJsonMatch = text.match(/\{[\s\S]*"global_metrics"[\s\S]*\}/);
      if (directJsonMatch) jsonStr = directJsonMatch[0];
    }

    const result = JSON.parse(jsonStr);
    
    return {
      timestamp: Date.now(),
      global_metrics: result.global_metrics,
      community_structure: result.community_structure || { num_communities: 0, modularity: 0, largest_community_size: 0 },
      key_influencers: result.key_influencers || [],
      strategic_commentary: result.strategic_commentary || "Analysis inconclusive.",
      raw_output: text
    };

  } catch (e) {
    console.error("Deep Analysis Failed", e);
    throw new Error("Intelligence Gathering Failed: " + (e as any).message);
  }
}