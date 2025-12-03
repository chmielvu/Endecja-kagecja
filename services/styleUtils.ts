
import { THEME } from '../constants';

/**
 * Generates a Data URI SVG for a node background representing military rank.
 * Based on the OWP/SN rank insignia style (Bars and Chevrons).
 */
export const getRankInsigniaSVG = (rank: number = 0, type: string): string => {
  const width = 60 + (rank * 100);
  const height = 40 + (rank * 80);
  
  // Base colors mapped to types
  let baseColor = THEME.colors.forestUniform; // Default Forest
  if (type === 'organization') baseColor = '#7f1d1d'; // Deep Red
  if (type === 'event') baseColor = '#78350f'; // Amber/Leather
  if (type === 'publication') baseColor = '#3f3f46'; // Ink Black
  
  // Insignia Color (usually Parchment or Silver/Gold)
  const insigniaColor = '#e5e5c0'; 

  // Determine Rank Level
  // 0.0 - 0.2: Private (Plain)
  // 0.2 - 0.4: Corporal (1 Bar)
  // 0.4 - 0.6: Sergeant (2 Bars)
  // 0.6 - 0.8: Lieutenant (3 Bars)
  // 0.8 - 1.0: Captain/General (Chevron + Bars)
  
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
     // Sword Icon for Orgs
     shapes += `
       <path d="M${width/2} ${10} L${width/2} ${25}" stroke="${insigniaColor}" stroke-width="2" />
       <path d="M${width/2 - 5} ${15} L${width/2 + 5} ${15}" stroke="${insigniaColor}" stroke-width="2" />
     `;
  }

  // Fabric Texture Pattern
  const texture = `
    <defs>
      <pattern id="fabric" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#000" stroke-width="0.5" opacity="0.1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#fabric)" />
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${baseColor}" />
      ${texture}
      ${shapes}
      <!-- Stitched Border Effect simulated inside SVG for better rendering if CSS fails -->
      <rect x="2" y="2" width="${width-4}" height="${height-4}" fill="none" stroke="${THEME.colors.antiqueBrass}" stroke-width="1" stroke-dasharray="4 2" opacity="0.5" />
    </svg>
  `;

  return 'data:image/svg+xml;base64,' + btoa(svg);
};
