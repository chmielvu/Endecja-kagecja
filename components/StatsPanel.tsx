import React from 'react';
import { useStore } from '../store';
import { X, Activity, Globe, Share2, Layers } from 'lucide-react';

export const StatsPanel: React.FC = () => {
  const { graph, showStatsPanel, setShowStatsPanel } = useStore();

  if (!showStatsPanel) return null;

  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  const density = (2 * edgeCount) / (nodeCount * (nodeCount - 1));
  const avgDegree = (2 * edgeCount / nodeCount).toFixed(2);
  const globalBalance = ((graph.meta?.globalBalance || 0) * 100).toFixed(1);

  // Top Nodes by PageRank
  const topNodes = [...graph.nodes]
    .sort((a, b) => (b.data.pagerank || 0) - (a.data.pagerank || 0))
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-[#b45309]/30 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col">
        <div className="p-4 border-b border-[#b45309]/20 flex justify-between items-center">
           <h3 className="text-lg font-bold text-white flex items-center gap-2 font-spectral">
             <Activity className="text-[#355e3b]" size={20} /> Graph Intelligence Dashboard
           </h3>
           <button onClick={() => setShowStatsPanel(false)} className="text-zinc-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatCard icon={<Globe size={16} />} label="Nodes" value={nodeCount} sub="Total Entities" />
           <StatCard icon={<Share2 size={16} />} label="Edges" value={edgeCount} sub="Connections" />
           <StatCard icon={<Layers size={16} />} label="Modularity" value={(graph.meta?.modularity || 0).toFixed(3)} sub="Community Structure" />
           <StatCard icon={<Activity size={16} />} label="Balance" value={`${globalBalance}%`} sub="Triadic Consistency" color="text-[#355e3b]" />
        </div>

        <div className="p-6 border-t border-[#b45309]/10 grid grid-cols-2 gap-8">
           <div>
             <h4 className="text-xs font-bold text-[#b45309] uppercase mb-4">Network Topology</h4>
             <div className="space-y-2 text-sm text-zinc-300">
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Density</span> <span className="font-mono text-zinc-400">{density.toFixed(4)}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Avg Degree</span> <span className="font-mono text-zinc-400">{avgDegree}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Components</span> <span className="font-mono text-zinc-400">1 (Main)</span>
               </div>
             </div>
           </div>

           <div>
             <h4 className="text-xs font-bold text-[#b45309] uppercase mb-4">Key Influencers (PageRank)</h4>
             <div className="space-y-2">
               {topNodes.map((n, i) => (
                 <div key={n.data.id} className="flex items-center gap-2">
                   <span className="text-xs font-mono text-zinc-600 w-4">{i+1}.</span>
                   <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                     <div className="h-full bg-[#355e3b]" style={{ width: `${(n.data.pagerank || 0) * 1000}%` }}></div>
                   </div>
                   <span className="text-xs text-white truncate w-24">{n.data.label}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<any> = ({ icon, label, value, sub, color = "text-white" }) => (
  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold mb-2">
      {icon} {label}
    </div>
    <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
    <div className="text-xs text-zinc-600 mt-1">{sub}</div>
  </div>
);