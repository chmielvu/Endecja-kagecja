
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

// Helper to extract a single year from TemporalFactType for filtering
// Exported for reuse in other services (e.g., GraphCanvas, RAGService, TemporalReasoningService)
export function getYearFromTemporalFact(temporal?: TemporalFactType): number | undefined {
  if (!temporal) return undefined;
  if (temporal.type === 'instant') return parseInt(temporal.timestamp);
  if (temporal.type === 'interval') return parseInt(temporal.start);
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
): Promise<{ text: string, reasoning: string, sources?: SourceCitation[], patch?: GraphPatch }> {
    if (!API_KEY) throw new Error("API Key missing");
    const ai = getAiClient();

    // 1. CONTEXT: Summarize the current graph ("The Eyes")
    // We limit to top 60 nodes to save context window but give awareness
    const graphSummary = graphContext.nodes
        .sort((a, b) => (b.data.importance || 0) - (a.data.importance || 0))
        .slice(0, 60)
        .map(n => `- ${n.data.label} (${n.data.type})`)
        .join('\n');

    // 2. INSTRUCTION: The "Verify then Build" Directive
    const systemInstruction = `
      ${DMOWSKI_SYSTEM_INSTRUCTION}

      TWOJE NARZĘDZIA (Your Tools):
      1. Google Search: Użyj tego, aby sprawdzić daty, pełne nazwiska i fakty historyczne. Nie zgaduj.
      2. propose_changes: Użyj tego, aby dodać nowe węzły i krawędzie do grafu.

      OBECNY STAN WIEDZY (Current Graph):
      ${graphSummary}

      PROTOKÓŁ DZIAŁANIA (Operating Protocol):
      - Jeśli użytkownik pyta o fakty -> Użyj Google Search, a potem odpowiedz.
      - Jeśli użytkownik chce rozbudować graf -> NAJPIERW użyj Google Search, aby zweryfikować dane, a NASTĘPNIE użyj narzędzia 'propose_changes', aby stworzyć strukturę.
      - Nie dodawaj duplikatów (sprawdź listę obecnych węzłów).
    `;

    // 3. TOOLS: Search + Function Calling ("The Hands")
    const tools = [
      { googleSearch: {} }, // Enable Native Search
      {
        functionDeclarations: [
          {
            name: "propose_changes",
            description: "Propose structured additions to the Knowledge Graph.",
            parameters: {
              type: "OBJECT",
              properties: {
                reasoning: { type: "STRING", description: "Historical justification for these additions." },
                nodes: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING", description: "Slug ID (e.g. 'mosdorf_jan')" },
                      label: { type: "STRING" },
                      type: { type: "STRING", enum: ["person", "organization", "event", "publication", "concept", "location"] },
                      description: { type: "STRING" },
                      year: { type: "NUMBER", description: "Primary active year (for timeline)" }
                    },
                    required: ["id", "label", "type"]
                  }
                },
                edges: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      source: { type: "STRING" },
                      target: { type: "STRING" },
                      relationType: { type: "STRING" },
                      label: { type: "STRING" }
                    },
                    required: ["source", "target", "relationType"]
                  }
                }
              },
              required: ["nodes", "edges", "reasoning"]
            }
          }
        ]
      }
    ];

    try {
      const formattedHistory = history.filter(h => h.role !== 'system').map(h => ({ 
           role: h.role === 'assistant' ? 'model' : 'user', 
           parts: [{ text: h.content }] 
      }));
      const chat = ai.chats.create({
         model: 'gemini-3-pro-preview', // Or 'gemini-2.0-flash-exp' if latency is high
         config: {
            systemInstruction,
            temperature: 0.5, // Lower temp for factual accuracy
            tools: tools as any
         },
         history: formattedHistory
      });

      const result = await chat.sendMessage({ message: userMessage });
      
      // 4. RESPONSE HANDLING
      // Fix: Access functionCalls directly from the result object
      const call = result.functionCalls?.[0];
      
      // Did it use search grounding?
      // Fix: Access candidates directly from the result object
      const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
      const sources: SourceCitation[] = groundingMetadata?.groundingChunks?.map((c: any) => ({
          uri: c.web?.uri || 'Google Search',
          label: c.web?.title || 'Web Source',
          type: 'website'
      })) || [];

      if (call && call.name === 'propose_changes') {
          const args = call.args as any;
          return {
              text: `[Dane operacyjne przygotowane]\n${args.reasoning}\n\n*Oczekiwanie na zatwierdzenie zmian w grafie...*`,
              reasoning: `Użyto narzędzi: ${sources.length > 0 ? 'Google Search + ' : ''}Graph Builder.`,
              sources: sources,
              patch: { // Return the patch to the UI
                  type: 'expansion',
                  reasoning: args.reasoning,
                  nodes: args.nodes || [],
                  edges: args.edges || []
              }
          };
      }

      return { 
        text: result.text || "...", 
        reasoning: sources.length > 0 ? "Weryfikacja danych w Google Search..." : "Analiza wewnętrzna...", 
        sources: sources 
      };

    } catch (e: any) {
      console.error("Agent Error", e);
      return { text: `Przepraszam, nastąpił błąd łączności: ${e.message}`, reasoning: "" };
    }
}

