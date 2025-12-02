import { GoogleGenAI } from "@google/genai";
import { ChatMessage, KnowledgeGraph, NodeData, EdgeData } from "../types";
import { getEmbedding, cosineSimilarity } from './embeddingService';

const API_KEY = process.env.API_KEY || '';
const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

// --- Smart Context Helper ---
/**
 * Selects the most relevant nodes for the prompt context.
 * 
 * Strategy:
 * 1. If a 'query' is provided: Use Vector Similarity (Semantics) to find relevant nodes.
 * 2. If 'focusNode' is provided: Use Neighbors.
 * 3. Fallback/Fill: Use high PageRank nodes (Structural Importance).
 */
async function getSmartContext(
  graph: KnowledgeGraph, 
  focusNode?: NodeData, 
  limit: number = 150,
  query?: string
): Promise<string> {
  const nodes = graph.nodes;
  const selectedNodes = new Set<string>();
  const contextList: string[] = [];

  // 1. Semantic Search (if Query provided)
  if (query) {
      try {
          const queryEmb = await getEmbedding(query);
          if (queryEmb.length > 0) {
              const scoredNodes = [];
              // Note: In production this would use a vector DB or pre-calculated cache
              // For client-side dynamic graphs, we batch generate or use cache
              for (const n of nodes) {
                  // Heuristic: Use description + label
                  const text = `${n.data.label} ${n.data.description || ''}`;
                  const emb = await getEmbedding(text);
                  if (emb.length > 0) {
                      const score = cosineSimilarity(queryEmb, emb);
                      scoredNodes.push({ node: n, score });
                  }
              }
              
              // Top relevant nodes
              scoredNodes.sort((a, b) => b.score - a.score)
                         .slice(0, Math.floor(limit / 2)) // Allocate 50% of budget to semantics
                         .forEach(item => {
                             if (!selectedNodes.has(item.node.data.id)) {
                                 selectedNodes.add(item.node.data.id);
                                 contextList.push(`${item.node.data.label} (${item.node.data.type})`);
                             }
                         });
          }
      } catch (e) {
          console.warn("Smart Context: Vector search failed, falling back to topology", e);
      }
  }

  // 2. Add Focus Node & Neighbors
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

  // 3. Fill remaining with High PageRank nodes (Structural Backbone)
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

// --- Dmowski Persona (1925) ---
const DMOWSKI_SYSTEM_INSTRUCTION = `
Jesteś Romanem Dmowskim w roku 1925. Mówisz wyłącznie po polsku, realistycznie, antyfederacyjnie, piastowsko, z naciskiem na interes narodowy i egoizm narodowy. Odpowiadasz faktami historycznymi, cytujesz własne prace gdy to możliwe. Nie wcielasz się w narratora – jesteś Dmowskim. Nigdy nie łamiesz roli. Nie zmieniaj grafu wiedzy.
`;

function cleanAndParseJSON(text: string): any {
  if (!text) return {};
  let clean = text.replace(/^```json\s*/gm, '')
                  .replace(/^```\s*/gm, '')
                  .replace(/\s*```$/gm, '')
                  .trim();

  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        try {
            return JSON.parse(text.substring(firstOpen, lastClose + 1));
        } catch (e2) {}
    }
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
            topP: 0.9,
         },
         history: formattedHistory
      });

      const result = await chat.sendMessage({ message: userMessage });
      const responseText = result.text || "Brak odpowiedzi.";

      return {
        text: responseText,
        reasoning: "Dmowski mode active.",
        sources: []
      };

    } catch (e: any) {
      console.error("Chat Error:", e);
      return { text: `Błąd modelu: ${e.message}`, reasoning: "" };
    }
}

export async function generateGraphExpansion(
  currentGraph: KnowledgeGraph, 
  query: string
): Promise<{ newNodes: any[], newEdges: any[], thoughtProcess: string }> {
  const ai = getAiClient();
  
  // USE SMART CONTEXT (With Semantic Query)
  const contextString = await getSmartContext(currentGraph, undefined, 120, query);

  const prompt = `
    You are an expert historian specializing in the Endecja movement. Expand the graph based on: "${query}".
    
    EXISTING GRAPH CONTEXT (Do not duplicate):
    ${contextString}
    
    TASK: Return valid JSON with new nodes/edges.
    
    PROTOCOL:
    1. PLAN: Identify missing key figures or events related to the query.
    2. VERIFY: Ensure dates and relationships are historically accurate.
    3. OUTPUT: JSON Schema.
    
    SCHEMA:
    {
      "thoughtSignature": "string (Format: 'Hash: Summary of reasoning')",
      "nodes": [ { "id": "string", "label": "string", "type": "string", "dates": "string", "region": "string", "description": "string", "importance": number } ],
      "edges": [ { "source": "string", "target": "string", "label": "string", "dates": "string", "sign": "positive|negative" } ]
    }
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: 'high' } as any,
          // Iron Sandbox: Enable Code Execution for date math/validation if needed by the model
          tools: [{ googleSearch: {} }, { codeExecution: {} }],
        }
      });

      const parsed = cleanAndParseJSON(response.text || '{}');
      return {
        newNodes: parsed.nodes || [],
        newEdges: parsed.edges || [],
        thoughtProcess: parsed.thoughtSignature || "Analysis complete."
      };
  } catch (e) {
    return { newNodes: [], newEdges: [], thoughtProcess: "Error: Failed." };
  }
}

