
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, KnowledgeGraph, NodeData } from "../types";
import { getEmbedding, cosineSimilarity } from './embeddingService';

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
 */
export async function analyzeDocument(
  file: File,
  currentGraph: KnowledgeGraph
): Promise<{ newNodes: any[], newEdges: any[], thoughtSignature: string }> {
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
    You are an Intelligence Officer analyzing a captured archival document.
    
    TASK:
    1. Extract all key entities (People, Organizations, Events) and relationships.
    2. Ignore generic entities; focus on the Endecja movement context.
    3. Return a JSON patch to merge into the Knowledge Graph.
    
    SCHEMA:
    {
      "thoughtSignature": "Brief analysis of the document's significance",
      "nodes": [ { "id": "slug", "label": "Name", "type": "person|organization|event", "description": "Extracted context", "sources": ["${file.name}"] } ],
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
    return {
        newNodes: parsed.nodes || [],
        newEdges: parsed.edges || [],
        thoughtSignature: parsed.thoughtSignature || "Document analysis complete."
    };
  } catch (e) {
      console.error("Ingestion failed:", e);
      throw e;
  }
}

export async function generateGraphExpansion(
  currentGraph: KnowledgeGraph, 
  query: string
): Promise<{ newNodes: any[], newEdges: any[], thoughtProcess: string }> {
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, undefined, 120, query);

  const prompt = `
    Expand graph for query: "${query}".
    Context: ${contextString}
    TOOLS: Use Google Search to verify dates and names.
    RETURN JSON.
    SCHEMA:
    {
      "thoughtSignature": "Reasoning...",
      "nodes": [ { "id": "slug", "label": "Name", "type": "type", "description": "desc", "sources": ["Google Search"] } ],
      "edges": [ { "source": "slug", "target": "slug", "label": "label", "sources": ["Google Search"] } ]
    }
  `;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: 'high' } as any,
          tools: [{ googleSearch: {} }],
        }
    });
    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
        newNodes: parsed.nodes || [],
        newEdges: parsed.edges || [],
        thoughtProcess: parsed.thoughtSignature || "Expansion complete."
    };
  } catch (e) {
    return { newNodes: [], newEdges: [], thoughtProcess: "Error." };
  }
}

export async function generateNodeDeepening(
  node: NodeData,
  currentGraph: KnowledgeGraph
): Promise<{ updatedProperties: Partial<NodeData>, newEdges: any[], thoughtSignature: string }> {
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, node, 100);

  const prompt = `
    Deep research on: "${node.label}" (${node.type}).
    Context: ${contextString}
    TASK: Find specific, sourced relationships and facts.
    TOOLS: Use Google Search.
    
    OUTPUT SCHEMA:
    {
      "thoughtSignature": "Research summary",
      "updatedProperties": { "description": "...", "sources": ["url1", "url2"] },
      "newEdges": [ { "source": "${node.id}", "target": "id", "label": "rel", "sources": ["url1"] } ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: 'high' } as any,
        tools: [{ googleSearch: {} }],
      }
    });

    const parsed = cleanAndParseJSON(response.text || '{}');
    return {
      updatedProperties: parsed.updatedProperties || {},
      newEdges: parsed.newEdges || [],
      thoughtSignature: parsed.thoughtSignature || "Research complete."
    };
  } catch (e) {
    return { updatedProperties: {}, newEdges: [], thoughtSignature: "Error." };
  }
}

export async function generateCommunityInsight(nodes: NodeData[], edges: any[]): Promise<string> {
    const ai = getAiClient();
    const prompt = `Summarize this community: ${nodes.map(n=>n.label).join(', ')}.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "";
}
