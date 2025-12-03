// path: src/components/AnalysisConsole.tsx
import React from 'react';
import { useStore } from '../store';
import { X, Terminal, Cpu, Share2, Layers, Users } from 'lucide-react';

export const AnalysisConsole: React.FC = () => {
  const { analysisResult, isAnalysisOpen, setAnalysisOpen } = useStore();

  if (!isAnalysisOpen || !analysisResult) return null;

  const { global_metrics, community_structure, key_influencers, strategic_commentary } = analysisResult;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-zinc-950 border border-[#b45309] rounded-lg shadow-[0_0_50px_rgba(180,83,9,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-zinc-900/90 p-4 border-b border-[#b45309]/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#b45309]/10 rounded text-[#b45309] border border-[#b45309]/30">
              <Terminal size={20} />
            </div>
            <div>
              <h2 className="text-lg font-spectral font-bold text-[#e5e5c0] tracking-wider uppercase">
                Sztab Generalny <span className="text-[#b45309]">:: Intelligence</span>
              </h2>
              <p className="text-[10px] font-mono text-zinc-500">Python NetworkX Runtime Environment</p>
            </div>
          </div>
          <button onClick={() => setAnalysisOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="p-6 overflow-y-auto bg-black/40 space-y-6">
          
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
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
              <h3 className="text-xs font-bold text-[#b45309] uppercase mb-4 flex items-center gap-2">
                <Cpu size={14}/> Centers of Gravity (PageRank)
              </h3>
              <div className="space-y-3">
                {key_influencers.map((inf, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 font-mono text-xs">0{i+1}</span>
                      <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{inf.label}</span>
                    </div>
                    <div className="h-1 w-20 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#b45309]" style={{ width: `${inf.score * 500}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dmowski Commentary (Wide) */}
            <div className="lg:col-span-2 bg-[#1e3a25]/20 border border-[#1e3a25]/50 rounded p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Terminal size={100} />
              </div>
              <h3 className="text-sm font-bold text-[#e5e5c0] font-spectral uppercase mb-3 border-b border-[#e5e5c0]/20 pb-2">
                Strategiczny Komentarz (1934)
              </h3>
              <p className="font-serif text-lg leading-relaxed text-[#c0c0a0] italic">
                "{strategic_commentary}"
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, sub }: any) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded flex flex-col items-center text-center hover:border-[#b45309]/50 transition-colors">
    <div className="mb-2 text-[#b45309]">{icon}</div>
    <div className="text-2xl font-mono font-bold text-white mb-1">{value}</div>
    <div className="text-xs font-bold text-zinc-400 uppercase">{label}</div>
    <div className="text-[10px] text-zinc-600 mt-1">{sub}</div>
  </div>
);