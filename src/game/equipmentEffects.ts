import type { EquipmentSlot, PartRarity, ShipPart, ShipState } from './types';

export type WeaponFamily = 'kinetic' | 'laser' | 'missile';

export interface WeaponProfile {
  slot: 'weapon1' | 'weapon2';
  family: WeaponFamily;
  weaponName: string;
  fireInterval: number;
  projectileSpeed: number;
  damageMultiplier: number;
  projectileColor: string;
  straightOnly: boolean;
  instant: boolean;
  guidance: number;
  rarity: PartRarity;
  visualTier: number;
  variant: 'focus' | 'scatter' | 'rapid' | 'heavy' | 'agile' | 'power';
  hitWidth: number;
}

export interface BattleLoadout {
  weapons: WeaponProfile[];
  primaryFamily: WeaponFamily;
  engineName: string;
  maneuverSpeed: number;
  evasion: number;
  shieldName: string;
  shieldRegen: number;
  radarName: string;
  lockSeconds: number;
  criticalChance: number;
}

const weaponFamily = (part?: ShipPart): WeaponFamily => {
  const id = part?.id ?? '';
  const tags = part?.tags ?? [];
  if (id.includes('swarm') || tags.includes('missile')) return 'missile';
  if (tags.includes('laser') || id.includes('pulse') || id.includes('lance') || id.includes('scatter')) return 'laser';
  return 'kinetic';
};

const tierByRarity:Record<PartRarity,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,anomaly:5};
const colorByFamily=(family:WeaponFamily,tier:number)=>{
  if(family==='laser') return ['#73f5ff','#63f5a8','#48a7ff','#b488ff','#ffcb6b','#ff69d2'][Math.min(5,tier)];
  if(family==='missile') return ['#ffb347','#ffc95c','#ff7b4d','#ff5fc8','#fff06a','#7dffef'][Math.min(5,tier)];
  return ['#eaf7ff','#b8fff0','#8ed8ff','#c2a0ff','#ffdc7a','#f9a6ff'][Math.min(5,tier)];
};

const weaponProfile = (slot: 'weapon1' | 'weapon2', part: ShipPart | undefined, ship: ShipState): WeaponProfile => {
  const family = weaponFamily(part);
  const rarity:PartRarity=part?.rarity ?? 'common';
  const visualTier=tierByRarity[rarity];
  const rarityBoost = 1 + visualTier * 0.28 + (rarity==='anomaly'?0.25:0);
  const tags=part?.tags??[];
  if (family === 'laser') {
    const scatter=tags.includes('scatter');
    return {
      slot, family, weaponName: part?.name ?? '民用脉冲激光器',
      fireInterval: (scatter?0.68:0.92) * (slot === 'weapon1' ? 1 : 1.12),
      projectileSpeed: 0,
      damageMultiplier: (scatter?0.54:0.88) * rarityBoost,
      projectileColor: colorByFamily(family,visualTier),
      straightOnly: true,
      instant: true,
      guidance: 0,
      rarity,
      visualTier,
      variant:scatter?'scatter':'focus',
      hitWidth:scatter?54+visualTier*5:22+visualTier*2
    };
  }
  if (family === 'missile') {
    const power=tags.includes('power');
    return {
      slot, family, weaponName: part?.name ?? '蜂群微导弹舱',
      fireInterval: (power?1.36:.8) * (slot === 'weapon1' ? 1 : 1.12),
      projectileSpeed: (power?430:520) + ship.scan * 21 + visualTier * (power?34:48),
      damageMultiplier: (power?1.92:1.18) * rarityBoost,
      projectileColor: colorByFamily(family,visualTier),
      straightOnly: false,
      instant: false,
      guidance: (power?4.1:5.3) + ship.scan * 0.2 + visualTier * (power?.68:.92),
      rarity,
      visualTier,
      variant:power?'power':'agile',
      hitWidth:power?30+visualTier*5:23+visualTier*4
    };
  }
  const heavy=tags.includes('heavy');
  return {
    slot, family, weaponName: part?.name ?? '工业电磁线圈炮',
    fireInterval: (heavy?1.34:.43) * (slot === 'weapon1' ? 1 : 1.12),
    projectileSpeed: (heavy?720:1040) + ship.attack * (heavy?13:18),
    damageMultiplier: (heavy?1.62:.52) * rarityBoost,
    projectileColor: colorByFamily(family,visualTier),
    straightOnly: false,
    instant: false,
    guidance: 0,
    rarity,
    visualTier,
    variant:heavy?'heavy':'rapid',
    hitWidth:heavy?18+visualTier*2:12+visualTier
  };
};

export function partForEquipmentSlot(slot: EquipmentSlot, equipped: ShipState['equipped'], partById: Map<string, ShipPart>) {
  return partById.get(equipped[slot] ?? '');
}

export function deriveBattleLoadout(ship: ShipState, partById: Map<string, ShipPart>): BattleLoadout {
  const weapon1 = partForEquipmentSlot('weapon1', ship.equipped, partById) ?? partById.get((ship.equipped as Record<string, string>).weapon ?? '');
  const weapon2 = partForEquipmentSlot('weapon2', ship.equipped, partById);
  const engine = partForEquipmentSlot('engine', ship.equipped, partById);
  const shield = partForEquipmentSlot('shield', ship.equipped, partById);
  const radar = partForEquipmentSlot('radar', ship.equipped, partById);
  const weapons = [weaponProfile('weapon1', weapon1, ship), weapon2 ? weaponProfile('weapon2', weapon2, ship) : undefined].filter(Boolean) as WeaponProfile[];
  return {
    weapons,
    primaryFamily: weapons[0]?.family ?? 'laser',
    engineName: engine?.name ?? '基础推进器',
    maneuverSpeed: 86 + ship.speed * 12,
    evasion: Math.min(0.48, 0.03 + ship.speed * 0.018),
    shieldName: shield?.name ?? '基础护盾',
    shieldRegen: Math.max(0, (ship.defense - 3) * 0.14),
    radarName: radar?.name ?? '基础雷达',
    lockSeconds: Math.max(0.45, 3.8 - ship.scan * 0.25),
    criticalChance: Math.min(0.42, 0.05 + ship.scan * 0.018)
  };
}
