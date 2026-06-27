import { rarityRanks } from './balance';
import type { LootNotice, ShipPart } from './types';

export const rareTrigger = (part:ShipPart) => ['rare','epic','legendary','anomaly'].includes(part.rarity);

export const makeLootNotice = (part:ShipPart, source:string):LootNotice => ({
  partId:part.id,
  name:part.name,
  rarity:part.rarity,
  text:`获得新装备：${part.name}（${source}）`,
  createdAt:Date.now()
});

export const randomPart = (parts:ShipPart[], maxRarity = 3, lucky = false) => {
  const pool = parts.filter(part => rarityRanks.indexOf(part.rarity) <= Math.min(rarityRanks.length-1, maxRarity + (lucky ? 1 : 0)) && !part.tags.includes('starter'));
  const weighted = pool.flatMap(part => {
    const rank = rarityRanks.indexOf(part.rarity);
    const rarityWeight = lucky ? (rank >= 3 ? 5 : rank === 2 ? 3 : 1) : 1;
    const slotWeight = part.slot === 'core' ? 3 : 1;
    return Array.from({ length: rarityWeight * slotWeight }, () => part);
  });
  return weighted[Math.floor(Math.random()*Math.max(1,weighted.length))] ?? parts[0];
};

export const shopRoll = (parts:ShipPart[], lucky = false, sector = 1) => {
  const maxRarity=Math.min(5,1+Math.ceil(sector/2));
  const eligible=parts.filter(part=>!part.tags.includes('starter')&&rarityRanks.indexOf(part.rarity)<=maxRarity);
  const pickFrom=(pool:ShipPart[])=>{
    const improving=pool.filter(part=>rarityRanks.indexOf(part.rarity)>=Math.max(0,Math.floor((sector-1)/2)));
    const source=(sector>2&&improving.length?improving:pool);
    return source[Math.floor(Math.random()*source.length)]??randomPart(parts,maxRarity,lucky);
  };
  const weapon=pickFrom(eligible.filter(part=>part.slot==='weapon'));
  const remainingSlots=['engine','shield','radar','core'] as const;
  const firstSlot=remainingSlots[Math.floor(Math.random()*remainingSlots.length)];
  const secondChoices=remainingSlots.filter(slot=>slot!==firstSlot);
  const secondSlot=secondChoices[Math.floor(Math.random()*secondChoices.length)];
  return [
    weapon,
    pickFrom(eligible.filter(part=>part.slot===firstSlot)),
    pickFrom(eligible.filter(part=>part.slot===secondSlot))
  ].map(part=>part.id);
};
