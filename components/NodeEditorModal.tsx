import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Save, Trash, Shield, BookOpen } from 'lucide-react';

export const NodeEditorModal: React.FC = () => {
  const { graph, editingNodeId, setEditingNode, updateNode, removeNode } = useStore();
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (editingNodeId) {
      const node = graph.nodes.find(n => n.data.id === editingNodeId)?.data;
      if (node) {
        setFormData({
          ...node,
          // Convert array to string for textarea
          sources: Array.isArray(node.sources) ? node.sources.join('\n') : (node.sources || '')
        });
      }
    }
  }, [editingNodeId, graph]);

  if (!editingNodeId) return null;

  const handleSave = () => {
    // Convert string back to array
    const sourcesArray = typeof formData.sources === 'string'
      ? formData.sources.split('\n').map((s: string) => s.trim()).filter((s: string) => s !== '')
      : formData.sources;

    updateNode(editingNodeId, { ...formData, sources: sourcesArray });
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
      <div className="bg-zinc-900 border border-[#b45309]/30 rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        <div className="p-4 border-b border-[#b45309]/20 flex justify-between items-center bg-zinc-850 rounded-t-xl shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-spectral">
            <Edit2Icon /> Edit Node: <span className="font-mono text-[#b45309]">{formData.id}</span>
          </h3>
          <button onClick={() => setEditingNode(null)} className="text-zinc-400 hover:text-white"><X size={18}/></button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Top Row: Label */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">Label</label>
            <input 
              value={formData.label || ''} 
              onChange={e => setFormData({...formData, label: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-[#b45309] outline-none transition-colors"
            />
          </div>

          {/* Grid: Type & Region */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-500 uppercase">Type</label>
               <select 
                 value={formData.type || 'person'} 
                 onChange={e => setFormData({...formData, type: e.target.value})}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-[#b45309] outline-none"
               >
                 <option value="person">Person</option>
                 <option value="organization">Organization</option>
                 <option value="event">Event</option>
                 <option value="concept">Concept</option>
                 <option value="publication">Publication</option>
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-500 uppercase">Region</label>
               <input 
                  value={formData.region || ''} 
                  onChange={e => setFormData({...formData, region: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-[#b45309] outline-none"
                  placeholder="e.g. Wielkopolska"
               />
            </div>
          </div>

          {/* Grid: Certainty & Dates */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                 <Shield size={10} /> Certainty
               </label>
               <select 
                 value={formData.certainty || 'confirmed'} 
                 onChange={e => setFormData({...formData, certainty: e.target.value})}
                 className={`w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-[#b45309] outline-none font-medium
                   ${formData.certainty === 'disputed' ? 'text-amber-500' : 
                     formData.certainty === 'alleged' ? 'text-red-400' : 'text-emerald-400'}`}
               >
                 <option value="confirmed">Confirmed</option>
                 <option value="disputed">Disputed</option>
                 <option value="alleged">Alleged</option>
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-xs font-bold text-zinc-500 uppercase">Dates (ISO/Text)</label>
               <input 
                  value={formData.dates || ''} 
                  onChange={e => setFormData({...formData, dates: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-[#b45309] outline-none font-mono"
                  placeholder="e.g. 1918-1939"
               />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
            <textarea 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white h-20 focus:border-[#b45309] outline-none resize-none"
            />
          </div>

          {/* Sources */}
          <div className="space-y-1">
             <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                <BookOpen size={10} /> Sources (One per line)
             </label>
             <textarea 
               value={formData.sources || ''} 
               onChange={e => setFormData({...formData, sources: e.target.value})}
               className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 h-20 focus:border-[#b45309] outline-none resize-none"
               placeholder="Author, Title (Year)..."
             />
          </div>

        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-850 rounded-b-xl flex justify-between shrink-0">
          <button onClick={handleDelete} className="text-[#be123c] hover:text-red-300 text-xs flex items-center gap-1 px-3 py-2 rounded hover:bg-[#be123c]/10 transition-colors">
            <Trash size={14} /> Delete
          </button>
          <button onClick={handleSave} className="bg-[#355e3b] hover:bg-[#2a4a2f] text-white text-xs font-bold flex items-center gap-1 px-4 py-2 rounded transition-colors shadow-lg shadow-[#355e3b]/20">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const Edit2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);