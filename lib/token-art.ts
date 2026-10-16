export const TOKEN_ART_COUNT = 36;
export function heroTokenIndex(hero: { portrait?: number; className?: string; species?: string }) {
  if (Number.isInteger(hero.portrait) && hero.portrait! >= 0 && hero.portrait! < TOKEN_ART_COUNT) return hero.portrait!;
  const species = String(hero.species || '').toLowerCase();
  if (species.includes('anão')) return 6;
  if (species.includes('tifer') || species.includes('tiefl')) return 8;
  if (species.includes('orc')) return 10;
  if (species.includes('dracon')) return 18;
  const classes: Record<string, number> = { Guerreiro: 0, Paladino: 1, Patrulheiro: 2, Mago: 4, Feiticeiro: 5, Bárbaro: 10, Bruxo: 8, Clérigo: 12, Bardo: 14, Ladino: 16, Monge: 19, Druida: 20 };
  return classes[hero.className || ''] ?? 0;
}
export function enemyTokenIndex(name: string) {
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/ignisrax|dragao/.test(n)) return 35;
  if (/wyrm/.test(n)) return 34;
  if (/ogro/.test(n)) return 30;
  if (/aranha/.test(n)) return 31;
  if (/urso/.test(n)) return 32;
  if (/troll/.test(n)) return 33;
  if (/lobo/.test(n)) return 25;
  if (/esqueleto/.test(n)) return 26;
  if (/zumbi/.test(n)) return 27;
  if (/bandido|sentinela/.test(n)) return 28;
  if (/cult|malakor|mago/.test(n)) return 29;
  return 24;
}
export const tokenArt = (index: number) => `/art/miniatures/token-${Math.max(0, Math.min(35, index))}.webp`;
