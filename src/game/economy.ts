import { rarityRanks } from './balance';
import type { ShipPart } from './types';

export const partCost=(part:ShipPart, sector = 1) => {
  const base={common:38,uncommon:82,rare:165,epic:330,legendary:520,anomaly:760}[part.rarity];
  const rank=rarityRanks.indexOf(part.rarity);
  return {
    credits:Math.round(base*(1+Math.max(0,sector-1)*0.18)),
    alloy:rank>=2?Math.round((rank-1)*10*(1+sector*.08)):0,
    memory:rank>=3?rank-2:0
  };
};

export const partPrice=(part:ShipPart, sector = 1)=>partCost(part,sector).credits;
