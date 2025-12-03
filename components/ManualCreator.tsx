
import React, { useState } from 'react';
import { useStore } from '../store';
import { Link, UserPlus, PlusCircle } from 'lucide-react';
import { BakeliteButton } from './BakeliteButton';
import { BakeliteInput } from './BakeliteInput';
import { NodeType, TemporalFactType } from '../types';
import { BakeliteCard } from './BakeliteCard';

export const ManualCreator: React.FC = () => {
  const { addNodesAndEdges, graph, addToast } = useStore();
  const [mode, setMode] = useState<'node' | 'edge'>('node');
  
  // Node State
  const [label, setLabel] = useState('');
  const [type, setType] = useState<NodeType>('person');
  
  // Edge State
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relation, setRelation] = useState('related_to');

  const handleCreateNode = () => {
    if (!label.trim()) {
      addToast({ title: 'Input Required', description: 'Please provide a label for the new entity.', type: 'warning' });
      return;
    }
    const id = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (graph.nodes.some(n => n.data.id === id)) {
      addToast({ title: 'Duplicate ID', description: `An entity with ID '${id}' already exists.`, type: 'error' });
      return;
    }

    addNodesAndEdges([{ 
      id, 
      label, 
      type, 
      certainty: 'confirmed', 
      validity: { type: 'instant', timestamp: '1926' } as TemporalFactType // Default to Coup year
    }], []);
    setLabel('');
    addToast({ title: 'Entity Added', description: `Added '${label}' to the graph.`, type: 'success' });
  };

  const handleCreateEdge = () => {
    if (!sourceId || !targetId || !relation.trim()) {
      addToast({ title: 'Input Required', description: 'Please select source, target, and provide a relation.', type: 'warning' });
      return;
    }
    if (sourceId === targetId) {
      addToast({ title: 'Invalid Link', description: 'Cannot link an entity to itself.', type: 'error' });
      return;
    }
    if (graph.edges.some(e => e.data.source === sourceId && e.data.target === targetId && e.data.relationType === relation)) {
      addToast({ title: 'Duplicate Link', description: 'This exact relationship already exists.', type: 'error' });
      return;
    }

    addNodesAndEdges([], [{
      id: `man_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      source: sourceId,
      target: targetId,
      relationType: relation as any,
      certainty: 'confirmed',
      temporal: { type: 'instant', timestamp: String(new Date().getFullYear()) } as TemporalFactType // Default to current year
    }]);
    setSourceId('');
    setTargetId('');
    setRelation('related_to');
    addToast({ title: 'Link Established', description: `Connected ${graph.nodes.find(n=>n.data.id===sourceId)?.data.label} to ${graph.nodes.find(n=>n.data.id===targetId)?.data.label}.`, type: 'success' });
  };

  return (
    <BakeliteCard title="Manual Intervention" icon={<PlusCircle size={16}/>} bodyClassName="!p-0" className="!bg-deco-panel/50 !border-deco-gold/30 !shadow-none !clip-none mt-auto">
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <BakeliteButton onClick={() => setMode('node')} variant={mode === 'node' ? 'primary' : 'secondary'} className="flex-1 text-xs">
            <UserPlus size={14} /> New Entity
          </BakeliteButton>
          <BakeliteButton onClick={() => setMode('edge')} variant={mode === 'edge' ? 'primary' : 'secondary'} className="flex-1 text-xs">
            <Link size={14} /> Connect
          </BakeliteButton>
        </div>

        {mode === 'node' ? (
          <div className="space-y-2 animate-in fade-in">
            <BakeliteInput label="Entity Label" value={label} onChange={e => setLabel(e.target.value)} placeholder="Name (e.g. Stanisław Piasecki)" />
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as NodeType)}
                className="w-full bg-deco-navy border border-deco-gold/30 text-deco-paper text-xs p-2 rounded-sm focus:outline-none focus:border-deco-gold"
              >
                <option value="person">Person</option>
                <option value="organization">Organization</option>
                <option value="publication">Publication</option>
                <option value="event">Event</option>
                <option value="concept">Concept</option>
                <option value="document">Document</option>
                <option value="location">Location</option>
              </select>
            </div>
            <BakeliteButton onClick={handleCreateNode} className="w-full">Add to Graph</BakeliteButton>
          </div>
        ) : (
          <div className="space-y-2 animate-in fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Source</label>
                <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-full bg-deco-navy border border-deco-gold/30 text-deco-paper text-xs p-2 rounded-sm focus:outline-none focus:border-deco-gold">
                  <option value="">Select Source...</option>
                  {graph.nodes.map(n => <option key={n.data.id} value={n.data.id}>{n.data.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Target</label>
                <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-deco-navy border border-deco-gold/30 text-deco-paper text-xs p-2 rounded-sm focus:outline-none focus:border-deco-gold">
                  <option value="">Select Target...</option>
                  {graph.nodes.map(n => <option key={n.data.id} value={n.data.id}>{n.data.label}</option>)}
                </select>
              </div>
            </div>
            <BakeliteInput label="Relation Type" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. member_of" />
            <BakeliteButton onClick={handleCreateEdge} className="w-full">Establish Link</BakeliteButton>
          </div>
        )}
      </div>
    </BakeliteCard>
  );
};