
import { THEME } from '../constants';

/**
 * Generates a Data URI SVG for a node background representing hierarchical rank.
 * Based on historical organizational influence style (Bars and Chevrons).
 */
export const getRankInsigniaSVG = (rank: number = 0, type: string): string => {
  const width = 60 + (rank * 100);
  const height = 40 + (rank * 80);
  
  // Base colors mapped to types using the Art Deco Palette
  let baseColor = THEME.colors.surface; // Deco Panel default
  if (type === 'organization') baseColor = THEME.colors.crimson; // Deco Crimson
  if (type === 'event') baseColor = THEME.colors.antiqueBrass; // Deco Gold
  if (type === 'publication') baseColor = THEME.colors.background; // Deco Navy
  if (type === 'person') baseColor = THEME.colors.background; // Deco Navy for persons

  // Insignia Color (Deco Gold or Deco Paper)
  const insigniaColor = THEME.colors.antiqueBrass; // Deco Gold
  const detailColor = THEME.colors.parchment; // Deco Paper for finer details

  // Determine Rank Level
  // 0.0 - 0.2: Minimal Influence (Plain)
  // 0.2 - 0.4: Minor Contributor (1 Bar)
  // 0.4 - 0.6: Key Member (2 Bars)
  // 0.6 - 0.8: Leader (3 Bars)
  // 0.8 - 1.0: Principal Figure (Chevron + Bars)
  
  let shapes = '';
  
  if (rank > 0.15) {
      // Bar 1
      shapes += `<rect x="${width/2 - 15}" y="${height - 10}" width="30" height="4" fill="${insigniaColor}" opacity="0.9" />`;
  }
  if (rank > 0.35) {
      // Bar 2
      shapes += `<rect x="${width/2 - 15}" y="${height - 18}" width="30" height="4" fill="${insigniaColor}" opacity="0.9" />`;
  }
  if (rank > 0.55) {
      // Bar 3
      shapes += `<rect x="${width/2 - 15}" y="${height - 26}" width="30" height="4" fill="${insigniaColor}" opacity="0.9" />`;
  }
  if (rank > 0.75) {
      // Chevron (V shape inverted)
      shapes += `
        <path d="M${width/2 - 20} ${height/2 - 5} L${width/2} ${height/2 - 15} L${width/2 + 20} ${height/2 - 5}" 
              stroke="${insigniaColor}" stroke-width="3" fill="none" />
        <path d="M${width/2 - 20} ${height/2} L${width/2} ${height/2 - 10} L${width/2 + 20} ${height/2}" 
              stroke="${insigniaColor}" stroke-width="3" fill="none" />
      `;
  }
  if (type === 'organization') {
     // Sword Icon for Orgs (simplified for background SVG)
     shapes += `
       <path d="M${width/2} ${10} L${width/2} ${25}" stroke="${detailColor}" stroke-width="2" />
       <path d="M${width/2 - 5} ${15} L${width/2 + 5} ${15}" stroke="${detailColor}" stroke-width="2" />
     `;
  }

  // Art Deco scales/fans pattern (subtle)
  const patternId = `decoPattern-${Math.random().toString(36).substring(7)}`;
  const texture = `
    <defs>
      <pattern id="${patternId}" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 0L10 0L5 10L0 0Z M10 0L0 0L5 10L10 0Z" fill="${THEME.colors.antiqueBrass}" fill-opacity="0.05" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#${patternId})" />
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${baseColor}" />
      ${texture}
      ${shapes}
      <!-- Double Border Effect simulated inside SVG -->
      <rect x="1" y="1" width="${width-2}" height="${height-2}" fill="none" stroke="${THEME.colors.antiqueBrass}" stroke-width="1" />
      <rect x="3" y="3" width="${width-6}" height="${height-6}" fill="none" stroke="${THEME.colors.antiqueBrass}" stroke-width="0.5" opacity="0.7" />
    </svg>
  `;

  return 'data:image/svg+xml;base64,' + btoa(svg);
};
