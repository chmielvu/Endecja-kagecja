

import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Function to get a fresh GoogleGenAI client instance
// This ensures that if the API_KEY changes (e.g., via a user selection dialog for Veo models),
// the client instance is always up-to-date.
const getEmbeddingAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

// Simple in-memory cache to save API calls during session
const embeddingsCache = new Map<string, number[]>();

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text) return [];
  if (embeddingsCache.has(text)) return embeddingsCache.get(text)!;

  try {
    const ai = getEmbeddingAiClient(); // Get a fresh client instance
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: {
        parts: [{ text }]
      }
    });

    // Handle different potential response structures from SDK versions
    const embedding = (response as any).embedding?.values || (response as any).embeddings?.[0]?.values;
    
    if (embedding) {
      embeddingsCache.set(text, embedding);
      return embedding;
    }
    return [];
  } catch (error) {
    console.warn("Embedding failed for text:", text.substring(0, 20), error);
    return [];
  }
}

// Batch processing with concurrency control
export async function getEmbeddingsBatch(texts: string[], concurrency = 5): Promise<Array<number[]>> {
  const results: Array<number[]> = new Array(texts.length).fill([]);
  const queue = texts.map((text, index) => ({ text, index }));
  
  const processItem = async (item: { text: string, index: number }) => {
    try {
      results[item.index] = await getEmbedding(item.text);
    } catch (e) {
      console.warn(`Failed to embed item ${item.index}`, e);
      results[item.index] = [];
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await processItem(item);
      }
    });
  }

  await Promise.all(workers.map(w => w()));
  return results;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}