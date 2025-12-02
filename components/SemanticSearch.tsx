import React, { useState } from 'react';
import { useStore } from '../store';
import { getEmbeddingsBatch, cosineSimilarity } from '../services/embeddingService';
import { Search, X, Loader2, Target } from 'lucide-react';

export const SemanticSearch: React.FC = () => {
  const { isSemanticSearchOpen, setSemanticSearchOpen, graph, toggleNodeSelection } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  if (!isSemanticSearchOpen) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      // 1. Get Query Embedding
      const resultsBatch = await getEmbeddingsBatch([query]);
      const queryEmb = resultsBatch[0];

      if (!queryEmb || queryEmb.length === 0) {
        setResults([]);
        return;
      }

      // 2. Prepare Corpus
      // We filter to important nodes to keep the client-side batch reasonable (avoiding 1000s of API calls)
      // In a real backend, this would be a single DB call.
      const corpusNodes = graph.nodes
        .sort((a,b) => (b.data.importance || 0) - (a.data.importance || 0))
        .slice(0, 100); // Top 100 important nodes for quick semantic check

      const texts = corpusNodes.map(n => `${n.data.label}: ${n.data.description || ''}`);
      
      // 3. Get Batch Embeddings
      const corpusEmbeddings = await getEmbeddingsBatch(texts, 6); // concurrency 6

      // 4. Calculate Similarities
      const candidates = [];
      for (let i = 0; i < corpusNodes.length; i++) {
        const node = corpusNodes[i];
        const nodeEmb = corpusEmbeddings[i];
        
        if (nodeEmb && nodeEmb.length) {
            const score = cosineSimilarity(queryEmb, nodeEmb);
            if (score > 0.45) { // Slightly stricter threshold
                candidates.push({ node, score });
            }
        }
      }
      
      setResults(candidates.sort((a, b) => b.score - a.score).slice(0, 10));
    } catch (e) {
      console.error("Semantic search error", e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (id: string) => {
    toggleNodeSelection(id, false);
    // Optionally zoom to node logic here
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[300px] bg-zinc-950 border-t border-[#b45309]/30 z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300">
      <div className="p-4 border-b border-[#b45309]/20 flex justify-between items-center bg-zinc-900/50">
         <h3 className="font-bold text-white flex items-center gap-2 font-spectral">
            <Search size={18} className="text-[#b45309]" /> Wyszukiwanie Semantyczne (Vector)
         </h3>
         <button onClick={() => setSemanticSearchOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
      </div>
      
      <div className="p-4 flex gap-2 border-b border-zinc-800">
        <input 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Opisz czego szukasz (np. 'organizacje walczące z sanacją')..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-4 py-2 text-white focus:border-[#b45309] outline-none"
        />
        <button 
           onClick={handleSearch} 
           disabled={searching}
           className="px-6 bg-[#355e3b] hover:bg-[#2a4a2f] text-white rounded-md font-bold disabled:opacity-50 flex items-center gap-2 border border-[#355e3b]"
        >
          {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          Szukaj
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-black/20">
         {results.map(({ node, score }) => (
            <div key={node.data.id} onClick={() => handleSelect(node.data.id)} className="bg-zinc-900 p-3 rounded border border-zinc-800 hover:border-[#b45309] cursor-pointer group transition-colors">
               <div className="flex justify-between items-start">
                  <span className="font-bold text-white text-sm group-hover:text-[#b45309]">{node.data.label}</span>
                  <span className="text-xs font-mono text-[#355e3b]">{(score * 100).toFixed(1)}%</span>
               </div>
               <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{node.data.description}</div>
            </div>
         ))}
         {!searching && results.length === 0 && query && (
             <div className="col-span-full text-center text-zinc-600 py-8">
               {searching ? 'Przetwarzanie wektorów...' : 'Brak wyników semantycznych dla top-100 węzłów.'}
             </div>
         )}
         {!searching && !query && (
             <div className="col-span-full text-center text-zinc-600 py-8 italic opacity-50">
               Wpisz zapytanie, aby przeszukać bazę wektorową...
             </div>
         )}
      </div>
    </div>
  );
};