/**
 * DOCUMENT INGESTION: Analyze Documents (PDF/Images)
 * This function leverages Gemini's multimodal vision to extract entities and relationships
 * from unstructured historical documents, populating the graph from primary sources.
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
    Jesteś analitykiem historycznym, przetwarzającym zeskanowane dokumenty archiwalne z epoki Endecji (1893-1939).
    
    ZADANIE:
    1. Wyodrębnij wszystkie kluczowe encje (Osoby, Organizacje, Wydarzenia, Publikacje, Koncepcje, Lokacje, Dokumenty związane z samym plikiem) oraz ich relacje.
    2. Skoncentruj się na kontekście ruchu Endecji i historii Polski.
    3. Dla każdej wyodrębnionej encji, określ jej 'validity' (temporalne istnienie) jako 'instant' (np. "1934"), 'interval' (np. "1918-1939") lub 'fuzzy'.
    4. Dla każdej relacji, określ jej kontekst 'temporal'.
    5. Podaj konkretne 'źródła' jako ustrukturyzowaną tablicę dla *każdego* węzła i krawędzi, odwołując się do dokumentu.
    6. Dla 'regionu' węzła, jeśli lokalizacja jest jasna, podaj ustrukturyzowane informacje o regionie (RegionInfo).
    
    SCHEMAT dla węzłów:
    - id: "slug_name"
    - label: "Full Name"
    - type: "person|organization|event|concept|publication|location|document"
    - description: "Brief context"
    - validity: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - region?: { id: "slug", label: "Region Name", type: "city|province|country|historical_region" }
    - sources: [{ uri: "${file.name}", label: "Document Scan", type: "archival" }]
    
    SCHEMAT dla krawędzi:
    - source: "source_id"
    - target: "target_id"
    - relationType: "founded|member_of|led|published|influenced|opposed|collaborated_with|participated_in|authored|organized|related_to|supported|criticized"
    - temporal: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - sources: [{ uri: "${file.name}", label: "Document Scan", type: "archival" }]
    
    ZWROC TYLKO OBIEKT JSON.
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
      console.error("Document ingestion failed:", e);
      throw e;
  }
}

/**
 * GRAPH EXPANSION: Expands the graph by searching for new entities and relationships
 * based on a user query, ensuring historical context and source attribution.
 */
