
import React from 'react';
import { useStore } from '../store';
import { Download, FileJson, FileSpreadsheet, Share2 } from 'lucide-react';
import { BakeliteButton } from './BakeliteButton';
import { BakeliteCard } from './BakeliteCard';
import { NodeData, EdgeData, SourceCitation } from '../types';

export const ExportControl: React.FC = () => {
  const { graph } = useStore();

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(graph, null, 2);
    downloadFile(data, `endecja_archive_${Date.now()}.json`, 'application/json');
  };

  const handleExportGEXF = () => {
    const nodeAttributes = [
      { id: "type", title: "Type", type: "string" },
      { id: "description", title: "Description", type: "string" },
      { id: "validity", title: "Validity", type: "string" },
      { id: "region_label", title: "Region", type: "string" },
      { id: "importance", title: "Importance", type: "double" },
      { id: "certainty", title: "Certainty", type: "string" },
      { id: "pagerank", title: "PageRank", type: "double" },
      { id: "louvainCommunity", title: "Community", type: "integer" },
      { id: "degreeCentrality", title: "Degree Centrality", type: "double" },
      { id: "betweenness", title: "Betweenness Centrality", type: "double" },
      { id: "closeness", title: "Closeness Centrality", type: "double" },
      { id: "clustering", title: "Clustering Coefficient", type: "double" },
      { id: "vulnerabilityScore", title: "Vulnerability Score", type: "double" },
      { id: "sources_uri", title: "Sources URI", type: "string" },
    ];

    const edgeAttributes = [
      { id: "relationType", title: "Relation Type", type: "string" },
      { id: "temporal", title: "Temporal", type: "string" },
      { id: "weight", title: "Weight", type: "double" },
      { id: "sign", title: "Sign", type: "string" },
      { id: "certainty", title: "Certainty", type: "string" },
      { id: "sources_uri", title: "Sources URI", type: "string" },
    ];

    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
${nodeAttributes.map(attr => `      <attribute id="${attr.id}" title="${attr.title}" type="${attr.type}"/>`).join('\n')}
    </attributes>
    <attributes class="edge">
${edgeAttributes.map(attr => `      <attribute id="${attr.id}" title="${attr.title}" type="${attr.type}"/>`).join('\n')}
    </attributes>
    <nodes>`;
    
    const nodes = graph.nodes.map(n => {
      const validityStr = n.data.validity ? 
        (n.data.validity.type === 'instant' ? n.data.validity.timestamp : 
         n.data.validity.type === 'interval' ? `${n.data.validity.start}-${n.data.validity.end}` : 
         n.data.validity.approximate) : '';
      const sourcesUri = n.data.sources ? n.data.sources.map(s => s.uri).filter(Boolean).join('; ') : '';

      return `      <node id="${n.data.id}" label="${n.data.label.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
        <attvalues>
          <attvalue for="type" value="${n.data.type}"/>
          <attvalue for="description" value="${(n.data.description || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>
          <attvalue for="validity" value="${validityStr.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>
          <attvalue for="region_label" value="${(n.data.region?.label || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>
          <attvalue for="importance" value="${n.data.importance || 0}"/>
          <attvalue for="certainty" value="${n.data.certainty || 'unknown'}"/>
          <attvalue for="pagerank" value="${n.data.pagerank || 0}"/>
          <attvalue for="louvainCommunity" value="${n.data.louvainCommunity || -1}"/>
          <attvalue for="degreeCentrality" value="${n.data.degreeCentrality || 0}"/>
          <attvalue for="betweenness" value="${n.data.betweenness || 0}"/>
          <attvalue for="closeness" value="${n.data.closeness || 0}"/>
          <attvalue for="clustering" value="${n.data.clustering || 0}"/>
          <attvalue for="vulnerabilityScore" value="${n.data.networkHealth?.vulnerabilityScore || 0}"/>
          <attvalue for="sources_uri" value="${sourcesUri.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>
        </attvalues>
      </node>`;
    }).join('\n');
    
    const edges = `    </nodes>
    <edges>` + graph.edges.map((e, i) => {
      const temporalStr = e.data.temporal ? 
        (e.data.temporal.type === 'instant' ? e.data.temporal.timestamp : 
         e.data.temporal.type === 'interval' ? `${e.data.temporal.start}-${e.data.temporal.end}` : 
         e.data.temporal.approximate) : '';
      const sourcesUri = e.data.sources ? e.data.sources.map(s => s.uri).filter(Boolean).join('; ') : '';

      return `      <edge id="e${e.data.id}" source="${e.data.source}" target="${e.data.target}" label="${(e.data.label || e.data.relationType || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
        <attvalues>
          <attvalue for="relationType" value="${e.data.relationType || 'related_to'}"/>
          <attvalue for="temporal" value="${temporalStr.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>
          <attvalue for="weight" value="${e.data.weight || 1}"/>
          <attvalue for="sign" value="${e.data.sign || 'positive'}"/>
          <attvalue for="certainty" value="${e.data.certainty || 'unknown'}"/>
          <attvalue for="sources_uri" value="${sourcesUri.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"/>
        </attvalues>
      </edge>`;
    }).join('\n');
    
    const footer = `    </edges>
  </graph>
</gexf>`;
    downloadFile(header + nodes + edges + footer, `endecja_graph_${Date.now()}.gexf`, 'text/xml');
  };

  const handleExportCSV = () => {
    const headers = [
      "ID", "Label", "Type", "Description", "Validity", "Region", "Importance", 
      "Certainty", "Confidence Score", "PageRank", "Community", "Degree Centrality", 
      "Betweenness Centrality", "Closeness Centrality", "Clustering Coefficient", "Vulnerability Score", "Sources URI"
    ];
    
    const rows = graph.nodes.map(n => {
      const data = n.data;
      const validityStr = data.validity ? 
        (data.validity.type === 'instant' ? data.validity.timestamp : 
         data.validity.type === 'interval' ? `${data.validity.start}-${data.validity.end}` : 
         data.validity.approximate) : '';
      const sourcesUri = data.sources ? data.sources.map(s => s.uri).filter(Boolean).join('; ') : '';

      return [
        data.id,
        data.label,
        data.type,
        `"${(data.description || '').replace(/"/g, '""')}"`,
        validityStr,
        data.region?.label || '',
        data.importance || 0,
        data.certainty || 'unknown',
        data.confidenceScore || 0,
        data.pagerank || 0,
        data.louvainCommunity || -1,
        data.degreeCentrality || 0,
        data.betweenness || 0,
        data.closeness || 0,
        data.clustering || 0,
        data.networkHealth?.vulnerabilityScore || 0,
        `"${sourcesUri.replace(/"/g, '""')}"`,
      ].map(value => String(value)).join(',');
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    downloadFile(csvContent, `endecja_nodes_${Date.now()}.csv`, 'text/csv');
  };

  return (
    <BakeliteCard title="Archive Export" icon={<Download size={16}/>} className="!bg-transparent !border-none !shadow-none !clip-none">
      <div className="grid grid-cols-2 gap-2">
        <BakeliteButton onClick={handleExportJSON} icon={<FileJson size={16}/>} className="text-xs">
          JSON Backup
        </BakeliteButton>
        <BakeliteButton onClick={handleExportGEXF} icon={<Share2 size={16}/>} className="text-xs">
          Gephi (GEXF)
        </BakeliteButton>
        <BakeliteButton onClick={handleExportCSV} icon={<FileSpreadsheet size={16}/>} className="text-xs">
          CSV (Nodes)
        </BakeliteButton>
      </div>
    </BakeliteCard>
  );
};
