
import { GoogleGenAI } from "@google/genai";
import { KnowledgeGraph } from "../types";

const API_KEY = process.env.API_KEY || '';
const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

export interface TemporalPrediction {
  source: string;
  target: string;
  relation: string;
  confidence: number;
  reasoning: string;
}

/**
 * Robustly parses JSON from LLM response, handling markdown fences.
 */
function cleanAndParseJSON(text: string): any[] {
  if (!text) return [];
  
  // Remove Markdown fences
  let clean = text.replace(/^```json\s*/gm, '')
                  .replace(/^```\s*/gm, '')
                  .replace(/\s*```$/gm, '')
                  .trim();

  // Extract JSON array if surrounded by text
  const jsonMatch = clean.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  }

  try {
    const result = JSON.parse(clean);
    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.error("JSON Parse Error in Temporal Reasoning:", e);
    return [];
  }
}

/**
 * Extracts relevant historical context (nodes/edges) for a specific time window.
 */
function extractRecurrentPatterns(graph: KnowledgeGraph, startYear: number, endYear: number) {
    // 1. Filter Nodes active in this period (events happening, or people active)
    const relevantNodes = graph.nodes.filter(n => {
        const y = n.data.year;
        // Include nodes with specific years in range, or key entities (importance > 0.8) which are always relevant context
        return (y !== undefined && y >= startYear && y <= endYear) || (n.data.importance && n.data.importance > 0.8);
    }).map(n => `${n.data.label} (${n.data.type})`);

    // 2. Filter Edges active in this period
    const relevantEdges = graph.edges.filter(e => {
        let edgeYear: number | undefined = e.data.validFrom;
        
        // Fallback to parsing 'dates' string if validFrom is missing
        if (!edgeYear && e.data.dates) {
             const match = e.data.dates.match(/\d{4}/);
             if (match) edgeYear = parseInt(match[0]);
        }
        
        return edgeYear !== undefined && edgeYear >= startYear && edgeYear <= endYear;
    }).map(e => ({
        source: e.data.source,
        target: e.data.target,
        label: e.data.label,
        year: e.data.dates || e.data.validFrom
    }));

    // 3. Summarize
    return {
        context_window: `${startYear}-${endYear}`,
        active_entities_count: relevantNodes.length,
        key_entities_sample: relevantNodes.slice(0, 30),
        historical_events_and_relations: relevantEdges.slice(0, 50) // Context limit
    };
}

/**
 * Uses Gemini 3.0 to predict future connections based on graph history.
 */
export async function predictFutureConnections(
  graph: KnowledgeGraph,
  targetYear: number
): Promise<TemporalPrediction[]> {
  
  // Look back 10 years for patterns
  const patterns = extractRecurrentPatterns(graph, targetYear - 10, targetYear);
  
  const ai = getAiClient();
  const prompt = `
    You are an expert historian on the Endecja movement. 
    Analyze the following historical context (Active entities and relationships from ${patterns.context_window}).

    CONTEXT DATA:
    ${JSON.stringify(patterns, null, 2)}

    TASK:
    Predict 5 likely new relationships, organizational splits, or political events that might emerge around the year ${targetYear}.
    Based these predictions on the trajectory of key actors (e.g. Dmowski, Piłsudski) and ideological trends (Nationalism vs Sanacja).
    
    RETURN ONLY A JSON ARRAY. Format:
    [
      {
        "source": "Existing Node ID or Label",
        "relation": "Predicted Relationship",
        "target": "Existing or New Node Label",
        "confidence": 0.0 to 1.0,
        "reasoning": "Brief historical justification"
      }
    ]
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
          thinkingConfig: { thinkingLevel: 'high' } as any,
          temperature: 0.7 
        }
      });
      
      const text = response.text || '[]';
      return cleanAndParseJSON(text);
      
  } catch (e) {
      console.error("Temporal Reasoning Failed", e);
      return [];
  }
}
