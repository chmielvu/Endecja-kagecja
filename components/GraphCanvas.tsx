
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { useStore } from '../store';
import { COLORS, COMMUNITY_COLORS, THEME } from '../constants';
import { NodeData } from '../types';
import { generateNodeDeepening } from '../services/geminiService';
import { BookOpenCheck, X } from 'lucide-react';

// Register the Cola extension
cytoscape.use(cola);

export const GraphCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { 
    graph, 
    filteredGraph, 
    activeCommunityColoring, 
    showCertainty,
    isSecurityMode, // Security Mode
    isGroupedByRegion,
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

  // Deepen Logic (Context Menu Version)
  const handleDeepenContext = async (nodeId: string) => {
    setContextMenu(null);
    const node = graph.nodes.find(n => n.data.id === nodeId)?.data;
    if (!node) return;

    setDeepeningNode(nodeId);
    setThinking(true);
    
    // Create Research Task
    const taskId = Date.now().toString();
    addResearchTask({
        id: taskId,
        type: 'deepening',
        target: node.label,
        status: 'running',
        reasoning: 'Initializing archival query...'
    });

    try {
      const result = await generateNodeDeepening(node, graph);
      
      // THOUGHT SIGNATURE HANDLER
      // We inject the signature into the reasoning field to persist the agent's context
      setPendingPatch({
        type: 'deepening',
        reasoning: result.thoughtSignature, // Mapped from thoughtSignature
        nodes: [{ id: node.id, ...result.updatedProperties }], 
        edges: result.newEdges
      });
      
      updateResearchTask(taskId, { 
          status: 'complete', 
          reasoning: result.thoughtSignature 
      });
      
    } catch (e) {
      addToast({ title: 'Błąd Archiwum', description: 'Nie udało się pogłębić wiedzy o węźle.', type: 'error' });
      updateResearchTask(taskId, { status: 'failed', reasoning: 'Query failed.' });
    } finally {
      setDeepeningNode(null);
      setThinking(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      selectionType: 'additive',
      boxSelectionEnabled: true,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': THEME.colors.textMain,
            'font-family': 'Spectral, serif',
            'font-weight': 'bold',
            'font-size': '14px',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-opacity': 0.8,
            'text-background-color': THEME.colors.background,
            'text-background-padding': '4px',
            'text-background-shape': 'roundrectangle',
            'width': (ele: any) => {
               const pr = ele.data('pagerank') || 0.01;
               return 15 + (pr * 160); // Base size increased slightly
            },
            'height': (ele: any) => {
               const pr = ele.data('pagerank') || 0.01;
               return 15 + (pr * 160);
            },
            'border-width': (ele: any) => {
               const kCore = ele.data('kCore') || 0;
               return kCore * 2;
            },
            'border-color': THEME.colors.archivalGold, 
            'border-opacity': 0.8,
            'transition-property': 'background-color, width, height, border-width, opacity, border-color, border-style',
            'transition-duration': 500
          }
        },
        // COMPOUND NODE STYLE
        {
          selector: ':parent',
          style: {
             'background-opacity': 0.05,
             'background-color': THEME.colors.archivalGold,
             'border-width': 2,
             'border-style': 'dashed',
             'border-color': THEME.colors.archivalGold,
             'border-opacity': 0.4,
             'label': 'data(label)',
             'font-family': 'Spectral, serif',
             'font-weight': 'bold',
             'text-valign': 'top',
             'text-margin-y': -10,
             'text-transform': 'uppercase',
             'font-size': '20px',
             'color': THEME.colors.archivalGold,
             'text-background-opacity': 0, // No BG for parent label
             'shape': 'roundrectangle'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => {
              const weight = ele.data('weight') || 0;
              // Base 1.5, scale up to 5 based on weight
              return Math.min(5, 1.5 + (weight * 50));
            },
            'line-color': (ele) => ele.data('sign') === 'negative' ? THEME.colors.crimson : THEME.colors.owpGreen,
            'target-arrow-color': (ele) => ele.data('sign') === 'negative' ? THEME.colors.crimson : THEME.colors.owpGreen,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': (ele: any) => {
               const weight = ele.data('weight') || 0;
               return Math.min(1, 0.3 + (weight * 1.5));
            },
            // Edge Labels (Hidden by default, shown on hover/selection)
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'font-size': '9px',
            'font-family': 'Inter, sans-serif',
            'color': THEME.colors.textDim,
            'text-background-color': THEME.colors.background,
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle'
          }
        },
        {
          selector: 'edge:selected',
          style: {
             'label': 'data(label)',
             'line-color': THEME.colors.archivalGold,
             'target-arrow-color': THEME.colors.archivalGold,
             'width': 3,
             'opacity': 1,
             'color': '#fff'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': THEME.colors.archivalGold,
            'background-color': THEME.colors.archivalGold,
            'text-background-color': THEME.colors.archivalGold,
            'text-background-opacity': 1,
            'color': '#000'
          }
        },
        // Show labels on hover with increased width/opacity
        {
           selector: 'edge.hovered',
           style: {
              'label': 'data(label)',
              'opacity': 1,
              'color': '#fff',
              'z-index': 999,
              'width': (ele: any) => {
                 const weight = ele.data('weight') || 0;
                 // Base proportional width + highlight buffer
                 return Math.min(7, 3.5 + (weight * 50)); 
              },
              'text-background-opacity': 1,
              'text-background-color': '#0c0c0e',
              'text-border-width': 1,
              'text-border-color': THEME.colors.owpGreen,
              'text-border-opacity': 0.4
           }
        }
      ],
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    const cy = cyRef.current;

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      // Prevent selection of Parent compound nodes
      if (node.isParent()) return;

      const isMulti = evt.originalEvent.shiftKey || evt.originalEvent.ctrlKey;
      toggleNodeSelection(node.id(), isMulti);
      setContextMenu(null);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        clearSelection();
        setContextMenu(null);
      }
    });

    cy.on('boxselect', 'node', (evt) => {
      // Ignore compound parents in box select
      if (evt.target.isParent()) return;
      toggleNodeSelection(evt.target.id(), true);
    });
    
    // Hover effects for edge labels
    cy.on('mouseover', 'edge', (evt) => {
       evt.target.addClass('hovered');
    });
    cy.on('mouseout', 'edge', (evt) => {
       evt.target.removeClass('hovered');
    });

    // Node Tooltip Handlers
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      if (node.isParent()) return; // No tooltip for parent regions

      if (containerRef.current) {
        const { left, top } = containerRef.current.getBoundingClientRect();
        // Use renderedBoundingBox for precise edge positioning relative to the visible node
        const bb = node.renderedBoundingBox();
        
        setTooltip({
          // Center of the bounding box width + left offset
          x: left + bb.x1 + (bb.w / 2),
          // Top of the bounding box + top offset
          y: top + bb.y1,
          data: node.data()
        });
      }
    });

    cy.on('mouseout', 'node', () => {
      setTooltip(null);
    });

    // Hide tooltip on interactions
    cy.on('zoom pan grab', () => setTooltip(null));

    // Context Menu Handler
    cy.on('cxttap', 'node', (evt) => {
      if (evt.target.isParent()) return;
      evt.preventDefault();
      setContextMenu({
        x: evt.originalEvent.clientX,
        y: evt.originalEvent.clientY,
        nodeId: evt.target.id()
      });
    });

    // Close menu on zoom/pan
    cy.on('zoom pan', () => setContextMenu(null));

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, []);

  // Helper to get layout config
  const getLayoutConfig = (layoutName: string) => {
    switch (layoutName) {
      case 'cola':
        return {
          name: 'cola',
          animate: true,
          refresh: 2,
          maxSimulationTime: 6000,
          ungrabifyWhileSimulating: false,
          fit: true,
          padding: 40,
          randomize: true,
          nodeSpacing: (node: any) => {
            const pr = node.data('pagerank') || 0.01;
            return (50 + (pr * 80)) * layoutParams.spacing; 
          },
          edgeLength: (edge: any) => {
            const weight = edge.data('weight') || 0.2;
            return Math.max(80, 350 - (weight * 270));
          },
          nodeDimensionsIncludeLabels: true,
          gravity: layoutParams.gravity,
          friction: layoutParams.friction,
          initialEnergyOnIncremental: 0.5,
        };
      case 'cose':
        return {
          name: 'cose',
          animate: true,
          refresh: 20,
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: (node: any) => layoutParams.nodeRepulsion,
          nodeOverlap: 10,
          idealEdgeLength: (edge: any) => layoutParams.idealEdgeLength,
          edgeElasticity: (edge: any) => 100,
          nestingFactor: 5,
          gravity: 80 * layoutParams.gravity,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        };
      case 'concentric':
        return {
          name: 'concentric',
          fit: true,
          padding: 30,
          startAngle: 3 / 2 * Math.PI,
          sweep: undefined,
          clockwise: true,
          equidistant: false,
          minNodeSpacing: 10 * layoutParams.spacing,
          boundingBox: undefined,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          height: undefined,
          width: undefined,
          spacingFactor: undefined,
          concentric: (node: any) => {
            return node.data('pagerank') || 0;
          },
          levelWidth: (nodes: any) => {
            return nodes.maxDegree() / 4;
          },
          animate: true,
          animationDuration: 500,
        };
      case 'grid':
        return {
          name: 'grid',
          fit: true,
          padding: 30,
          avoidOverlap: true,
          animate: true,
          animationDuration: 500,
        };
      case 'circle':
        return {
          name: 'circle',
          fit: true,
          padding: 30,
          avoidOverlap: true,
          animate: true,
          animationDuration: 500,
        };
      default:
        // Default to grid layout for structured archival view
        return {
          name: 'grid',
          fit: true,
          padding: 30,
          avoidOverlap: true,
          animate: true,
          animationDuration: 500,
        };
    }
  };

  // Sync Graph Data & Layout
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      // 1. Prepare Nodes
      // If Region Grouping is ON, generate Parent Nodes
      let parentNodes: any[] = [];
      if (isGroupedByRegion) {
        const regions = new Set<string>();
        filteredGraph.nodes.forEach(n => {
           if (n.data.region && n.data.region !== 'Unknown') {
             regions.add(n.data.region);
           }
        });
        
        parentNodes = Array.from(regions).map(regionName => ({
           group: 'nodes',
           data: {
             id: `region_${regionName.replace(/\s+/g, '_')}`,
             label: regionName,
             isParent: true // Flag to help styles
           }
        }));
      }

      // Map standard nodes, assigning 'parent' if applicable
      const newNodes = filteredGraph.nodes.map(n => {
        let parentId: string | undefined = undefined;
        if (isGroupedByRegion && n.data.region && n.data.region !== 'Unknown') {
            parentId = `region_${n.data.region.replace(/\s+/g, '_')}`;
        }

        return {
          group: 'nodes',
          data: { ...n.data, parent: parentId },
          position: n.position || { x: 0, y: 0 } // Default position if missing
        };
      });

      const newEdges = filteredGraph.edges.map(e => ({
        group: 'edges',
        data: e.data
      }));

      cy.elements().remove();
      // Add Parents first, then Children (though order often handled by CY)
      cy.add([...parentNodes, ...newNodes, ...newEdges] as any);
      
      // Smart Filtering & Visuals based on Timeline
      if (timelineYear !== null) {
        cy.nodes().forEach(node => {
           if (node.isParent()) return; // Don't filter parent containers based on year directly

           const y = node.data('year');
           let isVisible = false;
           // Nodes with no date are usually evergreen concepts, keep them visible but dim
           if (!y) {
               isVisible = true; 
               node.style('opacity', 0.2); // Very dim for timeless concepts during playback
               node.style('events', 'no'); // Non-interactive
           } else {
               isVisible = y <= timelineYear;
               
               if (isVisible) {
                   node.style('opacity', 1);
                   node.style('events', 'yes');
               } else {
                   // Completely hide future nodes
                   node.style('display', 'none'); 
               }
           }
        });
        
        // Hide edges connected to hidden nodes
        cy.edges().forEach(edge => {
            if (edge.source().hidden() || edge.target().hidden()) {
                edge.style('display', 'none');
            } else {
                edge.style('display', 'element');
            }
        });
        
      } else {
        cy.elements().style('opacity', 1);
        cy.elements().style('display', 'element');
        cy.elements().style('events', 'yes');
      }
    });

    // Run Layout using the helper
    const layoutConfig = getLayoutConfig(activeLayout);
    cy.layout(layoutConfig as any).run();

  }, [filteredGraph, timelineYear, activeLayout, isGroupedByRegion, layoutParams]);

  // Sync Selection
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.batch(() => {
      cy.nodes().unselect();
      selectedNodeIds.forEach(id => {
        cy.$id(id).select();
      });
    });
  }, [selectedNodeIds]);

  // Update Styling (Colors, Deepening, Certainty, Security)
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      // Pre-calc neighbors if deepening
      // Explicitly cast to any to resolve NodeCollection vs CollectionReturnValue mismatch in some TS environments
      let activeNeighbors = cy.collection() as any; 
      if (deepeningNodeId) {
         const target = cy.getElementById(deepeningNodeId);
         if (target.length) {
            activeNeighbors = target.neighborhood().nodes();
         }
      }

      cy.nodes().forEach(ele => {
        if (ele.isParent()) return;

        const data = ele.data() as NodeData;
        
        // 1. Determine Base Color
        let color = '#52525b'; 
        
        // SOTA Security Mode Coloring
        if (isSecurityMode) {
             const risk = data.security?.risk || 0;
             if (risk >= 0.7) color = THEME.colors.crimson;      // High Risk (Red)
             else if (risk >= 0.4) color = THEME.colors.archivalGold; // Medium Risk (Orange)
             else color = THEME.colors.owpGreen;                 // Low Risk (Green)
        } else if (activeCommunityColoring) {
          const commId = data.louvainCommunity !== undefined ? data.louvainCommunity : data.community;
          if (commId !== undefined) {
             color = COMMUNITY_COLORS[commId % COMMUNITY_COLORS.length];
          }
        } else {
           color = COLORS[data.type] || color;
        }
        
        // 2. Apply Deepening Context (or Reset)
        if (deepeningNodeId) {
            if (data.id === deepeningNodeId) {
                // Target: Crimson, Highlighted
                ele.style({
                    'background-color': THEME.colors.crimson,
                    'border-color': THEME.colors.crimson,
                    'border-width': 8,
                    'border-style': 'double',
                    'opacity': 1,
                    'z-index': 999
                });
            } else if (activeNeighbors.has(ele)) {
                // Neighbor: Gold, Dashed
                ele.style({
                    'background-color': color,
                    'border-color': THEME.colors.archivalGold,
                    'border-width': 4,
                    'border-style': 'dashed',
                    'opacity': 1,
                    'z-index': 998
                });
            } else {
                // Background: Dimmed
                ele.style({
                    'background-color': color,
                    'opacity': 0.2,
                    'border-width': 0,
                    'z-index': 1
                });
            }
        } else {
            // Normal State
            ele.style({
                'background-color': color,
                'opacity': 1,
                'z-index': 10
            });
            
            // Restore Stylesheet Defaults for borders if not selected
            if (!ele.selected()) {
                ele.removeStyle('border-color');
                ele.removeStyle('border-width');
                ele.removeStyle('border-style');
                
                // Re-apply certainty styles if needed
                if (showCertainty) {
                     const cert = data.certainty;
                     if (cert === 'disputed') {
                        ele.style('border-style', 'dashed');
                        ele.style('border-color', THEME.colors.crimson); 
                     } else if (cert === 'alleged') {
                        ele.style('border-style', 'dotted');
                     }
                }

                // Apply Security Mode Styles (e.g. Risk glowing border)
                if (isSecurityMode) {
                    const risk = data.security?.risk || 0;
                    if (risk > 0.5) {
                        ele.style('border-width', 2);
                        ele.style('border-color', '#fff');
                    }
                }
            }
        }
      });
    });

  }, [filteredGraph, activeCommunityColoring, deepeningNodeId, showCertainty, isSecurityMode]);

  // Animation Pulse Effect
  useEffect(() => {
    let interval: any;
    
    if (deepeningNodeId && cyRef.current) {
        const cy = cyRef.current;
        // Cast to any to handle Cytoscape collection type mismatches safely in TS
        const target = cy.getElementById(deepeningNodeId) as any;
        const neighbors = target.neighborhood().nodes() as any;

        const pulse = () => {
            // Pulse Target
            target.animate({
                 style: { 'border-width': 14, 'border-opacity': 0.4, 'background-opacity': 0.8 },
                 duration: 800,
                 easing: 'ease-out-sine'
            }).animate({
                 style: { 'border-width': 8, 'border-opacity': 1, 'background-opacity': 1 },
                 duration: 800,
                 easing: 'ease-in-sine'
            });

            // Pulse Neighbors (Subtle context breathing)
            neighbors.animate({
                 style: { 'border-width': 6, 'border-opacity': 0.5 },
                 duration: 800,
            }).animate({
                 style: { 'border-width': 3, 'border-opacity': 1 },
                 duration: 800,
            });
        };

        pulse(); // Immediate start
        interval = setInterval(pulse, 1600);
    }
    
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [deepeningNodeId]);

  return (
    <div className="w-full h-full relative bg-zinc-950">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Year Watermark during Time Travel */}
      {timelineYear !== null && (
          <div className="absolute top-6 left-6 pointer-events-none opacity-20 font-spectral text-[8rem] font-bold text-archival-gold leading-none select-none z-0">
             {timelineYear}
          </div>
      )}

      {/* Tooltip Overlay */}
      {tooltip && (
        <div 
          className="fixed z-[100] pointer-events-none p-3 bg-zinc-900/90 border border-archival-gold/50 rounded shadow-xl backdrop-blur-md max-w-xs animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 12, // Slight offset up from the node border
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
             <span className="font-spectral font-bold text-white text-lg leading-none">{tooltip.data.label}</span>
             {tooltip.data.year && <span className="text-xs bg-archival-gold/20 text-archival-gold px-1 rounded font-mono">{tooltip.data.year}</span>}
          </div>
          <div className="w-full h-[1px] bg-archival-gold/30 mb-2"></div>
          <p className="text-xs text-zinc-300 font-serif italic line-clamp-3">{tooltip.data.description}</p>
          <div className="mt-2 flex gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
             <span>PR: {(tooltip.data.pagerank || 0).toFixed(2)}</span>
             <span>Region: {tooltip.data.region || 'Unknown'}</span>
          </div>
          {/* Security Metrics Tooltip */}
          {tooltip.data.security && isSecurityMode && (
              <div className="mt-2 pt-2 border-t border-zinc-700 text-[10px] text-crimson font-mono uppercase">
                  <div>Risk Score: {(tooltip.data.security.risk * 100).toFixed(0)}%</div>
                  {tooltip.data.security.vulnerabilities.length > 0 && (
                      <div className="text-zinc-500 normal-case mt-1">{tooltip.data.security.vulnerabilities[0]}</div>
                  )}
              </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-zinc-900 border border-zinc-700 shadow-xl rounded py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button 
            onClick={() => handleDeepenContext(contextMenu.nodeId)}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-owp-green hover:text-white flex items-center gap-2 transition-colors"
          >
            <BookOpenCheck size={14} /> Research Deeply
          </button>
          <button 
            onClick={() => setContextMenu(null)}
            className="w-full px-4 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
          >
            <X size={14} /> Close Menu
          </button>
        </div>
      )}
    </div>
  );
};
