
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Save, Trash, Shield } from 'lucide-react'; // Removed BookOpen icon as it's not directly used
import { NodeType, SourceCitation, RegionInfo, TemporalFactType } from '../types';
import { BakeliteInput } from './BakeliteInput';
import { BakeliteButton } from './BakeliteButton';
import { BakeliteCard } from './BakeliteCard';

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
  const [existenceInput, setExistenceInput] = useState<string>('');
  const [rolesInput, setRolesInput] = useState<string>('');


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
        // Convert existence array to string for textarea
        if (node.existence && node.existence.length > 0) {
          setExistenceInput(node.existence.map(e => `${e.start}-${e.end || ''}:${e.status}${e.context ? ` (${e.context})` : ''}`).join('\n'));
        } else {
          setExistenceInput('');
        }
        // Convert roles array to string for textarea
        if (node.roles && node.roles.length > 0) {
          setRolesInput(node.roles.map(r => `${r.role}${r.organization ? ` in ${r.organization}` : ''}:${r.start}-${r.end || ''}`).join('\n'));
        } else {
          setRolesInput('');
        }
      }
    }
  }, [editingNodeId, graph]);

  if (!editingNodeId) return null;

  const handleSave = () => {
    // Convert string back to SourceCitation[]
    const sourcesArray: SourceCitation[] = formData.sources ? 
      formData.sources.split('\n').map((uri: string) => ({ uri: uri.trim(), label: uri.trim() })) : [];

    // Convert string back to RegionInfo
    const regionObj: RegionInfo | undefined = regionInput ? { 
      id: regionInput.toLowerCase().replace(/\s/g, '_'), 
      label: regionInput,
      type: 'historical_region' // Default type
    } : undefined;

    // Convert string back to TemporalFactType
    const validityObj: TemporalFactType | undefined = parseTemporalInput(temporalInput);

    // Convert existence string back to array
    const existenceArray = existenceInput ? existenceInput.split('\n').map(line => {
      const parts = line.split(':');
      const dates = parts[0]?.split('-');
      const statusContext = parts[1]?.trim().match(/^(\w+)(?:\s*\((.*)\))?$/);
      return {
        start: dates[0]?.trim(),
        end: dates[1]?.trim() || undefined,
        status: (statusContext?.[1]?.trim() || 'active') as any, // Cast to any because it's a union type
        context: statusContext?.[2]?.trim() || undefined
      };
    }).filter(e => e.start) : undefined;

    // Convert roles string back to array
    const rolesArray = rolesInput ? rolesInput.split('\n').map(line => {
      const roleOrg = line.split(':')[0]?.trim();
      const dates = line.split(':')[1]?.split('-');
      const roleMatch = roleOrg?.match(/^(.+?)(?:\s*in\s*(.+))?$/);
      return {
        role: roleMatch?.[1]?.trim(),
        organization: roleMatch?.[2]?.trim() || undefined,
        start: dates?.[0]?.trim(),
        end: dates?.[1]?.trim() || undefined,
      };
    }).filter(r => r.role) : undefined;


    updateNode(editingNodeId, { 
      ...formData, 
      sources: sourcesArray,
      region: regionObj,
      validity: validityObj,
      existence: existenceArray,
      roles: rolesArray,
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

          {/* Existence (for Orgs/Events) */}
          {['organization', 'event'].includes(formData.type) && (
            <BakeliteInput
              label="Existence (YYYY-YYYY:Status (Context), one per line)"
              multiline
              rows={3}
              value={existenceInput}
              onChange={e => setExistenceInput(e.target.value)}
              placeholder="e.g. 1918-1939:Active (Post-WW1)&#10;1940-:Defunct (WW2)"
              className="font-mono text-xs"
            />
          )}

          {/* Roles (for Persons) */}
          {formData.type === 'person' && (
            <BakeliteInput
              label="Roles (Role in Org:YYYY-YYYY, one per line)"
              multiline
              rows={3}
              value={rolesInput}
              onChange={e => setRolesInput(e.target.value)}
              placeholder="e.g. Leader in Liga Narodowa:1900-1920&#10;Editor of Goniec Warszawski:1905-1910"
              className="font-mono text-xs"
            />
          )}


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
