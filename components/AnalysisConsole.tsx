
// path: src/components/AnalysisConsole.tsx
import React from 'react';
import { useStore } from '../store';
import { X, Terminal, Cpu, Share2, Layers, Users } from 'lucide-react';
import { BakeliteCard } from './BakeliteCard'; // NEW IMPORT
import { BakeliteButton } from './BakeliteButton'; // NEW IMPORT

export const AnalysisConsole: React.FC = () => {
  const { analysisResult, isAnalysisOpen, setAnalysisOpen } = useStore();

  if (!isAnalysisOpen || !analysisResult) return null;

  const { global_metrics, community_structure, key_influencers, strategic_commentary } = analysisResult;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <BakeliteCard
        title="NetworkX Analysis Report"
        icon={<Terminal size={20} />}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
        headerClassName="!bg-deco-panel/90 !rounded-t-lg"
        chamfered={false}
      >
        <button onClick={() => setAnalysisOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-deco-paper transition-colors">
          <X size={24} />
        </button>
        <p className="text-[10px] font-mono text-zinc-500 absolute top-10 left-16">Python NetworkX Runtime Environment</p>

        {/* Dashboard Grid */}
        <div className="p-6 overflow-y-auto bg-deco-navy/40 space-y-6">
          
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
              icon={<Share2 size={18}/>} 
              label="Network Density" 
              value={global_metrics.density.toFixed(4)} 
              sub="Connectivity Saturation"
            />
            <MetricCard 
              icon={<Layers size={18}/>} 
              label="Clustering (Transitivity)" 
              value={global_metrics.transitivity.toFixed(4)} 
              sub="Local Cohesion"
            />
            <MetricCard 
              icon={<Users size={18}/>} 
              label="Detected Factions" 
              value={community_structure.num_communities} 
              sub={`Modularity: ${community_structure.modularity?.toFixed(3) || 'N/A'}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            
            {/* Key Figures Column */}
            <BakeliteCard className="p-4" chamfered={false}>
              <h3 className="text-xs font-bold text-deco-gold uppercase mb-4 flex items-center gap-2">
                <Cpu size={14}/> Influence Leaders (PageRank)
              </h3>
              <div className="space-y-3">
                {key_influencers.map((inf, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 font-mono text-xs">0{i+1}</span>
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-deco-paper transition-colors">{inf.label}</span>
                    </div>
                    <div className="h-1 w-20 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-deco-gold" style={{ width: `${inf.score * 500}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </BakeliteCard>

            {/* Dmowski Commentary (Wide) */}
            <BakeliteCard className="lg:col-span-2 p-6 relative overflow-hidden" chamfered={false}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Terminal size={100} className="text-deco-gold" />
              </div>
              <h3 className="text-sm font-bold text-deco-paper font-spectral uppercase mb-3 border-b border-deco-paper/20 pb-2">
                Strategiczny Komentarz (1934)
              </h3>
              <p className="font-serif text-lg leading-relaxed text-deco-paper/90 italic">
                "{strategic_commentary}"
              </p>
            </BakeliteCard>
          </div>

        </div>
      </BakeliteCard>
    </div>
  );
};

const MetricCard = ({ icon, label, value, sub }: any) => (
  <BakeliteCard className="p-4 flex flex-col items-center text-center" chamfered={false}>
    <div className="mb-2 text-deco-gold">{icon}</div>
    <div className="text-2xl font-mono font-bold text-deco-paper mb-1">{value}</div>
    <div className="text-xs font-bold text-zinc-400 uppercase">{label}</div>
    <div className="text-[10px] text-zinc-600 mt-1">{sub}</div>
  </BakeliteCard>
);
