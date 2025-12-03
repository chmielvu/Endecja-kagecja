
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { X, Save, Trash, Plus, Minus, BookOpen, Clock, MapPin, GitCommit } from 'lucide-react';
import { NodeType, SourceCitation, RegionInfo, TemporalFactType, Existence, Role, NodeData } from '../types';
import { BakeliteInput } from './BakeliteInput';
import { BakeliteButton } from './BakeliteButton';
import { BakeliteCard } from './BakeliteCard';
import { v4 as uuidv4 } from 'uuid';

interface TemporalFactTypeEditorState {
  type: 'instant' | 'interval' | 'fuzzy';
  inputTimestamp: string;
  inputStart: string;
  inputEnd: string;
  inputApproximate: string;
}

function parseTemporalInput(state: TemporalFactTypeEditorState): TemporalFactType | undefined {
  if (state.type === 'instant') {
    if (!state.inputTimestamp.trim()) return undefined;
    return { type: 'instant', timestamp: state.inputTimestamp };
  }
  if (state.type === 'interval') {
    if (!state.inputStart.trim() || !state.inputEnd.trim()) return undefined;
    return { type: 'interval', start: state.inputStart, end: state.inputEnd };
  }
  if (state.type === 'fuzzy') {
    if (!state.inputApproximate.trim()) return undefined;
    return { type: 'fuzzy', approximate: state.inputApproximate };
  }
  return undefined;
}

const formatTemporalFact = (temporal?: TemporalFactType): TemporalFactTypeEditorState => {
  if (!temporal) return { type: 'instant', inputTimestamp: '', inputStart: '', inputEnd: '', inputApproximate: '' };
  switch (temporal.type) {
    case 'instant': return { type: 'instant', inputTimestamp: temporal.timestamp, inputStart: '', inputEnd: '', inputApproximate: '' };
    case 'interval': return { type: 'interval', inputTimestamp: '', inputStart: temporal.start, inputEnd: temporal.end, inputApproximate: '' };
    case 'fuzzy': return { type: 'fuzzy', inputTimestamp: '', inputStart: '', inputEnd: '', inputApproximate: temporal.approximate };
    default: return { type: 'instant', inputTimestamp: '', inputStart: '', inputEnd: '', inputApproximate: '' };
  }
};

