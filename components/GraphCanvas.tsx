

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { useStore } from '../store';
import { THEME } from '../constants';
import { NodeData, TemporalFactType } from '../types';
import { generateNodeDeepening } from '../services/geminiService';
import { getRankInsigniaSVG } from '../services/styleUtils';
import { BookOpenCheck, X, Link, Shield } from 'lucide-react';

// Register the Cola extension
cytoscape.use(cola);

// Helper to extract a single year from TemporalFactType for filtering
function getYearFromTemporalFact(temporal?: TemporalFactType): number | undefined {
  if (!temporal) return undefined;
  if (temporal.type === 'instant') return parseInt(temporal.timestamp);
  if (temporal.type === 'interval') return parseInt(temporal.start);
  return undefined;
}

export const GraphCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { 
    graph, 
    filteredGraph, 
    activeCommunityColoring, 
    showCertainty,
    isSecurityMode,
    activeLayout,
    layoutParams,
    selectedNodeIds, 
    toggleNodeSelection, 
    clearSelection, 
    timelineYear, 
    deepeningNodeId,
    setDeepeningNode,
    setThinking,
    addToast,
    setPendingPatch,
    addResearchTask,
    updateResearchTask
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: NodeData } | null>(null);

  const handleDeepenContext = async (nodeId: string) => {
    setContextMenu(null);
    const node = graph.nodes.find(n => n.data.id === nodeId)?.data;
    if (!node) return;

    setDeepeningNode(nodeId);
    setThinking(true);
    const taskId = Date.now().toString();
    addResearchTask({
        id: taskId,
        type: 'deepening',
        target: node.label,
        status: 'running',
        reasoning: 'Interrogating archives...'
    });

    try {
      const result = await generateNodeDeepening(node, graph);
      setPendingPatch(result); // Pass the full GraphPatch
      updateResearchTask(taskId, { status: 'complete', reasoning: result.reasoning });
    } catch (e) {
      addToast({ title: 'Błąd Archiwum', description: 'Intelligence gathering failed.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Query failed.' });
    } finally {
      setDeepeningNode(null);
      setThinking(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy existing Cytoscape instance if it exists to prevent memory leaks on re-renders
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      selectionType: 'additive',
      boxSelectionEnabled: true,
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'cut-rectangle',
            'label': 'data(label)',
            'color': THEME.colors.parchment,
            'font-family': 'Spectral, serif',
            'font-weight': 'bold',
            'font-size': '14px',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'background-fit': 'cover',
            'border-width': 2,
            'border-style': 'dashed',
            'border-color': THEME.colors.antiqueBrass,
            // Use importance for size, fallback to pagerank
            'width': (ele: any) => 60 + ((ele.data('importance') || ele.data('pagerank') || 0) * 100),
            'height': (ele: any) => 40 + ((ele.data('importance') || ele.data('pagerank') || 0) * 80),
            'text-outline-width': 2,
            'text-outline-color': '#050a06',
            'text-outline-opacity': 1,
            'shadow-blur': 0,
            'transition-property': 'background-color, width, height, border-width, border-color, opacity, display',
            'transition-duration': 300
          } as any
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': THEME.colors.antiqueBrass,
            'target-arrow-color': THEME.colors.antiqueBrass,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6,
            'label': 'data(label)', // Show relationship type or label
            'font-size': '8px',
            'color': THEME.colors.parchment,
            'text-outline-width': 1,
            'text-outline-color': '#050a06',
            'text-outline-opacity': 1,
            'text-background-opacity': 0.8,
            'text-background-color': THEME.colors.forestUniform,
            'text-background-shape': 'roundrectangle',
            'edge-text-rotation': 'autorotate',
          } as any
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-style': 'solid',
            'border-color': THEME.colors.parchment,
            'line-color': THEME.colors.parchment,
            'target-arrow-color': THEME.colors.parchment,
            'opacity': 1,
            'shadow-blur': 10,
            'shadow-color': THEME.colors.antiqueBrass
          } as any
        }
      ],
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    const cy = cyRef.current;

    cy.on('tap', 'node', (evt) => {
      const isMulti = evt.originalEvent.shiftKey || evt.originalEvent.ctrlKey;
      toggleNodeSelection(evt.target.id(), isMulti);
      setContextMenu(null);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        clearSelection();
        setContextMenu(null);
      }
    });

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      if (containerRef.current) {
        const { left, top } = containerRef.current.getBoundingClientRect();
        const bb = node.renderedBoundingBox();
        setTooltip({
          x: left + bb.x1 + (bb.w / 2),
          y: top + bb.y1,
          data: node.data()
        });
      }
    });

    cy.on('mouseout', 'node', () => setTooltip(null));
    cy.on('zoom pan grab', () => setTooltip(null));

    cy.on('cxttap', 'node', (evt) => {
      evt.preventDefault();
      setContextMenu({
        x: evt.originalEvent.clientX,
        y: evt.originalEvent.clientY,
        nodeId: evt.target.id()
      });
    });
    
    cy.on('zoom pan', () => setContextMenu(null));

    return () => { if (cyRef.current) cyRef.current.destroy(); };
  }, []);

  // Update Data & Layout
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    
    cy.batch(() => {
      cy.elements().remove();
      cy.add([
        ...filteredGraph.nodes.map(n => ({ group: 'nodes', data: n.data, position: n.position || {x:0, y:0} })),
        // Use EdgeData.label as fallback for display if relationType isn't set, otherwise use relationType
        ...filteredGraph.edges.map(e => ({ group: 'edges', data: { ...e.data, label: e.data.label || e.data.relationType } }))
      ] as any);

      // Apply SVG Backgrounds for Rank Insignia
      cy.nodes().forEach(node => {
          const rank = node.data('pagerank') || 0;
          const type = node.data('type');
          const svgData = getRankInsigniaSVG(rank, type);
          node.style('background-image', svgData);
      });

      // Filtering Logic (Year) - now uses NodeData.validity
      if (timelineYear !== null) {
         cy.nodes().forEach(node => {
            const nodeYear = getYearFromTemporalFact(node.data('validity')); // Use the helper
            if (!nodeYear) { // Timeless concepts or nodes without temporal data
                node.style('opacity', 0.4);
                node.style('display', 'element'); // Keep visible but dim
            } else if (nodeYear > timelineYear) {
                node.style('display', 'none');
            } else {
                node.style('opacity', 1);
                node.style('display', 'element');
            }
         });
         // TODO: Implement temporal filtering for edges based on EdgeData.temporal
      } else { // No timeline filter
        cy.nodes().forEach(node => {
          node.style('opacity', 1);
          node.style('display', 'element');
        });
      }
    });

    const layoutConfig = {
       name: activeLayout === 'cola' ? 'cola' : activeLayout,
       animate: true,
       maxSimulationTime: 3000,
       nodeSpacing: 80 * layoutParams.spacing,
       gravity: layoutParams.gravity,
    };
    cy.layout(layoutConfig as any).run();

  }, [filteredGraph, activeLayout, timelineYear]);

  // Visual Styling Updates
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    
    cy.batch(() => {
        cy.nodes().forEach(node => {
            const data = node.data();
            
            // Security Mode: High Risk = Glowing Red Border
            if (isSecurityMode) {
                const risk = data.security?.risk || 0;
                if (risk > 0.5) {
                    node.style('border-color', THEME.colors.crimson);
                    node.style('border-width', 4);
                } else {
                    node.style('border-color', THEME.colors.forestUniform);
                }
            } else {
                // Default Stitched Look
                node.style('border-color', THEME.colors.antiqueBrass);
                node.style('border-width', 2);
                node.style('border-style', 'dashed');
            }

            // Certainty: Alleged = Dotted, Hypothesized = Dashed-dotted
            if (showCertainty) {
                if (data.certainty === 'alleged') {
                    node.style('border-style', 'dotted');
                    node.style('opacity', 0.7);
                } else if (data.certainty === 'hypothesized') {
                    node.style('border-style', 'dashed-dotted');
                    node.style('opacity', 0.6);
                } else {
                    node.style('border-style', 'dashed'); // Default for confirmed/disputed
                    node.style('opacity', 1);
                }
            } else {
                node.style('border-style', 'dashed');
                node.style('opacity', 1);
            }


            // Deepening Highlight
            if (deepeningNodeId && data.id === deepeningNodeId) {
                node.style('border-color', THEME.colors.crimson);
                node.style('border-width', 4);
            }
        });
    });
  }, [isSecurityMode, showCertainty, deepeningNodeId, filteredGraph]); // Added filteredGraph to trigger style updates on filter changes

  return (
    <div className="w-full h-full relative bg-bunker-dark">
      <div ref={containerRef} className="w-full h-full" />
      
      {timelineYear !== null && (
          <div className="absolute top-6 left-6 pointer-events-none opacity-10 font-spectral text-[8rem] font-bold text-parchment leading-none z-0">
             {timelineYear}
          </div>
      )}

      {/* Pennant Tooltip */}
      {tooltip && (
        <div 
          className="fixed z-[100] pointer-events-none drop-shadow-2xl"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 20, 
            transform: 'translate(-50%, -100%)'
          }}
        >
          {/* Triangular Shape */}
          <div 
            className="bg-parchment text-paper-ink w-48 p-3 pt-2 relative"
            style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)' }}
          >
             <div className="text-center border-b border-antique-brass/50 pb-1 mb-1">
                <span className="font-spectral font-bold uppercase tracking-wider text-sm">{tooltip.data.label}</span>
             </div>
             {tooltip.data.description && (
               <p className="text-[10px] font-serif leading-tight text-center pb-4 italic opacity-80 line-clamp-3">
                 {tooltip.data.description}
               </p>
             )}
             {/* Node Validity/Dates */}
             {tooltip.data.validity && (
                <p className="text-[9px] font-mono text-zinc-600 text-center mt-2">
                    {tooltip.data.validity.type === 'instant' && `(${tooltip.data.validity.timestamp})`}
                    {tooltip.data.validity.type === 'interval' && `(${tooltip.data.validity.start}-${tooltip.data.validity.end})`}
                    {tooltip.data.validity.type === 'fuzzy' && `(${tooltip.data.validity.approximate})`}
                </p>
             )}
             {tooltip.data.region && tooltip.data.region.label && (
                <p className="text-[9px] font-mono text-zinc-600 text-center mt-1">
                    {tooltip.data.region.label}
                </p>
             )}
             
             {/* Rank Chevron Overlay */}
             {(tooltip.data.pagerank || 0) > 0.1 && (
                 <div className="absolute top-0 right-0 p-1">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-antique-brass"></div>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* Context Menu (Archival Action) */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-parchment border-2 border-forest-uniform shadow-[5px_5px_0px_rgba(30,58,37,0.5)] py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button 
            onClick={() => handleDeepenContext(contextMenu.nodeId)}
            className="w-full px-4 py-2 text-left text-sm font-bold font-spectral uppercase text-forest-uniform hover:bg-antique-brass/20 flex items-center gap-2 transition-colors"
          >
            <BookOpenCheck size={14} /> Research This Node
          </button>
          <button 
            onClick={() => setContextMenu(null)}
            className="w-full px-4 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-200 flex items-center gap-2 transition-colors border-t border-forest-uniform/20"
          >
            <X size={12} /> Dismiss
          </button>
        </div>
      )}
    </div>
  );
};