import type { PartRarity } from './types';

export const SAVE_VERSION = '1.1.0';
export const SUPPORTED_SAVE_VERSIONS = ['0.1.0','0.2.0','0.3.0','0.3.1','0.3.2','0.3.3','0.3.4','0.3.5','0.3.6','0.3.7','0.3.8','0.3.9','0.4.0','0.4.1','0.5.0','0.5.1','0.6.0','1.0.0','1.0.1','1.1.0'];
export const rarityRanks: PartRarity[] = ['common','uncommon','rare','epic','legendary','anomaly'];

export const baseStats = { maxHull:100, maxShield:40, maxFuel:100, maxEnergy:12, attack:8, defense:3, speed:5, scan:3, cargoMax:20, fuelEfficiency:0 };

export const enemyGrowth = {
  hpSector: 0.17,
  hpDanger: 0.05,
  attackSector: 0.10,
  defenseSector: 0.08
};

export const battleTuning = {
  playerDamageScale: 0.72,
  playerCriticalMultiplier: 1.45,
  playerMissileMaxHitRatio: 0.55,
  playerOtherMaxHitRatio: 0.44,
  playerMissileTurnBonus: 1.65,
  playerMissileWeaveBase: 8,
  playerMissileWeavePerTier: 2,
  playerMissileProximityBase: 28,
  playerMissileProximityPerTier: 6,
  enemyMissileTurnBonus: 1,
  enemyMissileWeaveBase: 42,
  enemyMissileWeavePerTier: 8
};
