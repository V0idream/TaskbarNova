import type { Enemy } from './types';
import { enemyGrowth } from './balance';

export type EnemyKind = 'normal' | 'elite' | 'boss';
export type WeaponFamily = 'kinetic' | 'laser' | 'missile';
export type EnemyUnit={id:number;kind:EnemyKind;name:string;x:number;y:number;hp:number;maxHp:number;speed:number;weapons:WeaponFamily[];cooldown:number;laserCharge:number;entered:boolean;exploded:boolean};

export const enemyMeta={normal:{label:'掠袭无人艇',hp:48,speed:46,size:104},elite:{label:'精英截击舰',hp:126,speed:32,size:150},boss:{label:'BOSS 指挥舰',hp:340,speed:19,size:245}};

export function buildStage(danger:number, boss:boolean, sector:number): EnemyUnit[] {
  const pressure=1+Math.max(0,sector-1)*0.16+Math.max(0,danger-5)*0.045;
  const count=Math.max(3,Math.min(8,3+Math.floor(danger*.42)+Math.floor(sector/4)));
  const units:EnemyUnit[]=[];
  for(let i=0;i<count;i++){
    const elite=i>2&&i%5===4;
    const kind:EnemyKind=elite?'elite':'normal';
    const meta=enemyMeta[kind];
    const hp=Math.round((meta.hp+danger*(elite?8:4))*pressure);
    units.push({id:i,kind,name:meta.label,x:840+i*220,y:72+(i*67)%220,hp,maxHp:hp,speed:meta.speed+sector*.8,weapons:elite?['kinetic','laser']:i%3===0?['missile']:i%3===1?['laser']:['kinetic'],cooldown:1.05+i*.2,laserCharge:0,entered:false,exploded:false});
  }
  if(boss){
    const hp=Math.round((enemyMeta.boss.hp+danger*22+sector*42)*pressure);
    units.push({id:99,kind:'boss',name:'BOSS 指挥舰',x:840+count*205,y:190,hp,maxHp:hp,speed:enemyMeta.boss.speed+sector*.65,weapons:['kinetic','laser','missile'],cooldown:1.05,laserCharge:0,entered:false,exploded:false});
  }
  return units;
}

export function applyDamage(damage:number, shield:number, hull:number, evasion=0) {
  if(Math.random()<evasion) return {shield,hull,evaded:true};
  const absorbed=Math.min(shield,damage);
  shield-=absorbed;
  hull-=Math.max(0,damage-absorbed);
  return {shield,hull,evaded:false};
}

export function scaleEnemy(enemy: Enemy, sector:number, danger:number): Enemy {
  const growth=1+Math.max(0,sector-1)*enemyGrowth.hpSector+Math.max(0,danger-4)*enemyGrowth.hpDanger;
  return {
    ...enemy,
    hp:Math.round(enemy.hp*growth+sector*5),
    attack:Math.round(enemy.attack*(1+Math.max(0,sector-1)*enemyGrowth.attackSector)+danger*.7),
    defense:Math.round(enemy.defense*(1+Math.max(0,sector-1)*enemyGrowth.defenseSector)+sector*.7),
    rewardCredits:Math.round(enemy.rewardCredits*(1+sector*.18))
  };
}
