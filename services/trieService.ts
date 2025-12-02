
import { NodeData } from '../types';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
  id: string | null = null;
  originalLabel: string | null = null;
}

export interface TrieMatch {
  id: string;
  label: string;
  distance: number;
}

/**
 * A specialized Trie for Entity Resolution.
 * Supports efficient fuzzy searching using Levenshtein distance on the Trie structure.
 */
export class SimilarityTrie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Inserts an entity label and its ID into the Trie.
   * Normalizes text to lowercase for case-insensitive matching.
   */
  insert(label: string, id: string) {
    let node = this.root;
    const text = label.toLowerCase().trim();
    
    for (const char of text) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    
    node.isEnd = true;
    node.id = id;
    node.originalLabel = label;
  }

  /**
   * Finds entities within a specific Levenshtein edit distance.
   * Uses the "current row" optimization to avoid full matrix recalculation.
   */
  findSimilar(query: string, maxDistance: number = 2): TrieMatch[] {
    const target = query.toLowerCase().trim();
    const currentRow = Array(target.length + 1).fill(0).map((_, i) => i);
    
    const results: TrieMatch[] = [];

    // Iterate over children of root to start recursive search
    for (const [char, child] of this.root.children) {
      this.searchRecursive(child, char, target, currentRow, results, maxDistance);
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  private searchRecursive(
    node: TrieNode, 
    char: string, 
    target: string, 
    previousRow: number[], 
    results: TrieMatch[],
    maxDistance: number
  ) {
    const columns = target.length + 1;
    const currentRow = [previousRow[0] + 1];

    for (let i = 1; i < columns; i++) {
      const insertCost = currentRow[i - 1] + 1;
      const deleteCost = previousRow[i] + 1;
      const replaceCost = previousRow[i - 1] + (target[i - 1] === char ? 0 : 1);

      currentRow.push(Math.min(insertCost, deleteCost, replaceCost));
    }

    // If the last entry in the row is within maxDistance and this node is a word end, add result
    if (currentRow[target.length] <= maxDistance && node.isEnd && node.id && node.originalLabel) {
      results.push({
        id: node.id,
        label: node.originalLabel,
        distance: currentRow[target.length]
      });
    }

    // Optimization: If the minimum value in this row is greater than maxDistance, 
    // any further down this branch will only increase distance. Prune.
    if (Math.min(...currentRow) <= maxDistance) {
      for (const [nextChar, child] of node.children) {
        this.searchRecursive(child, nextChar, target, currentRow, results, maxDistance);
      }
    }
  }

  /**
   * Bulk loads graph nodes into the Trie.
   */
  loadNodes(nodes: NodeData[]) {
    nodes.forEach(n => this.insert(n.label, n.id));
  }
}
