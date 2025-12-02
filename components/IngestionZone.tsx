
import React, { useCallback, useState } from 'react';
import { useStore } from '../store';
import { analyzeDocument } from '../services/geminiService';
import { FileDown, FileText, Loader2, AlertCircle } from 'lucide-react';

export const IngestionZone: React.FC = () => {
  const { graph, setPendingPatch, addResearchTask, updateResearchTask, addToast } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      addToast({ title: 'Invalid File', description: 'Only images and PDFs are supported by the Archive.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    const taskId = Date.now().toString();
    addResearchTask({ 
        id: taskId, 
        type: 'analysis', 
        target: file.name, 
        status: 'running', 
        reasoning: 'Scanning document for entities...' 
    });

    try {
      const result = await analyzeDocument(file, graph);
      setPendingPatch({
        type: 'expansion',
        reasoning: result.thoughtSignature,
        nodes: result.newNodes,
        edges: result.newEdges
      });
      updateResearchTask(taskId, { status: 'complete', reasoning: result.thoughtSignature });
      addToast({ title: 'Document Decoded', description: 'Entities extracted from evidence.', type: 'success' });
    } catch (e) {
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Ingestion failed.' });
      addToast({ title: 'Ingestion Failed', description: 'Could not read document.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-sm p-6 flex flex-col items-center justify-center text-center transition-all duration-300
        ${isDragging 
          ? 'border-antique-brass bg-antique-brass/10' 
          : 'border-forest-uniform/40 bg-bunker-dark/50 hover:border-antique-brass/50'
        }
        ${isProcessing ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center gap-2">
           <Loader2 className="animate-spin text-antique-brass" size={24} />
           <span className="text-xs font-mono text-parchment animate-pulse">DECODING INTELLIGENCE...</span>
        </div>
      ) : (
        <>
          <FileDown className={`mb-2 transition-colors ${isDragging ? 'text-antique-brass' : 'text-forest-uniform'}`} size={24} />
          <h4 className="text-xs font-bold text-parchment uppercase font-spectral tracking-widest">Ingest Evidence</h4>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-[150px]">
            Drop archival scans (PDF/IMG) here to extract entities via Gemini.
          </p>
        </>
      )}
    </div>
  );
};
