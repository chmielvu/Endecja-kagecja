import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GraphCanvas } from '../../components/GraphCanvas';

// Mock cytoscape since it requires a browser canvas
vi.mock('cytoscape', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    batch: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    elements: vi.fn(() => ({ remove: vi.fn() })),
    add: vi.fn(),
    destroy: vi.fn(),
    nodes: vi.fn(() => []),
    edges: vi.fn(() => [])
  })),
  use: vi.fn()
}));

// Mock cytoscape-cola
vi.mock('cytoscape-cola', () => ({
  default: vi.fn()
}));

describe('GraphCanvas Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<GraphCanvas />);
    expect(container).toBeInTheDocument();
  });
});
