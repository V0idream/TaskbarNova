import enemies from '../data/enemies.json';
import type { Enemy, ShipState } from './types';

const enemyTable = enemies as Enemy[];
const roll = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

export function resolveCombat(ship: ShipState, danger: number) {
  const enemy = enemyTable[Math.min(enemyTable.length - 1, Math.max(0, danger - 1))];
  let enemyHp = enemy.hp;
  let hull = ship.hull;
  let shield = ship.shield;
  let rounds = 0;
  while (enemyHp > 0 && hull > 0 && rounds < 24) {
    enemyHp -= Math.max(1, ship.attack - enemy.defense + roll(-2, 2));
    if (enemyHp <= 0) break;
    let damage = Math.max(1, enemy.attack - ship.defense + roll(-2, 2));
    const shieldHit = Math.min(shield, damage); shield -= shieldHit; damage -= shieldHit; hull -= damage; rounds++;
  }
  const won = hull > 0;
  const lootId = won && Math.random() < 0.36 ? enemy.lootTable[Math.floor(Math.random() * enemy.lootTable.length)] : undefined;
  return { won, enemy, hull: won ? hull : 1, shield, lootId, credits: won ? enemy.rewardCredits : 0, alloy: won ? roll(2, 5 + danger) : 0, rounds: rounds + 1 };
}

export function enemyForDanger(danger: number): Enemy {
  return enemyTable[Math.min(enemyTable.length - 1, Math.max(0, danger - 1))];
}
