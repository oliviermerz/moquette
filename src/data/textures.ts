/** Textures de substitution, utilisées tant que les photos réelles ne sont pas disponibles. */
export type Tex = 'beige' | 'blanc' | 'gris' | 'mix' | 'beton' | 'carrelage' | 'dalles' | 'gravier';

export interface TexSpec { base: string; freq: number; opacity: number; octaves: number; grid?: number; joint?: string }

export const TEXTURES: Record<Tex, TexSpec> = {
  // Finitions (granulats)
  beige: { base: '#C4AD86', freq: 0.42, opacity: 0.85, octaves: 2 },
  blanc: { base: '#E0DBD1', freq: 0.42, opacity: 0.6, octaves: 2 },
  gris: { base: '#8E8E8A', freq: 0.42, opacity: 0.85, octaves: 2 },
  mix: { base: '#A99C86', freq: 0.4, opacity: 1, octaves: 3 },
  // Supports existants
  beton: { base: '#8E8B85', freq: 0.012, opacity: 0.55, octaves: 4 },
  carrelage: { base: '#ACA08F', freq: 0.02, opacity: 0.45, octaves: 3, grid: 64, joint: '#6F685E' },
  dalles: { base: '#97938B', freq: 0.015, opacity: 0.5, octaves: 4, grid: 150, joint: '#4D5440' },
  gravier: { base: '#6E665A', freq: 0.25, opacity: 0.9, octaves: 2 },
};

export const FINISHES: { tex: Tex; name: string; note: string }[] = [
  { tex: 'beige', name: 'Beige naturel', note: 'Chaleureux, proche du sable et de la pierre calcaire.' },
  { tex: 'blanc', name: 'Blanc minéral', note: 'Lumineux, idéal autour d’une piscine.' },
  { tex: 'gris', name: 'Gris contemporain', note: 'Sobre, accordé aux menuiseries anthracite.' },
  { tex: 'mix', name: 'Mix pierre', note: 'Plusieurs granulats mélangés, rendu naturel et vivant.' },
];
