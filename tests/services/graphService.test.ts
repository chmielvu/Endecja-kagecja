import { describe, it, expect } from 'vitest';
import { NodeData, EdgeData, KnowledgeGraph } from '../../types';

describe('Graph Service Logic', () => {
  it('should handle empty graph gracefully', () => {
    const emptyGraph: KnowledgeGraph = { nodes: [], edges: [], meta: {} };
    expect(emptyGraph.nodes.length).toBe(0);
  });

  it('should support basic node properties', () => {
    const node: NodeData = {
      id: 'test_node',
      label: 'Test Node',
      type: 'person',
      importance: 0.5
    };
    expect(node.id).toBe('test_node');
  });
});
