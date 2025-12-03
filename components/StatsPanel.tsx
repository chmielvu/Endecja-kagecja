import React from 'react';
import { useStore } from '../store';
import { X, Activity, Globe, Share2, Layers } from 'lucide-react';
import { BakeliteCard } from './BakeliteCard'; // NEW IMPORT
import { BakeliteButton } from './BakeliteButton'; // NEW IMPORT

export const StatsPanel: React.FC = () => {
  const { graph, showStatsPanel, setShowStatsPanel } = useStore();

  if (!showStatsPanel) return null;

  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  
  // Use new meta structure, fallback to old or calculated
  const globalMetrics = graph.meta?.globalMetrics;
  const communityStructure = graph.meta?.communityStructure;

  const density = globalMetrics?.density !== undefined ? globalMetrics.density : 
                  (nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0);
  const transitivity = globalMetrics?.transitivity !== undefined ? globalMetrics.transitivity : 0;
  const numComponents = globalMetrics?.number_connected_components !== undefined ? globalMetrics.number_connected_components : 0;
  
  const modularity = communityStructure?.modularity !== undefined ? communityStructure.modularity : 
                     (graph.meta?.modularity || 0); // Fallback to legacy
  const numCommunities = communityStructure?.num_communities !== undefined ? communityStructure.num_communities : 0;
  
  const avgDegree = (nodeCount > 0 ? (2 * edgeCount / nodeCount) : 0).toFixed(2);
  const globalBalance = ((graph.meta?.globalBalance || 0) * 100).toFixed(1);

  // Top Nodes by PageRank from either new meta or existing node data
  const topNodes = [...graph.nodes]
    .sort((a, b) => (b.data.pagerank || 0) - (a.data.pagerank || 0))
    .slice(0, 5);
  
  // Top Influencers from Python analysis
  const keyInfluencers = graph.meta?.keyInfluencers || [];


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <BakeliteCard 
        title="Graph Intelligence Dashboard" 
        icon={<Activity className="text-deco-green" size={20} />} 
        className="w-full max-w-3xl"
        headerClassName="!bg-deco-panel !rounded-t-xl"
        chamfered={false}
      >
        <button onClick={() => setShowStatsPanel(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-deco-paper"><X size={20}/></button>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-deco-navy/50">
           <StatCard icon={<Globe size={16} />} label="Nodes" value={nodeCount} sub="Total Entities" />
           <StatCard icon={<Share2 size={16} />} label="Edges" value={edgeCount} sub="Connections" />
           <StatCard icon={<Layers size={16} />} label="Modularity" value={modularity.toFixed(3)} sub={`Factions: ${numCommunities}`} />
           <StatCard icon={<Activity size={16} />} label="Balance" value={`${globalBalance}%`} sub="Triadic Consistency" color="text-deco-green" />
        </div>

        <div className="p-6 border-t border-deco-gold/10 grid grid-cols-2 gap-8 bg-deco-navy/50">
           <div>
             <h4 className="text-xs font-bold text-deco-gold uppercase mb-4">Network Topology</h4>
             <div className="space-y-2 text-sm text-zinc-300">
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Density</span> <span className="font-mono text-zinc-400">{density.toFixed(4)}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Transitivity</span> <span className="font-mono text-zinc-400">{transitivity.toFixed(4)}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Avg Degree</span> <span className="font-mono text-zinc-400">{avgDegree}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-800 pb-1">
                 <span>Components</span> <span className="font-mono text-zinc-400">{numComponents}</span>
               </div>
             </div>
           </div>

           <div>
             <h4 className="text-xs font-bold text-deco-gold uppercase mb-4">Key Influencers (PageRank)</h4>
             <div className="space-y-2">
               {keyInfluencers.length > 0 ? keyInfluencers.map((n, i) => (
                 <div key={n.id} className="flex items-center gap-2">
                   <span className="text-xs font-mono text-zinc-600 w-4">{i+1}.</span>
                   <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                     <div className="h-full bg-deco-green" style={{ width: `${(n.score || 0) * 1000}%` }}></div>
                   </div>
                   <span className="text-xs text-deco-paper truncate w-24">{n.label}</span>
                 </div>
               )) : topNodes.map((n, i) => ( // Fallback to client-side pagerank if no Python analysis
                 <div key={n.data.id} className="flex items-center gap-2">
                   <span className="text-xs font-mono text-zinc-600 w-4">{i+1}.</span>
                   <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                     <div className="h-full bg-deco-green" style={{ width: `${(n.data.pagerank || 0) * 1000}%` }}></div>
                   </div>
                   <span className="text-xs text-deco-paper truncate w-24">{n.data.label}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </BakeliteCard>
    </div>
  );
};

const StatCard: React.FC<any> = ({ icon, label, value, sub, color = "text-deco-paper" }) => (
  <div className="bg-deco-panel border border-deco-gold/30 p-4 rounded-lg">
    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold mb-2">
      {icon} {label}
    </div>
    <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
    <div className="text-xs text-zinc-600 mt-1">{sub}</div>
  </div>
);