export const NodeEditorModal: React.FC = () => {
  const { graph, editingNodeId, setEditingNode, updateNode, removeNode, addToast } = useStore();
  const [formData, setFormData] = useState<Partial<NodeData>>({});
  
  const [temporalState, setTemporalState] = useState<TemporalFactTypeEditorState>(formatTemporalFact());
  const [regionLabel, setRegionLabel] = useState<string>('');
  const [sources, setSources] = useState<Array<SourceCitation & { _tempId: string }>>([]); 
  const [existence, setExistence] = useState<Array<Existence & { _tempId: string }>>([]); 
  const [roles, setRoles] = useState<Array<Role & { _tempId: string }>>([]); 

  useEffect(() => {
    if (editingNodeId) {
      const node = graph.nodes.find(n => n.data.id === editingNodeId)?.data;
      if (node) {
        setFormData({ ...node });
        setTemporalState(formatTemporalFact(node.validity));
        setRegionLabel(node.region?.label || '');
        setSources((node.sources || []).map(s => ({ ...s, _tempId: uuidv4() })));
        setExistence((node.existence || []).map(e => ({ ...e, _tempId: uuidv4() })));
        setRoles((node.roles || []).map(r => ({ ...r, _tempId: uuidv4() })));
      }
    }
  }, [editingNodeId, graph]);

  if (!editingNodeId) return null;

  const handleSave = () => {
    if (!formData.label || !formData.type) {
      addToast({ title: 'Validation Error', description: 'Label and Type are required.', type: 'error' });
      return;
    }

    const validityObj = parseTemporalInput(temporalState);
    const regionObj: RegionInfo | undefined = regionLabel ? { 
      id: regionLabel.toLowerCase().replace(/\s/g, '_'), 
      label: regionLabel,
      type: 'historical_region'
    } : undefined;

    const validatedSources = sources.filter(s => s.uri?.trim() || s.label?.trim());
    const validatedExistence = existence.filter(e => e.start?.trim() && e.status?.trim());
    const validatedRoles = roles.filter(r => r.role?.trim() && r.start?.trim());

    updateNode(editingNodeId, { 
      ...formData, 
      sources: validatedSources,
      region: regionObj,
      validity: validityObj,
      existence: validatedExistence,
      roles: validatedRoles,
      year: undefined,
      dates: undefined
    });
    setEditingNode(null);
    addToast({ title: 'Node Updated', description: `Changes saved for '${formData.label}'.`, type: 'success' });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this node?")) {
      removeNode(editingNodeId);
      setEditingNode(null);
      addToast({ title: 'Node Deleted', description: `Removed '${formData.label}'.`, type: 'info' });
    }
  };

  // List Handlers
  const addSource = () => setSources(prev => [...prev, { uri: '', label: '', type: 'website', _tempId: uuidv4() }]);
  const updateSource = (id: string, field: keyof SourceCitation, value: string) => setSources(prev => prev.map(s => s._tempId === id ? { ...s, [field]: value } : s));
  const removeSource = (id: string) => setSources(prev => prev.filter(s => s._tempId !== id));

  const addExistenceItem = () => setExistence(prev => [...prev, { start: '', end: '', status: 'active', context: '', _tempId: uuidv4() }]);
  const updateExistence = (id: string, field: keyof Existence, value: any) => setExistence(prev => prev.map(e => e._tempId === id ? { ...e, [field]: value } : e));
  const removeExistence = (id: string) => setExistence(prev => prev.filter(e => e._tempId !== id));

  const addRole = () => setRoles(prev => [...prev, { role: '', organization: '', start: '', end: '', context: '', _tempId: uuidv4() }]);
  const updateRole = (id: string, field: keyof Role, value: any) => setRoles(prev => prev.map(r => r._tempId === id ? { ...r, [field]: value } : r));
  const removeRole = (id: string) => setRoles(prev => prev.filter(r => r._tempId !== id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <BakeliteCard 
        title={`Edit Node: ${formData.label || editingNodeId}`} 
        icon={<GitCommit size={16} />} 
        className="w-full max-w-lg max-h-[90vh] flex flex-col"
        headerClassName="!bg-deco-panel !rounded-t-xl"
        chamfered={false}
      >
        <button onClick={() => setEditingNode(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-deco-paper"><X size={18}/></button>
        
        <div className="p-6 space-y-6 overflow-y-auto bg-deco-navy/50 flex-1">
          <BakeliteInput label="Label" value={formData.label || ''} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="e.g. Roman Dmowski" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-400 uppercase">Type</label>
               <select value={formData.type || 'person'} onChange={e => setFormData({...formData, type: e.target.value as NodeType})} className="w-full bg-deco-panel border border-deco-gold/30 rounded-sm px-3 py-2 text-sm text-deco-paper focus:border-deco-gold outline-none">
                 <option value="person">Person</option>
                 <option value="organization">Organization</option>
                 <option value="event">Event</option>
                 <option value="concept">Concept</option>
                 <option value="publication">Publication</option>
                 <option value="document">Document</option>
                 <option value="location">Location</option>
               </select>
            </div>
            <BakeliteInput label="Region Label" icon={<MapPin size={14}/>} value={regionLabel} onChange={e => setRegionLabel(e.target.value)} placeholder="Region" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-400 uppercase">Certainty</label>
               <select value={formData.certainty || 'confirmed'} onChange={e => setFormData({...formData, certainty: e.target.value as any})} className="w-full bg-deco-panel border border-deco-gold/30 rounded-sm px-3 py-2 text-sm text-deco-paper focus:border-deco-gold outline-none">
                 <option value="confirmed">Confirmed</option>
                 <option value="disputed">Disputed</option>
                 <option value="alleged">Alleged</option>
                 <option value="hypothesized">Hypothesized</option>
               </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1"><Clock size={14}/> Validity</label>
              <div className="flex flex-col gap-1">
                <select value={temporalState.type} onChange={e => setTemporalState({ ...formatTemporalFact(), type: e.target.value as any })} className="bg-deco-panel border border-deco-gold/30 rounded-sm px-2 py-1 text-xs text-deco-paper">
                  <option value="instant">Instant</option>
                  <option value="interval">Interval</option>
                  <option value="fuzzy">Fuzzy</option>
                </select>
                {temporalState.type === 'instant' && <BakeliteInput value={temporalState.inputTimestamp} onChange={e => setTemporalState(prev => ({ ...prev, inputTimestamp: e.target.value }))} placeholder="YYYY-MM-DD" className="text-xs font-mono"/>}
                {temporalState.type === 'interval' && (
                  <div className="flex gap-1">
                    <BakeliteInput value={temporalState.inputStart} onChange={e => setTemporalState(prev => ({ ...prev, inputStart: e.target.value }))} placeholder="Start" className="text-xs font-mono"/>
                    <BakeliteInput value={temporalState.inputEnd} onChange={e => setTemporalState(prev => ({ ...prev, inputEnd: e.target.value }))} placeholder="End" className="text-xs font-mono"/>
                  </div>
                )}
                {temporalState.type === 'fuzzy' && <BakeliteInput value={temporalState.inputApproximate} onChange={e => setTemporalState(prev => ({ ...prev, inputApproximate: e.target.value }))} placeholder="e.g. Early 20th C." className="text-xs"/>}
              </div>
            </div>
          </div>

          <BakeliteInput label="Description" multiline rows={5} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Context..." />

          {/* Dynamic Forms for Existence/Roles/Sources */}
          <div className="space-y-4">
            {/* Existence History (Orgs) */}
            {['organization', 'event'].includes(formData.type as string) && (
              <BakeliteCard title="Existence Timeline" icon={<Clock size={14}/>} className="!bg-deco-navy/30 !shadow-none" headerClassName="!p-2" bodyClassName="!p-2">
                 {existence.map(e => (
                   <div key={e._tempId} className="flex gap-1 mb-2">
                      <BakeliteInput value={e.start} onChange={evt => updateExistence(e._tempId, 'start', evt.target.value)} placeholder="Start" className="w-16 text-xs !p-1"/>
                      <BakeliteInput value={e.end || ''} onChange={evt => updateExistence(e._tempId, 'end', evt.target.value)} placeholder="End" className="w-16 text-xs !p-1"/>
                      <select value={e.status} onChange={evt => updateExistence(e._tempId, 'status', evt.target.value)} className="bg-deco-panel border border-deco-gold/30 text-[10px] rounded px-1 w-20">
                         <option value="active">Active</option>
                         <option value="formed">Formed</option>
                         <option value="defunct">Defunct</option>
                      </select>
                      <BakeliteButton onClick={() => removeExistence(e._tempId)} variant="danger" className="!p-1"><Minus size={10}/></BakeliteButton>
                   </div>
                 ))}
                 <BakeliteButton onClick={addExistenceItem} variant="secondary" className="w-full text-xs !py-1"><Plus size={10}/> Add Period</BakeliteButton>
              </BakeliteCard>
            )}

            {/* Roles (Person) */}
            {formData.type === 'person' && (
              <BakeliteCard title="Roles" icon={<BookOpen size={14}/>} className="!bg-deco-navy/30 !shadow-none" headerClassName="!p-2" bodyClassName="!p-2">
                 {roles.map(r => (
                   <div key={r._tempId} className="flex gap-1 mb-2">
                      <BakeliteInput value={r.role} onChange={evt => updateRole(r._tempId, 'role', evt.target.value)} placeholder="Role" className="flex-1 text-xs !p-1"/>
                      <BakeliteInput value={r.organization || ''} onChange={evt => updateRole(r._tempId, 'organization', evt.target.value)} placeholder="Org ID" className="w-20 text-xs !p-1"/>
                      <BakeliteButton onClick={() => removeRole(r._tempId)} variant="danger" className="!p-1"><Minus size={10}/></BakeliteButton>
                   </div>
                 ))}
                 <BakeliteButton onClick={addRole} variant="secondary" className="w-full text-xs !py-1"><Plus size={10}/> Add Role</BakeliteButton>
              </BakeliteCard>
            )}

            {/* Sources */}
            <BakeliteCard title="Sources" icon={<BookOpen size={14}/>} className="!bg-deco-navy/30 !shadow-none" headerClassName="!p-2" bodyClassName="!p-2">
                {sources.map(s => (
                  <div key={s._tempId} className="flex flex-col gap-1 mb-2 border-b border-deco-gold/10 pb-2">
                     <div className="flex gap-1">
                       <BakeliteInput value={s.label || ''} onChange={evt => updateSource(s._tempId, 'label', evt.target.value)} placeholder="Title/Label" className="flex-1 text-xs !p-1"/>
                       <BakeliteButton onClick={() => removeSource(s._tempId)} variant="danger" className="!p-1"><Minus size={10}/></BakeliteButton>
                     </div>
                     <BakeliteInput value={s.uri} onChange={evt => updateSource(s._tempId, 'uri', evt.target.value)} placeholder="URI/URL" className="w-full text-xs !p-1 font-mono"/>
                  </div>
                ))}
                <BakeliteButton onClick={addSource} variant="secondary" className="w-full text-xs !py-1"><Plus size={10}/> Add Source</BakeliteButton>
            </BakeliteCard>
          </div>
        </div>

        <div className="p-4 border-t border-deco-gold/20 bg-deco-panel rounded-b-xl flex justify-between shrink-0">
          <BakeliteButton onClick={handleDelete} icon={<Trash size={14} />} variant="danger">Delete</BakeliteButton>
          <BakeliteButton onClick={handleSave} icon={<Save size={14} />} variant="primary">Save Changes</BakeliteButton>
        </div>
      </BakeliteCard>
    </div>
  );
};
