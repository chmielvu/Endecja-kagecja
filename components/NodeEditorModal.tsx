import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Save, Trash, Shield, BookOpen } from 'lucide-react';
import { NodeType, SourceCitation, RegionInfo, TemporalFactType } from '../types';
import { BakeliteInput } from './BakeliteInput'; // NEW IMPORT
import { BakeliteButton } from './BakeliteButton'; // NEW IMPORT
import { BakeliteCard } from './BakeliteCard'; // NEW IMPORT

// Helper to parse temporal strings
function parseTemporalInput(input: string): TemporalFactType | undefined {
  if (!input) return undefined;
  const intervalMatch = input.match(/^(\d{4})-(\d{4})$/);
  if (intervalMatch) {
    return { type: 'interval', start: intervalMatch[1], end: intervalMatch[2] };
  }
  const yearMatch = input.match(/^\d{4}$/);
  if (yearMatch) {
    return { type: 'instant', timestamp: input };
  }
  return { type: 'fuzzy', approximate: input };
}

export const NodeEditorModal: React.FC = () => {
  const { graph, editingNodeId, setEditingNode, updateNode, removeNode } = useStore();
  const [formData, setFormData] = useState<any>({});
  const [temporalInput, setTemporalInput] = useState<string>('');
  const [regionInput, setRegionInput] = useState<string>('');


  useEffect(() => {
    if (editingNodeId) {
      const node = graph.nodes.find(n => n.data.id === editingNodeId)?.data;
      if (node) {
        setFormData({
          ...node,
          // Convert SourceCitation[] to string for textarea
          sources: node.sources ? node.sources.map(s => s.uri || s.label).join('\n') : '',
        });
        // Convert TemporalFactType to string for input
        if (node.validity) {
          if (node.validity.type === 'instant') setTemporalInput(node.validity.timestamp);
          if (node.validity.type === 'interval') setTemporalInput(`${node.validity.start}-${node.validity.end}`);
          if (node.validity.type === 'fuzzy') setTemporalInput(node.validity.approximate);
        } else {
          setTemporalInput('');
        }
        // Convert RegionInfo to string for input
        if (node.region) {
          setRegionInput(node.region.label || node.region.id);
        } else {
          setRegionInput('');
        }
      }
    }
  }, [editingNodeId, graph]);

  if (!editingNodeId) return null;

  const handleSave = () => {
    // Convert string back to SourceCitation[]
    const sourcesArray: SourceCitation[] = temporalInput ? 
      formData.sources.split('\n').map((uri: string) => ({ uri: uri.trim(), label: uri.trim() })) : [];

    // Convert string back to RegionInfo
    const regionObj: RegionInfo | undefined = regionInput ? { 
      id: regionInput.toLowerCase().replace(/\s/g, '_'), 
      label: regionInput,
      type: 'historical_region' // Default type
    } : undefined;

    // Convert string back to TemporalFactType
    const validityObj: TemporalFactType | undefined = parseTemporalInput(temporalInput);


    updateNode(editingNodeId, { 
      ...formData, 
      sources: sourcesArray,
      region: regionObj,
      validity: validityObj,
      // Clear legacy fields
      year: undefined,
      dates: undefined
    });
    setEditingNode(null);
  };

  const handleDelete = () => {
    if (confirm("Are you sure?")) {
      removeNode(editingNodeId);
      setEditingNode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <BakeliteCard 
        title={`Edit Node: ${formData.id}`} 
        icon={<Edit2Icon />} 
        className="w-full max-w-lg max-h-[90vh] flex flex-col"
        headerClassName="!bg-deco-panel !rounded-t-xl"
        chamfered={false}
      >
        <button onClick={() => setEditingNode(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-deco-paper"><X size={18}/></button>
        
        <div className="p-6 space-y-4 overflow-y-auto bg-deco-navy/50">
          {/* Top Row: Label */}
          <BakeliteInput
            label="Label"
            value={formData.label || ''} 
            onChange={e => setFormData({...formData, label: e.target.value})}
          />

          {/* Grid: Type & Region */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-400 uppercase">Type</label>
               <select 
                 value={formData.type || 'person'} 
                 onChange={e => setFormData({...formData, type: e.target.value as NodeType})}
                 className="w-full bg-deco-panel border border-deco-gold/30 rounded-sm px-3 py-2 text-sm text-deco-paper focus:border-deco-gold outline-none"
               >
                 <option value="person">Person</option>
                 <option value="organization">Organization</option>
                 <option value="event">Event</option>
                 <option value="concept">Concept</option>
                 <option value="publication">Publication</option>
                 <option value="document">Document</option>
                 <option value="location">Location</option>
               </select>
            </div>
            <BakeliteInput
               label="Region"
               value={regionInput} 
               onChange={e => setRegionInput(e.target.value)}
               placeholder="e.g. Wielkopolska"
            />
          </div>

          {/* Grid: Certainty & Validity */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1">
                 <Shield size={10} /> Certainty
               </label>
               <select 
                 value={formData.certainty || 'confirmed'} 
                 onChange={e => setFormData({...formData, certainty: e.target.value})}
                 className={`w-full bg-deco-panel border border-deco-gold/30 rounded-sm px-3 py-2 text-sm focus:border-deco-gold outline-none font-medium
                   ${formData.certainty === 'disputed' ? 'text-amber-500' : 
                     formData.certainty === 'alleged' ? 'text-red-400' : 
                     formData.certainty === 'hypothesized' ? 'text-blue-400' : 'text-emerald-400'}`}
               >
                 <option value="confirmed">Confirmed</option>
                 <option value="disputed">Disputed</option>
                 <option value="alleged">Alleged</option>
                 <option value="hypothesized">Hypothesized</option>
               </select>
            </div>
            <BakeliteInput
               label="Validity (YYYY or YYYY-YYYY)"
               value={temporalInput} 
               onChange={e => setTemporalInput(e.target.value)}
               placeholder="e.g. 1918-1939 or 1934"
               className="font-mono"
            />
          </div>

          {/* Description */}
          <BakeliteInput
            label="Description"
            multiline
            rows={5}
            value={formData.description || ''} 
            onChange={e => setFormData({...formData, description: e.target.value})}
          />

          {/* Sources */}
          <BakeliteInput
             label="Sources (One URL/Title per line)"
             multiline
             rows={5}
             value={formData.sources || ''} 
             onChange={e => setFormData({...formData, sources: e.target.value})}
             className="font-mono text-xs"
             placeholder="https://example.com/source.html&#10;Author, Title (Year)..."
          />

        </div>

        <div className="p-4 border-t border-deco-gold/20 bg-deco-panel rounded-b-xl flex justify-between shrink-0">
          <BakeliteButton onClick={handleDelete} icon={<Trash size={14} />} variant="danger">
            Delete
          </BakeliteButton>
          <BakeliteButton onClick={handleSave} icon={<Save size={14} />} variant="primary">
            Save Changes
          </BakeliteButton>
        </div>
      </BakeliteCard>
    </div>
  );
};

const Edit2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);