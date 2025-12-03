
import React, { useState } from 'react';
import { useStore } from '../store';
import { getEmbeddingsBatch } from '../services/embeddingService';
import { vectorIndex } from '../services/vectorIndex'; // Use new service
import { Search, X, Loader2, RefreshCw } from 'lucide-react';
import { BakeliteInput } from './BakeliteInput';
import { BakeliteButton } from './BakeliteButton';
import { BakeliteCard } from './BakeliteCard';

export const SemanticSearch: React.FC = () => {
  const { isSemanticSearchOpen, setSemanticSearchOpen, graph, toggleNodeSelection, addToast } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isSemanticSearchOpen) return null;

  const handleIndexBuild = async () => {
    setIndexing(true);
    setProgress(0);
    try {
      await vectorIndex.buildIndex(graph, (pct) => setProgress(pct));
      addToast({ title: 'Indexing Complete', description: 'Semantic vector index updated.', type: 'success' });
    } catch (e) {
      addToast({ title: 'Indexing Failed', description: 'Could not update vector db.', type: 'error' });
    } finally {
      setIndexing(false);
    }
  };

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

      // 2. Search Index
      const hits = await vectorIndex.search(queryEmb, 10);
      
      // 3. Hydrate Results
      const hydrated = hits.map(hit => {
         const node = graph.nodes.find(n => n.data.id === hit.id);
         return node ? { node, score: hit.score } : null;
      }).filter(Boolean);

      setResults(hydrated);
      
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
    <div className="fixed bottom-0 left-0 right-0 h-[300px] bg-deco-navy border-t border-deco-gold/30 z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300">
      <BakeliteCard 
        title="Wyszukiwanie Semantyczne (Persistent Vector DB)" 
        icon={<Search size={18} />} 
        className="flex-1 !bg-transparent !border-none !shadow-none !clip-none"
        headerClassName="!p-4 !border-b !border-deco-gold/20 !bg-deco-panel"
        chamfered={false}
      >
        <div className="absolute top-4 right-14 flex items-center gap-2">
           {indexing && <span className="text-xs font-mono text-deco-gold">{progress.toFixed(0)}%</span>}
           <BakeliteButton onClick={handleIndexBuild} disabled={indexing} className="!p-1" title="Rebuild Index" variant="secondary">
              <RefreshCw size={16} className={indexing ? 'animate-spin' : ''} />
           </BakeliteButton>
        </div>
        <button onClick={() => setSemanticSearchOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-deco-paper"><X size={20}/></button>
      
        <div className="p-4 flex gap-2 border-b border-deco-gold/20">
          <BakeliteInput 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Opisz czego szukasz (np. 'organizacje walczące z sanacją')..."
            className="flex-1"
          />
          <BakeliteButton 
            onClick={handleSearch} 
            disabled={searching}
            icon={searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            variant="primary"
          >
            Szukaj
          </BakeliteButton>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-deco-navy/50">
           {results.map(({ node, score }) => (
              <div key={node.data.id} onClick={() => handleSelect(node.data.id)} className="bg-deco-panel p-3 rounded-sm border border-deco-gold/30 hover:border-deco-gold cursor-pointer group transition-colors clip-chamfer-lg">
                 <div className="flex justify-between items-start">
                    <span className="font-bold text-deco-paper text-sm group-hover:text-deco-gold">{node.data.label}</span>
                    <span className="text-xs font-mono text-deco-green">{(score * 100).toFixed(1)}%</span>
                 </div>
                 <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{node.data.description}</div>
              </div>
           ))}
           {!searching && results.length === 0 && query && (
               <div className="col-span-full text-center text-zinc-600 py-8">
                 {searching ? 'Przetwarzanie wektorów...' : 'Brak wyników.'}
               </div>
           )}
           {!searching && !query && (
               <div className="col-span-full text-center text-zinc-600 py-8 italic opacity-50">
                 Wpisz zapytanie, aby przeszukać bazę wektorową. <br/>
                 <span className="text-xs text-zinc-700">Pamiętaj o odświeżeniu indeksu po dużych zmianach.</span>
               </div>
           )}
        </div>
      </BakeliteCard>
    </div>
  );
};
