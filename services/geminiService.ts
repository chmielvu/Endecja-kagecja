
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, KnowledgeGraph, NodeData, NodeType } from "../types";
import { getEmbedding, cosineSimilarity } from './embeddingService';
import { SimilarityTrie } from './trieService';

/*
 * Agile Graph Architect - Gemini 3 Pro Integration
 * ------------------------------------------------
 * This service leverages the 'gemini-3-pro-preview' model to provide agentic
 * capabilities for the Knowledge Graph.
 * 
 * Features:
 * - Graph Expansion: Uses Google Search & Reasoning to find new entities.
 * - Node Deepening: Performs deep-dive research on specific nodes.
 * - Ingestion: Multimodal document analysis with Trie-based deduplication.
 * - Tools: googleSearch (Grounding), codeExecution (Logic).
 */

const API_KEY = process.env.API_KEY || '';
const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

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
Analizujesz zagrożenia ze strony Niemiec i Rosji. Oceniasz sytuację przez pryzmat interesu narodowego (egoizm narodowy).
Używaj języka z epoki, ale odpowiadaj zwięźle.
`;

const VALID_TYPES = ['person', 'organization', 'event', 'concept', 'publication'];

function cleanAndParseJSON(text: string): any {
  if (!text) return {};
  let clean = text.replace(/^```json\s*/gm, '')
                  .replace(/^```\s*/gm, '')
                  .replace(/\s*```$/gm, '')
                  .trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];
  try {
    const parsed = JSON.parse(clean);
    
    // Validate and Normalize Types
    if (parsed.nodes && Array.isArray(parsed.nodes)) {
        parsed.nodes = parsed.nodes.map((n: any) => {
            const typeLower = (n.type || 'concept').toLowerCase();
            return {
                ...n,
                type: VALID_TYPES.includes(typeLower) ? typeLower : 'concept'
            };
        });
    }
    return parsed;
  } catch (e) {
    return {}; 
  }
}

export async function chatWithAgent(
  history: ChatMessage[], 
  userMessage: string,
  graphContext: KnowledgeGraph
): Promise<{ text: string, reasoning: string, sources?: any[] }> {
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
      return { text: result.text || "...", reasoning: "Analiza geopolityczna...", sources: [] };
    } catch (e: any) {
      return { text: `Błąd: ${e.message}`, reasoning: "" };
    }
}

/**
 * INGESTION PIPELINE: Analyze Documents (PDF/Images)
 * Enhanced with Trie-based Entity Resolution
 */