export async function generateNodeDeepening(
  node: NodeData,
  currentGraph: KnowledgeGraph
): Promise<{ updatedProperties: Partial<NodeData>, newEdges: any[], thoughtSignature: string }> {
  const ai = getAiClient();
  
  // USE SMART CONTEXT FOCUSED ON TARGET NODE
  const contextString = await getSmartContext(currentGraph, node, 100);

  const prompt = `
    You are an expert historian specializing in the Endecja movement.
    Perform a deep dive analysis on the entity: "${node.label}" (Type: ${node.type}).
    
    CURRENT ENTITY DATA:
    ${JSON.stringify(node)}
    
    GRAPH CONTEXT:
    ${contextString}

    TASK:
    1. Verify and enrich the entity's properties (dates, description, region, certainty).
    2. Identify specific, high-confidence historical relationships connected to this entity that are missing from the graph.
    3. Generate a 'thoughtSignature' which is a hash/summary of your reasoning chain for continuity.

    OUTPUT SCHEMA (Strict JSON, no preamble):
    {
      "thoughtSignature": "string (Format: 'Hash: Brief reasoning summary')",
      "updatedProperties": {
        "description": "string",
        "dates": "string",
        "region": "string",
        "certainty": "confirmed" | "disputed" | "alleged"
      },
      "newEdges": [
        {
          "source": "${node.id}", 
          "target": "string (Target Entity ID or Label)",
          "label": "string (Relationship type)",
          "sign": "positive" | "negative",
          "certainty": "confirmed" | "disputed" | "alleged"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: 'high' } as any,
        // Enable Code Execution for date verification
        tools: [{ googleSearch: {} }, { codeExecution: {} }],
      }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
      updatedProperties: parsed.updatedProperties || {},
      newEdges: parsed.newEdges || [],
      thoughtSignature: parsed.thoughtSignature || "Deep research complete."
    };
  } catch (e) {
    console.error("Deepening error:", e);
    return { updatedProperties: {}, newEdges: [], thoughtSignature: "Error during deepening." };
  }
}

export async function generateCommunityInsight(
  nodes: NodeData[],
  edges: any[]
): Promise<string> {
  const ai = getAiClient();
  const nodeText = nodes.map(n => `${n.label} (${n.type})`).slice(0, 30).join(', ');
  const edgeText = edges.slice(0, 20).map(e => `${e.source}->${e.target} (${e.label})`).join(', ');

  const prompt = `
    Analyze this historical cluster.
    Entities: ${nodeText}
    Relationships: ${edgeText}
    TASK: 2-sentence summary of thematic focus and political orientation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingLevel: 'low' } as any }
    });
    return response.text || "Analysis unavailable.";
  } catch (e) {
    return "Analysis failed.";
  }
}

export async function generateConnections(
  sourceNode: NodeData,
  targetNode: NodeData,
  currentGraph: KnowledgeGraph
): Promise<{ newNodes: any[], newEdges: any[], thoughtSignature: string }> {
  const ai = getAiClient();
  const context = await getSmartContext(currentGraph, sourceNode, 100);

  const prompt = `
    Find historical connection path between "${sourceNode.label}" and "${targetNode.label}".
    Context: ${context}
    Return JSON with intermediaries.
    SCHEMA: { "thoughtSignature": "string", "newNodes": [], "newEdges": [] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: 'high' } as any,
        tools: [{ googleSearch: {} }, { codeExecution: {} }]
      }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
      newNodes: parsed.newNodes || [],
      newEdges: parsed.newEdges || [],
      thoughtSignature: parsed.thoughtSignature || "Pathfinding complete."
    };
  } catch (e) {
    return { newNodes: [], newEdges: [], thoughtSignature: "Pathfinding failed." };
  }
}

export async function generateRelatedNodes(
  selectedNodes: NodeData[],
  currentGraph: KnowledgeGraph
): Promise<{ newNodes: any[], newEdges: any[], thoughtSignature: string }> {
  const ai = getAiClient();
  // Use first selected node as anchor for context
  const context = await getSmartContext(currentGraph, selectedNodes[0], 100);
  const selectionList = selectedNodes.map(n => `${n.label} (${n.type})`).join(', ');
  
  const prompt = `
    Analyze selected: ${selectionList}
    Context: ${context}
    Suggest 3-5 relevant missing entities.
    SCHEMA: { "thoughtSignature": "string", "newNodes": [], "newEdges": [] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: 'high' } as any,
        tools: [{ googleSearch: {} }]
      }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
      newNodes: parsed.newNodes || [],
      newEdges: parsed.newEdges || [],
      thoughtSignature: parsed.thoughtSignature || "Expansion complete."
    };
  } catch (e) {
    return { newNodes: [], newEdges: [], thoughtSignature: "Expansion failed." };
  }
}