export async function generateGraphExpansion(
  currentGraph: KnowledgeGraph, 
  query: string
): Promise<GraphPatch> { // Updated return type to GraphPatch
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, undefined, 120, query);

  const prompt = `
    Jesteś analitykiem historycznym, specjalizującym się w ruchu Endecji (1893-1939).
    Rozbuduj graf wiedzy na podstawie zapytania: "${query}".
    
    Obecny kontekst grafu: ${contextString}
    
    ZADANIE:
    1. Zidentyfikuj nowe encje (osoba, organizacja, wydarzenie, koncepcja, publikacja, lokalizacja) i ich kluczowe relacje.
    2. Dla każdej wyodrębnionej encji, określ jej 'validity' (temporalne istnienie) jako 'instant' (np. "1934"), 'interval' (np. "1918-1939") lub 'fuzzy'.
    3. Dla każdej relacji, określ jej kontekst 'temporal'.
    4. Podaj konkretne 'źródła' jako ustrukturyzowaną tablicę dla *każdego* węzła i krawędzi.
    5. Dla 'regionu' węzła, podaj ustrukturyzowane informacje o regionie (RegionInfo), jeśli lokalizacja jest jasna.
    6. Priorytetyzuj informacje historycznie istotne, bezpośrednio związane z ruchem Endecji.
    
    NARZĘDZIA: Użyj Google Search, aby zweryfikować daty, nazwy, relacje i źródła.
    
    ZWROC TYLKO OBIEKT JSON.
    SCHEMAT dla węzłów:
    - id: "slug_name"
    - label: "Full Name"
    - type: "person|organization|event|concept|publication|location"
    - description: "Short description with historical context."
    - validity: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - region?: { id: "slug", label: "Region Name", type: "city|province|country|historical_region" }
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    SCHEMAT dla krawędzi:
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
    throw new Error("Graph Expansion Failed: " + (e as any).message);
  }
}

/**
 * NODE DEEPENING: Conducts deep research on a specific node, enriching its
 * properties and discovering new relationships with full source attribution.
 */
export async function generateNodeDeepening(
  node: NodeData,
  currentGraph: KnowledgeGraph
): Promise<GraphPatch> { // Updated return type to GraphPatch
  const ai = getAiClient();
  const contextString = await getSmartContext(currentGraph, node, 100);

  const prompt = `
    Jesteś analitykiem historycznym, specjalizującym się w ruchu Endecji.
    Przeprowadź dogłębne badanie encji: "${node.label}" (ID: ${node.id}, Typ: ${node.type}).
    
    Obecny kontekst grafu (powiązane encje): ${contextString}
    
    ZADANIE:
    1. Wzbogać istniejące właściwości węzła (opis, ważność, region) o więcej szczegółów i precyzji.
    2. Jeśli węzeł jest 'osobą' lub 'organizacją', odkryj konkretne 'istnienie' (np. daty utworzenia/rozwiązania) lub 'role' (dla osób).
    3. Odkryj konkretne, udokumentowane nowe relacje (krawędzie) związane z tym węzłem.
    4. Upewnij się, że wszystkie nowe informacje (właściwości, istnienie/role, krawędzie) są historycznie dokładne i przypisane do ustrukturyzowanych 'źródeł'.
    
    NARZĘDZIA: Użyj Google Search, aby znaleźć szczegółowe informacje historyczne.
    
    SCHEMAT WYJŚCIOWY dla updatedProperties:
    - description: "More detailed biography/context."
    - validity?: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - region?: { id: "slug", label: "Region Name", type: "city|province|country|historical_region" }
    - existence?: Array<{ start: string; end?: string; status: "active"|"latent"|"defunct"|"reformed"|"formed"|"dissolved"|"established"; context?: string; }> (for orgs)
    - roles?: Array<{ role: string; organization?: string; start: string; end?: string; context?: string; }> (for persons)
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    SCHEMAT WYJŚCIOWY dla newEdges:
    - source: "${node.id}" (lub inny ID, jeśli pogłębiany węzeł jest celem)
    - target: "slug_of_related_entity"
    - relationType: "founded|member_of|led|published|influenced|opposed|collaborated_with|participated_in|authored|organized|related_to|supported|criticized"
    - temporal: { type: "instant"|"interval"|"fuzzy", timestamp/start/approximate: "YYYY..." }
    - sources: [{ uri: "https://...", label: "Source Title", type: "website" }]
    
    ZWROC TYLKO OBIEKT JSON.
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
    throw new Error("Node Deepening Failed: " + (e as any).message);
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
 * Performs deep structural analysis of the network using Python and NetworkX.
 * Uses Gemini's codeExecution tool to run graph algorithms.
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
    Jesteś analitykiem grafów dla Ruchu Endecji.
    
    ZADANIE: Przeprowadź dogłębną analizę strukturalną tej sieci za pomocą Pythona i NetworkX.
    
    DANE (JSON):
    ${JSON.stringify(pyGraph)}

    WYMAGANIA DLA SKRYPTU PYTHON:
    1. Załaduj dane do NetworkX DiGraph lub Graph, biorąc pod uwagę 'znak' krawędzi dla sieci ze znakami, jeśli ma to zastosowanie.
    2. Oblicz następujące metryki:
       - Gęstość.
       - Tranzytywność (globalny współczynnik klasteryzacji).
       - Sprawdź, czy graf jest połączony (słabo połączony dla grafów skierowanych) i policz słabo połączone składowe.
       - PageRank (znajdź 5 najlepszych wpływowych osób po ID i etykiecie).
       - Pośrednictwo Centralne (znajdź 3 najlepszych wpływowych osób po ID i etykiecie, jeśli rozmiar grafu <= 500, aby uniknąć problemów z wydajnością).
       - Społeczności Louvain (używając \`python-louvain\` lub algorytmów społeczności NetworkX).
       - Rozmiar największej społeczności.
    3. Końcowy wynik MUSI być ciągiem JSON z wynikami.
    
    Po kodzie, dostarcz "Komentarz Strategiczny" jako Roman Dmowski (1934), interpretując te statystyki. 
    Czy ruch jest rozdrobniony (wiele składowych)? Kto kontroluje przepływ informacji (wysokie pośrednictwo/pagerank)? Jak spójne są frakcje (modułowość)?
    
    SCHEMAT ZWROTU JSON (UPEWNIJ SIĘ, ŻE JEST TO WAŻNY JSON):
    {
      "global_metrics": { "density": float, "transitivity": float, "is_connected": boolean, "number_connected_components": int },
      "community_structure": { "modularity": float, "num_communities": int, "largest_community_size": int },
      "key_influencers": [ {"id": str, "label": str, "score": float, "metric": "pagerank" | "betweenness"} ],
      "strategic_commentary": "String"
    }
    
    Wyprowadź tylko skrypt Python, a następnie wynik JSON, po którym następuje komentarz strategiczny.
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
    
    // Enhanced JSON extraction regex to handle Python 'print' noise
    const jsonMatch = text.match(/\{[\s\S]*"global_metrics"[\s\S]*\}/);
    let jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    // Sanitize common Python bool/None to JSON
    jsonStr = jsonStr.replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');

    let result;
    try {
        result = JSON.parse(jsonStr);
    } catch (e) {
        console.warn("JSON Parse failed, attempting fallback repair", e);
        // Fallback: If strict parse fails, return partial/empty to prevent app crash
        return {
            timestamp: Date.now(),
            global_metrics: { density: 0, transitivity: 0, is_connected: false, number_connected_components: 0 },
            community_structure: { modularity: 0, num_communities: 0, largest_community_size: 0 },
            key_influencers: [],
            strategic_commentary: "Analysis output parsing failed. Check raw output.",
            raw_output: text
        };
    }
    
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
    throw new Error("Deep Analysis Failed: " + (e as any).message);
  }
}