export async function analyzeDocument(
  file: File,
  currentGraph: KnowledgeGraph
): Promise<{ newNodes: any[], newEdges: any[], thoughtSignature: string }> {
  const ai = getAiClient();
  
  // Initialize Trie for resolution
  const trie = new SimilarityTrie();
  trie.loadNodes(currentGraph.nodes.map(n => n.data));

  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const mimeType = file.type;
  
  const prompt = `
    You are an Intelligence Officer analyzing a captured archival document.
    
    TASK:
    1. Extract all key entities (People, Organizations, Events) and relationships.
    2. Ignore generic entities; focus on the Endecja movement context.
    3. Return a JSON patch to merge into the Knowledge Graph.
    
    STRICT SCHEMA:
    {
      "thoughtSignature": "Brief analysis of the document's significance",
      "nodes": [ { "id": "slug", "label": "Name", "type": "person|organization|event|concept|publication", "description": "Extracted context", "sources": ["${file.name}"] } ],
      "edges": [ { "source": "slug", "target": "slug", "label": "relationship", "sources": ["${file.name}"] } ]
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
    let extractedNodes = parsed.nodes || [];
    let extractedEdges = parsed.edges || [];
    const thoughtSignature = parsed.thoughtSignature || "Document analysis complete.";

    // --- TRIE-BASED ENTITY RESOLUTION ---
    const idMap = new Map<string, string>(); // Map local extracted ID -> Graph ID

    const resolvedNodes = extractedNodes.map((node: any) => {
      // Dynamic max distance based on label length (allow more fuzziness for longer names)
      const maxDist = node.label.length > 5 ? 2 : 1; 
      const matches = trie.findSimilar(node.label, maxDist);

      if (matches.length > 0) {
        // Match found! Use existing ID.
        const bestMatch = matches[0];
        console.log(`[Resolution] Merging '${node.label}' -> '${bestMatch.label}' (ID: ${bestMatch.id})`);
        idMap.set(node.id, bestMatch.id);
        
        // Return node with existing ID, marking it for update rather than creation if needed
        return { ...node, id: bestMatch.id, _isResolved: true };
      }
      
      // No match, keep original
      idMap.set(node.id, node.id);
      return node;
    });

    // Remap edges to use resolved IDs
    const resolvedEdges = extractedEdges.map((edge: any) => ({
      ...edge,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target
    }));

    return {
        newNodes: resolvedNodes,
        newEdges: resolvedEdges,
        thoughtSignature: thoughtSignature + ` [Resolved ${extractedNodes.length - resolvedNodes.filter((n: any) => !n._isResolved).length} entities via Index]`
    };

  } catch (e) {
      console.error("Ingestion failed:", e);
      throw e;
  }
}

/**
 * Gemini 3 Pro Graph Expansion
 * Uses Google Search and Code Execution for robust historical data gathering.
 */
export async function generateGraphExpansion(
  currentGraph: KnowledgeGraph, 
  query: string
): Promise<{ newNodes: any[], newEdges: any[], thoughtProcess: string }> {
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, undefined, 120, query);

  const prompt = `
    Role: Historical Intelligence Analyst.
    Task: Expand the graph for the query: "${query}".
    
    Current Context: ${contextString}
    
    Instructions:
    1. Use Google Search to verify dates, full names, and relationships.
    2. Focus on the historical period (1880-1945) and the Endecja/National Democracy movement.
    3. Ensure all new nodes have precise dates and source attributions.
    4. If searching, populate the "sources" array with the actual URLs or Titles found.
    
    RETURN JSON ONLY using the schema below.
    STRICT SCHEMA:
    {
      "thoughtSignature": "Brief reasoning about why these entities are relevant",
      "nodes": [ { "id": "slug", "label": "Name", "type": "person|organization|event|concept|publication", "description": "desc", "dates": "YYYY or YYYY-YYYY", "sources": ["url_or_book"] } ],
      "edges": [ { "source": "slug", "target": "slug", "label": "label", "dates": "YYYY", "sources": ["url_or_book"] } ]
    }
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: 'high' } as any,
          tools: [{ googleSearch: {} }, { codeExecution: {} }], // Enable full toolset
        }
    });
    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
        newNodes: parsed.nodes || [],
        newEdges: parsed.edges || [],
        thoughtProcess: parsed.thoughtSignature || "Expansion complete."
    };
  } catch (e) {
    console.error("Graph Expansion Error:", e);
    return { newNodes: [], newEdges: [], thoughtProcess: "Analysis failed due to connection error." };
  }
}

/**
 * Gemini 3 Pro Node Deepening
 * Performs deep research on a specific entity.
 */
export async function generateNodeDeepening(
  node: NodeData,
  currentGraph: KnowledgeGraph
): Promise<{ updatedProperties: Partial<NodeData>, newEdges: any[], thoughtSignature: string }> {
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, node, 100);

  const prompt = `
    Role: Historical Archivist.
    Task: Conduct deep research on: "${node.label}" (${node.type}).
    
    Current Graph Context: ${contextString}
    
    Instructions:
    1. Find specific, sourced relationships (allies, enemies, memberships).
    2. Verify key dates (birth, death, founding, dissolution).
    3. Extract conflicts or ideological stances.
    4. Use Google Search to find authoritative sources.
    5. Populate the "sources" field with valid URLs.
    
    OUTPUT SCHEMA:
    {
      "thoughtSignature": "Research summary",
      "updatedProperties": { "description": "Detailed biography...", "dates": "YYYY-YYYY", "region": "Region Name", "sources": ["url1", "url2"] },
      "newEdges": [ { "source": "${node.id}", "target": "related_id", "label": "relationship", "sources": ["url1"] } ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: 'high' } as any,
        tools: [{ googleSearch: {} }, { codeExecution: {} }],
      }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
      updatedProperties: parsed.updatedProperties || {},
      newEdges: parsed.newEdges || [],
      thoughtSignature: parsed.thoughtSignature || "Research complete."
    };
  } catch (e) {
    console.error("Node Deepening Error:", e);
    return { updatedProperties: {}, newEdges: [], thoughtSignature: "Research unavailable." };
  }
}

export async function generateCommunityInsight(nodes: NodeData[], edges: any[]): Promise<string> {
    const ai = getAiClient();
    const prompt = `Summarize this community of ${nodes.length} entities: ${nodes.map(n=>n.label).join(', ')}. Focus on their shared goals or conflicts.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "";
}
