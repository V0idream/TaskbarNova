import { create } from 'zustand';
import partsJson from '../data/parts.json';
import { baseStats, rarityRanks, SAVE_VERSION, SUPPORTED_SAVE_VERSIONS } from './balance';
import { dialogueFor } from './dialogue';
import { enemyForDanger } from './combat';
import { partCost, partPrice } from './economy';
import { makeLootNotice, randomPart, rareTrigger, shopRoll } from './loot';
import { scaleEnemy } from './battleModel';
import { findDirectedPath, travelDurationMs } from './routePlanner';
import { generateStarMap } from './starMapGenerator';
import { generateStation } from './stationGenerator';
import { maybeCreateTravelEvent } from './travelEvents';
import type { CombatStyle, DialogueTrigger, EquipmentSlot, GameMode, GameState, PilotId, Settings, ShipPart, ShipState, StarMap, TacticalPreference, TravelLeg } from './types';

export const parts = partsJson as ShipPart[];
export const partById = new Map(parts.map(part => [part.id, part]));

const starterEquipped: Partial<Record<EquipmentSlot,string>> = { weapon1:'weapon_pulse_01', weapon2:'weapon_massdriver_01', engine:'engine_chem_01', shield:'shield_plate_01', radar:'radar_short_01', core:'core_cell_01' };
const industrialStarter:Record<string,string>={
  weapon_pulse_01:'weapon_focus_02',
  weapon_massdriver_01:'weapon_rapid_02',
  weapon_micro_missile_01:'weapon_agile_02'
};

export const pilots: Record<PilotId, { id: PilotId; name: string; skillName: string; skillDescription: string }> = {
  nova: { id:'nova', name:'Nova', skillName:'曙光回流', skillDescription:'战斗胜利后修复 18 点舰体，并提高战斗记忆回收率。' },
  lumi: { id:'lumi', name:'Lumi', skillName:'幸运星工坊', skillDescription:'获得零件时提高稀有、史诗、传说装置出现概率。' }
};

function calculatedShip(ship: ShipState, equipped = ship.equipped): ShipState {
  const totals = { ...baseStats };
  const normalized = normalizeEquipped(equipped);
  Object.values(normalized).forEach(id => {
    const part = id ? partById.get(id) : undefined;
    if (!part) return;
    Object.entries(part.stats).forEach(([key,value]) => {
      if (typeof value === 'number') (totals as Record<string,number>)[key] += value;
    });
  });
  return {
    ...ship, ...totals, equipped: normalized,
    hull:Math.min(ship.hull,totals.maxHull), shield:Math.min(ship.shield,totals.maxShield),
    fuel:Math.min(ship.fuel,totals.maxFuel), cargoUsed:Math.min(ship.cargoUsed,totals.cargoMax)
  };
}

function normalizeEquipped(equipped: ShipState['equipped'] | Record<string,string|undefined> | undefined): Partial<Record<EquipmentSlot,string>> {
  const raw = (equipped ?? {}) as Record<string,string|undefined>;
  return {
    weapon1: raw.weapon1 ?? raw.weapon,
    weapon2: raw.weapon2,
    engine: raw.engine,
    shield: raw.shield,
    radar: raw.radar,
    core: raw.core ?? 'core_cell_01'
  };
}

export function energyUsed(equipped: ShipState['equipped'] | Record<string,string|undefined>): number {
  return Object.values(normalizeEquipped(equipped)).reduce((sum,id)=>sum+(id?partById.get(id)?.energyCost??0:0),0);
}

export function shipEnergyUsed(ship: ShipState): number {
  return energyUsed(ship.equipped);
}

function normalizePilot(pilot: Partial<GameState['pilot']> | undefined, fallback: PilotId = 'nova'): GameState['pilot'] {
  const id = pilot?.id === 'lumi' ? 'lumi' : fallback;
  const base = pilots[id];
  return { id, name: base.name, skillName: base.skillName, skillDescription: base.skillDescription, syncLevel: pilot?.syncLevel ?? 1, syncExp: pilot?.syncExp ?? 15, mood: pilot?.mood ?? 'neutral' };
}

const makeLeg = (fromId:string, queue:string[], map:StarMap, ship:ShipState):TravelLeg|undefined => {
  const toId = queue[0];
  if (!toId) return undefined;
  const edge = map.edges.find(candidate => candidate.from === fromId && candidate.to === toId);
  return { fromId, toId, durationMs:travelDurationMs(edge?.distance ?? 20, ship.speed), elapsedMs:0 };
};

const makeInitial = (): GameState => {
  const map = generateStarMap(1);
  const ship = calculatedShip({ name:'曙光号', hull:100, shield:40, fuel:100, cargoUsed:4, equipped:starterEquipped, ...baseStats });
  return {
    version:SAVE_VERSION, createdAt:Date.now(), updatedAt:Date.now(), hydrated:false, mode:'start', collapsed:false,
    currentSector:1, currentNodeId:map.nodes[0].id, resources:{credits:180,alloy:12,memoryFragments:0}, ship,
    pilot:normalizePilot(undefined,'nova'),
    tacticalComputer:{style:'frontal',preference:'balanced'},
    inventory:['weapon_pulse_01','weapon_massdriver_01','weapon_micro_missile_01','engine_chem_01','shield_plate_01','radar_short_01','core_cell_01','engine_ion_01'],
    discoveredParts:['weapon_pulse_01','weapon_massdriver_01','weapon_micro_missile_01','engine_chem_01','shield_plate_01','radar_short_01','core_cell_01','engine_ion_01'],
    starMap:map, selectedRoute:[map.nodes[0].id], travelQueue:[], travelLeg:undefined, travelTimeScale:1,
    battleEncounter:undefined, stationRooms:[], currentDialogue:dialogueFor('boot','nova').text,
    eventLog:['跃迁导航系统已上线。现在可直接点击远端节点规划多段跃迁路线。'],
    shopPartIds:['weapon_scatter_01','engine_vector_01','shield_bubble_01'],
    settings:{alwaysOnTop:true,opacity:1,dialogueFrequency:'normal',reduceMotion:false,doNotDisturb:false,battleScale:1,battleView:'side',navigationStyle:'balanced',defaultTravelScale:1,defaultBattleScale:1},
    fittingReturnMode:undefined,cockpitAutoResume:false,autopilotEnabled:false
  };
};

type BattleFinish = { won:boolean; hull:number; shield:number; durationSeconds:number; shotsFired:number; hits:number };
type Actions = {
  chooseStarter(pilotId:PilotId, weaponId:string): void; setTacticalComputer(slot:'style',value:CombatStyle):void; setTacticalComputer(slot:'preference',value:TacticalPreference):void;
  hydrate(): Promise<void>; setMode(mode: GameMode): void; openFitting():void; closeFitting():void; planNode(id: string): void; startTravel(): void;
  tickTravel(realDeltaMs:number):void; setTravelTimeScale(scale:1|4|12):void; advanceTravel(): void;
  finishBattle(result:BattleFinish):void; rollbackBattle():void; endJourney():void; resolveEventChoice(optionId:string):void; resumeFromSupply(): void; repair(): void; refuel(): void;
  buyPart(id:string): void; sellPart(id:string):void; sellLowTier():void; synthesizeMemory():void; equipPart(id:string, slot?: EquipmentSlot): void; selectPilot(id:PilotId): void; visitRoom(id:string): void; interact(): void;
  setSetting<K extends keyof Settings>(key:K,value:Settings[K]):void; toggleCollapse():void; clearLootNotice():void; resetGame():void;
  setAutopilot(enabled:boolean):void; tickAutopilot():void;
};

const appendLog = (log:string[], message:string) => [message, ...log].slice(0,8);
const withDialogue = (trigger:DialogueTrigger, pilotId:PilotId='nova') => dialogueFor(trigger,pilotId);
const normalizedSync = (pilot:GameState['pilot']):GameState['pilot'] => {
  const syncExp=Math.max(0,Math.min(100,pilot.syncExp));
  return {...pilot,syncExp,syncLevel:syncExp>=80?3:syncExp>=35?2:1};
};
const battleSnapshot = (state:GameState, overrides:Partial<GameState>):Partial<GameState> => JSON.parse(JSON.stringify({...state,...overrides,battleSnapshot:undefined,eventChoice:undefined,lootNotice:undefined}));

export function routeMetrics(state:GameState) {
  let fuel=0,danger=0,reward=0,durationMs=0;
  for(let i=1;i<state.selectedRoute.length;i++){
    const edge=state.starMap.edges.find(e=>e.from===state.selectedRoute[i-1]&&e.to===state.selectedRoute[i]);
    const node=state.starMap.nodes.find(n=>n.id===state.selectedRoute[i]);
    fuel += edge?.fuelCost ?? 0; danger += node?.danger ?? 0; reward += node?.rewardLevel ?? 0;
    durationMs += travelDurationMs(edge?.distance ?? 20, state.ship.speed);
  }
  fuel=Math.ceil(fuel*(1-Math.min(.5,state.ship.fuelEfficiency)));
  const minutes=Math.max(0,Math.round(durationMs/60000));
  return {fuel,danger,reward,durationMs,durationLabel:minutes<1?'< 1 分钟':`约 ${minutes} 分钟`,label:danger<=3?'安全':danger<=7?'警戒':danger<=11?'高危':'异常'};
}

export { partCost, partPrice };
export const memorySynthesisCost=(sector:number)=>({alloy:8,credits:70+sector*15});

const partPower=(part:ShipPart)=>rarityRanks.indexOf(part.rarity)*100+
  Object.values(part.stats).reduce((sum,value)=>sum+(typeof value==='number'?value:0),0);

const nextAutoEquip=(state:GameState):{id:string;slot:EquipmentSlot}|undefined=>{
  const ownedParts=state.inventory.map(id=>partById.get(id)).filter((part):part is ShipPart=>Boolean(part));
  const byPower=(a:ShipPart,b:ShipPart)=>partPower(b)-partPower(a);
  const bestCore=ownedParts.filter(part=>part.slot==='core').sort(byPower)[0];
  const energyHeadroom=state.ship.maxEnergy-energyUsed(state.ship.equipped);
  if(energyHeadroom<=2&&bestCore&&state.ship.equipped.core!==bestCore.id)return {id:bestCore.id,slot:'core'};
  const slots:EquipmentSlot[]=['shield','engine','radar','weapon1','weapon2'];
  for(const slot of slots){
    const partSlot=slot.startsWith('weapon')?'weapon':slot;
    const current=partById.get(state.ship.equipped[slot]??'');
    const currentScore=current?partPower(current):-1;
    const candidates=ownedParts.filter(part=>part.slot===partSlot&&partPower(part)>currentScore).sort(byPower);
    for(const candidate of candidates){
      const equipped={...state.ship.equipped,[slot]:candidate.id};
      const ownedCount=state.inventory.filter(id=>id===candidate.id).length;
      if(Object.values(equipped).filter(id=>id===candidate.id).length>ownedCount)continue;
      if(energyUsed(equipped)>state.ship.maxEnergy)continue;
      return {id:candidate.id,slot};
    }
  }
};

export const useGameStore = create<GameState & Actions>((set,get) => ({
  ...makeInitial(),
  chooseStarter: (pilotId, weaponId) => set(state => {
    if(state.mode!=='start') return state;
    const weapon=partById.get(weaponId);
    if(!weapon||weapon.slot!=='weapon') return state;
    const upgraded=partById.get(industrialStarter[weaponId])??weapon;
    const pilot=normalizePilot(undefined,pilotId);
    const equipped={...state.ship.equipped,weapon1:upgraded.id};
    const inventory=[...state.inventory,upgraded.id];
    return {
      mode:'starMap',
      pilot,
      ship:calculatedShip(state.ship,equipped),
      inventory,
      discoveredParts:[...new Set([...state.discoveredParts,upgraded.id])],
      currentDialogue:dialogueFor('boot',pilot.id).text,
      shopPartIds:shopRoll(parts,pilot.id==='lumi',state.currentSector),
      eventLog:appendLog(state.eventLog,`${pilot.name} 锁定驾驶席，初始武器已整备为工业级「${upgraded.name}」。`)
    };
  }),
  setTacticalComputer: (slot, value) => set(state => ({
    tacticalComputer: slot==='style'
      ? {...state.tacticalComputer,style:value as CombatStyle}
      : {...state.tacticalComputer,preference:value as TacticalPreference},
    eventLog:appendLog(state.eventLog, slot==='style'?'作战风格已写入作战电脑。':'战术偏好已写入作战电脑。')
  })),
  hydrate: async () => {
    let loaded: Partial<GameState>|null = null;
    try {
      loaded = window.taskbarNova ? await window.taskbarNova.loadSave() as Partial<GameState>|null : JSON.parse(localStorage.getItem('taskbar-nova-save')||'null');
    } catch { loaded = null; }
    if (loaded && SUPPORTED_SAVE_VERSIONS.includes(loaded.version ?? '')) {
      const fresh=makeInitial();
      const migrated={...fresh,...loaded,version:SAVE_VERSION,hydrated:true,collapsed:false,settings:{...fresh.settings,...loaded.settings},tacticalComputer:{...fresh.tacticalComputer,...loaded.tacticalComputer}} as GameState;
      migrated.ship=calculatedShip({...fresh.ship,...loaded.ship,equipped:normalizeEquipped(loaded.ship?.equipped)});
      migrated.resources={
        credits:loaded.resources?.credits??fresh.resources.credits,
        alloy:loaded.resources?.alloy??fresh.resources.alloy,
        memoryFragments:loaded.resources?.memoryFragments??fresh.resources.memoryFragments
      };
      migrated.pilot=normalizePilot(loaded.pilot);
      migrated.inventory=loaded.inventory?.length?[...loaded.inventory]:[...fresh.inventory];
      migrated.discoveredParts=[...new Set([...fresh.discoveredParts,...(loaded.discoveredParts??[])])];
      if(loaded.version==='0.1.0'||loaded.version==='0.2.0') Object.assign(migrated,{mode:'starMap',travelQueue:[],travelLeg:undefined,battleEncounter:undefined,travelTimeScale:1,selectedRoute:[loaded.currentNodeId??fresh.currentNodeId]});
      set(migrated);
    } else set({hydrated:true});
  },
  setMode: mode => set(state => ({mode,cockpitAutoResume:state.mode==='cockpit'&&mode!=='cockpit'?false:state.cockpitAutoResume})),
  openFitting: () => set(state => ({
    mode:'fitting',
    fittingReturnMode:state.mode==='fitting'
      ? (state.fittingReturnMode??'starMap')
      : state.mode==='battle'?'battle'
      : state.mode==='travel'?'travel'
      : state.mode==='cockpit'?'cockpit'
      : state.mode==='supply'?'supply'
      : state.mode==='station'?'station'
      : 'starMap',
    lootNotice:undefined
  })),
  closeFitting: () => set(state => {
    const requested=state.fittingReturnMode??(state.travelLeg?'travel':'starMap');
    const mode:GameMode=requested==='battle'&&state.battleEncounter?'battle'
      : requested==='travel'&&state.travelLeg?'travel'
      : requested==='cockpit'?'cockpit'
      : requested==='supply'?'supply'
      : requested==='station'&&state.stationRooms.length?'station'
      : 'starMap';
    return {mode,fittingReturnMode:undefined,lootNotice:undefined};
  }),
  planNode: id => set(state => {
    if(state.mode!=='starMap') return state;
    const route=[...state.selectedRoute];
    const existingIndex=route.indexOf(id);
    if(existingIndex>=0) return {selectedRoute:route.slice(0,existingIndex+1)};
    const path=findDirectedPath(state.starMap,route.at(-1)!,id);
    if(!path) return {...state,eventLog:appendLog(state.eventLog,'该目标不在当前航线的前进方向。')};
    const extended=[...route,...path.slice(1)];
    const dialogue=withDialogue('route_planned',state.pilot.id);
    return {selectedRoute:extended,currentDialogue:dialogue.text,pilot:{...state.pilot,mood:dialogue.mood},eventLog:appendLog(state.eventLog,`已自动规划至 ${state.starMap.nodes.find(n=>n.id===id)?.name}，共 ${extended.length-1} 段。`)};
  }),
  startTravel: () => set(state => {
    const metrics=routeMetrics(state);
    if(state.selectedRoute.length<2||state.ship.hull<=0||state.ship.fuel<metrics.fuel){
      const dialogue=withDialogue(state.ship.fuel<metrics.fuel?'low_fuel':'low_hull',state.pilot.id);
      return {currentDialogue:dialogue.text,pilot:{...state.pilot,mood:dialogue.mood},eventLog:appendLog(state.eventLog,'出航条件不足，请检查航线、燃料和舰体。')};
    }
    const queue=state.selectedRoute.slice(1);
    return {mode:'travel',travelTimeScale:state.settings.defaultTravelScale,travelQueue:queue,travelLeg:makeLeg(state.currentNodeId,queue,state.starMap,state.ship),eventLog:appendLog(state.eventLog,`自动航行已启动，预计 ${metrics.durationLabel}。`)};
  }),
  tickTravel: realDeltaMs => {
    const state=get();
    if(!state.travelLeg||state.mode==='battle'||state.eventChoice) return;
    const elapsed=state.travelLeg.elapsedMs+Math.max(0,realDeltaMs)*state.travelTimeScale;
    if(elapsed>=state.travelLeg.durationMs){
      if(state.mode==='fitting'){
        if(state.travelLeg.elapsedMs<state.travelLeg.durationMs) set({travelLeg:{...state.travelLeg,elapsedMs:state.travelLeg.durationMs},eventLog:appendLog(state.eventLog,'已抵达下一航点。当前正在改装，战斗/事件切入暂缓。')});
        return;
      }
      set({
        travelLeg:{...state.travelLeg,elapsedMs:state.travelLeg.durationMs},
        mode:state.mode==='cockpit'?'travel':state.mode,
        cockpitAutoResume:state.cockpitAutoResume||state.mode==='cockpit'
      });
      get().advanceTravel();
    } else set({travelLeg:{...state.travelLeg,elapsedMs:elapsed}});
  },
  setTravelTimeScale: scale => set({travelTimeScale:scale}),
  advanceTravel: () => set(state => {
    const nextId=state.travelLeg?.toId??state.travelQueue[0];
    if(!nextId) return {mode:'starMap',selectedRoute:[state.currentNodeId],travelLeg:undefined};
    const node=state.starMap.nodes.find(n=>n.id===nextId)!;
    const edge=state.starMap.edges.find(e=>e.from===state.currentNodeId&&e.to===nextId);
    const fuelCost=Math.ceil((edge?.fuelCost??5)*(1-Math.min(.5,state.ship.fuelEfficiency)));
    let ship={...state.ship,fuel:Math.max(0,state.ship.fuel-fuelCost)};
    let resources={...state.resources}; let inventory=[...state.inventory]; let discovered=[...state.discoveredParts];
    let pilot={...state.pilot}; let mode:GameMode='travel'; const queue=state.travelQueue.slice(1);
    let dialogue=withDialogue('route_planned',state.pilot.id); let message=`抵达 ${node.name}。`; let battleEncounter=state.battleEncounter;
    if(node.type==='battle'||node.type==='boss'){
      const baseEnemy=scaleEnemy(enemyForDanger(node.danger+Math.floor(state.currentSector/2)),state.currentSector,node.danger);
      const enemy=node.type==='boss'?{...baseEnemy,id:`boss_${baseEnemy.id}`,name:'深空封锁核心',hp:baseEnemy.hp+120+state.currentSector*35,attack:baseEnemy.attack+6+state.currentSector*2,defense:baseEnemy.defense+4+state.currentSector,rewardCredits:baseEnemy.rewardCredits+160}:baseEnemy;
      mode='battle'; battleEncounter={enemy,danger:node.danger,nodeId:node.id,returnMode:'travel'};
      dialogue=withDialogue('route_planned',state.pilot.id); message=`侦测到 ${battleEncounter.enemy.name}，自动战斗系统接管。`;
    } else if(node.type==='salvage'){
      const found=randomPart(parts,Math.min(5,node.rewardLevel+Math.floor(state.currentSector/3)), state.pilot.id==='lumi'); resources.alloy+=5+node.rewardLevel+state.currentSector; inventory.push(found.id); discovered=[...new Set([...discovered,found.id])];
      dialogue=withDialogue(rareTrigger(found)?'rare_part_found':'part_found',state.pilot.id); message=`残骸云中回收 ${found.name}，并取得可用合金。`;
      if(Math.random()<.45&&resources.alloy>=6){resources.alloy-=6;resources.credits+=40+state.currentSector*12;message+=' 额外熔炼 6 合金换取了信用点。'}
    } else if(node.type==='anomaly'){
      resources.alloy+=4+Math.ceil(state.currentSector/2); resources.credits+=25+state.currentSector*6; pilot.syncExp+=4; dialogue=withDialogue('memory_found',state.pilot.id); message=`异常信号凝结为可回收辉晶，合金与信用点增加，${state.pilot.name} 同步率上升。`;
      if(resources.memoryFragments>0&&Math.random()<.55){resources.memoryFragments-=1;const found=randomPart(parts,Math.min(5,node.rewardLevel+1),true);inventory.push(found.id);discovered=[...new Set([...discovered,found.id])];message+=` 消耗 1 枚记忆碎片稳定回波，析出 ${found.name}。`;}
    } else if(node.type==='story'){
      resources.memoryFragments+=1+Math.floor(state.currentSector/3); resources.alloy+=2; pilot.syncExp+=5; dialogue=withDialogue('memory_found',state.pilot.id); message='旧日航标释放出记忆碎片与少量稀有合金。';
    } else if(node.type==='supply'){
      mode='supply'; dialogue=withDialogue('supply_enter',state.pilot.id); message='已脱离跃迁并停靠补给站。';
    } else if(node.type==='station'){
      mode='station'; queue.splice(0); dialogue=withDialogue('station_enter',state.pilot.id); message='进入废弃维修站 B-17。';
    }
    if(mode==='travel'&&queue.length===0) mode='starMap';
    pilot=normalizedSync({...pilot,mood:dialogue.mood});
    const nextLeg=mode==='travel'?makeLeg(nextId,queue,state.starMap,ship):undefined;
    if(mode==='starMap'&&queue.length===0&&node.x>85&&node.type!=='battle'&&node.type!=='boss'){
      const sector=state.currentSector+1; const map=generateStarMap(sector);
      resources.credits+=80+sector*18; resources.alloy+=6+sector; resources.memoryFragments+=node.type==='story'||node.type==='anomaly'?1:0;
      return {ship,resources,inventory,discoveredParts:discovered,pilot,mode:'starMap',travelQueue:[],travelLeg:undefined,battleEncounter:undefined,currentSector:sector,currentNodeId:map.nodes[0].id,selectedRoute:[map.nodes[0].id],starMap:map,currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,`${message} 星区资料已刷新，Sector ${String(sector).padStart(2,'0')} 开启。`),shopPartIds:shopRoll(parts,state.pilot.id==='lumi',sector),lootNotice: inventory.length>state.inventory.length ? makeLootNotice(partById.get(inventory[inventory.length-1])!,'星区结算') : state.lootNotice};
    }
    const eventChoice=maybeCreateTravelEvent(node,state.currentSector,resources);
    if(state.cockpitAutoResume&&mode==='travel'&&!eventChoice) mode='cockpit';
    const nextState = {
      ship,resources,inventory,discoveredParts:discovered,pilot,mode,travelQueue:queue,travelLeg:nextLeg,battleEncounter,currentNodeId:nextId,
      settings:mode==='battle'?{...state.settings,battleScale:state.settings.defaultBattleScale}:state.settings,
      selectedRoute:mode==='starMap'?[nextId]:state.selectedRoute,stationRooms:node.type==='station'?generateStation():state.stationRooms,
      currentRoomId:node.type==='station'?'entrance':state.currentRoomId,currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,message),
      starMap:{...state.starMap,nodes:state.starMap.nodes.map(n=>n.id===nextId?{...n,visited:true}:n)},shopPartIds:node.type==='supply'?shopRoll(parts,state.pilot.id==='lumi',state.currentSector):state.shopPartIds,
      lootNotice: mode==='battle'?undefined:(inventory.length>state.inventory.length ? makeLootNotice(partById.get(inventory[inventory.length-1])!, node.type==='salvage'?'跃迁回收':'随机事件') : state.lootNotice),
      eventChoice:mode==='battle'?undefined:(eventChoice??state.eventChoice)
    };
    return {...nextState,battleSnapshot:mode==='battle'?battleSnapshot(state,nextState):state.battleSnapshot};
  }),
  finishBattle: result => set(state => {
    const encounter=state.battleEncounter;
    if(!encounter) return state;
    let resources={...state.resources}; let inventory=[...state.inventory]; let discovered=[...state.discoveredParts]; let pilot={...state.pilot};
    const postHeal=result.won&&state.pilot.id==='nova'?18:0;
    const ship={...state.ship,hull:Math.min(state.ship.maxHull,Math.max(1,result.hull)+postHeal),shield:result.won?state.ship.maxShield:Math.max(0,result.shield)};
    const dialogue=withDialogue(result.won?'battle_win':'battle_lose',state.pilot.id); let mode:GameMode; let lootNotice=state.lootNotice;
    let queue=[...state.travelQueue]; let selectedRoute=state.selectedRoute; let message:string;
    if(result.won){
      resources.credits+=encounter.enemy.rewardCredits; resources.alloy+=3+encounter.danger; pilot.syncExp+=3;
      if(encounter.enemy.id.includes('boss')||Math.random()<(state.pilot.id==='nova'?.34:.18)){
        resources.memoryFragments+=encounter.enemy.id.includes('boss')?2:1;
      }
      message=`实战击破 ${encounter.enemy.name}：${result.shotsFired} 发 / ${result.hits} 命中，耗时 ${result.durationSeconds.toFixed(1)} 秒。护盾已自动回满。${postHeal?' Nova「曙光回流」修复 18 点舰体，并强化了记忆回收链路。':''}`;
      if(Math.random()<.45&&encounter.enemy.lootTable.length){
        const lootId=state.pilot.id==='lumi'&&Math.random()<.6?randomPart(parts,Math.min(5,3+Math.floor(state.currentSector/2)),true).id:encounter.enemy.lootTable[Math.floor(Math.random()*encounter.enemy.lootTable.length)];
        inventory.push(lootId);discovered=[...new Set([...discovered,lootId])];
        const loot=partById.get(lootId); if(loot){lootNotice=makeLootNotice(loot,'战斗回收'); message+=` 获得 ${loot.name}。`;}
      }
      mode=encounter.returnMode==='station'?'station':queue.length?(state.cockpitAutoResume?'cockpit':'travel'):'starMap';
    }else{
      message=`战斗失利，${encounter.enemy.name} 迫使飞船撤退。请选择时空回溯或结束旅程。`;
      return {ship:{...state.ship,hull:Math.max(1,result.hull),shield:Math.max(0,result.shield)},mode:'defeat',currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,message)};
    }
    if(mode==='starMap') selectedRoute=[state.currentNodeId];
    const node=state.starMap.nodes.find(n=>n.id===encounter.nodeId);
    if(result.won&&mode==='starMap'&&encounter.returnMode==='travel'&&node&&node.x>85){
      const sector=state.currentSector+1; const map=generateStarMap(sector);
      resources.credits+=110+sector*24; resources.alloy+=10+sector*2; pilot.syncExp+=8;
      return {ship,resources,inventory,discoveredParts:discovered,pilot:normalizedSync({...pilot,mood:dialogue.mood}),mode:'starMap',travelQueue:[],travelLeg:undefined,battleEncounter:undefined,currentSector:sector,currentNodeId:map.nodes[0].id,selectedRoute:[map.nodes[0].id],starMap:map,currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,`${message} 封锁解除，Sector ${String(sector).padStart(2,'0')} 开启。`),shopPartIds:shopRoll(parts,state.pilot.id==='lumi',sector),lootNotice,cockpitAutoResume:false};
    }
    return {ship,resources,inventory,discoveredParts:discovered,pilot:normalizedSync({...pilot,mood:dialogue.mood}),mode,travelQueue:queue,
      travelLeg:(mode==='travel'||mode==='cockpit')?makeLeg(state.currentNodeId,queue,state.starMap,ship):undefined,battleEncounter:undefined,selectedRoute,currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,message),lootNotice,battleSnapshot:undefined};
  }),
  rollbackBattle: () => set(state => {
    if(!state.battleSnapshot) return state;
    const restored={...state.battleSnapshot,hydrated:true,mode:'fitting' as GameMode,fittingReturnMode:'battle' as const,battleSnapshot:undefined,lootNotice:undefined,eventLog:appendLog(state.battleSnapshot.eventLog??state.eventLog,'时空回溯完成：战前状态已恢复，请先调整装备。')} as Partial<GameState>;
    return restored;
  }),
  endJourney: () => {const fresh=makeInitial();set({...fresh,hydrated:true,eventLog:['旅程已结束。请重新选择驾驶员与初始武器。']});},
  resolveEventChoice: optionId => set(state => {
    const choice=state.eventChoice;
    if(!choice) return state;
    const option=choice.options.find(item=>item.id===optionId);
    if(!option) return state;
    if(option.disabledReason) return {...state,eventLog:appendLog(state.eventLog,option.disabledReason)};
    const resources={...state.resources}; const inventory=[...state.inventory]; let discovered=[...state.discoveredParts]; let pilot={...state.pilot}; let ship={...state.ship}; let lootNotice=state.lootNotice; let message='';
    if(optionId==='alloy'){resources.alloy+=8+state.currentSector;message='稳妥拆解完成，合金储备增加。';}
    if(optionId==='credits'){resources.alloy-=4;resources.credits+=90+state.currentSector*22;message='反应堆脉冲点火成功，换取了信用点。';}
    if(optionId==='energy'){resources.alloy+=5+state.currentSector;resources.credits+=30+state.currentSector*8;message='异常辉晶已完成拆解，合金与信用点增加。';}
    if(optionId==='memory-scan'){
      resources.memoryFragments-=1;
      const found=randomPart(parts,Math.min(5,2+Math.floor(state.currentSector/2)),true);
      inventory.push(found.id); discovered=[...new Set([...discovered,found.id])]; lootNotice=makeLootNotice(found,'记忆校准');
      message=`记忆回波稳定，析出 ${found.name}。`;
    }
    if(optionId==='memory'){resources.memoryFragments+=1;pilot.syncExp+=5;message='私人频段已保存为记忆碎片，同步率上升。';}
    if(optionId==='sell-memory'){resources.memoryFragments-=1;resources.credits+=120+state.currentSector*20;message='私人频段已出售，信用点增加。';}
    if(optionId==='drone-salvage'){resources.alloy+=13+state.currentSector;resources.credits+=25;message='维修蜂群已安全停机，合金与可兑现组件并入库存。';}
    if(optionId==='drone-repair'){resources.alloy-=5;ship.hull=Math.min(ship.maxHull,ship.hull+30+state.currentSector*2);message='维修蜂群完成临时补强，舰体裂隙已封闭。';}
    if(optionId==='cargo-armory'){resources.alloy-=5;const found=randomPart(parts,Math.min(5,2+Math.floor(state.currentSector/2)),state.pilot.id==='lumi');inventory.push(found.id);discovered=[...new Set([...discovered,found.id])];lootNotice=makeLootNotice(found,'漂流军械柜');message=`消耗 5 合金破除封锁，回收 ${found.name}。`;}
    if(optionId==='cargo-civilian'){resources.credits+=75+state.currentSector*18;ship.fuel=Math.min(ship.maxFuel,ship.fuel+22);message='民用货柜内的燃料与票据仍可使用。';}
    if(optionId==='phase-shield'){resources.alloy-=4;ship.shield=ship.maxShield;message='以 4 合金重构导流框架，静止闪电被引入护盾。';}
    if(optionId==='phase-listen'){resources.memoryFragments+=1;pilot.syncExp+=9;message='低语被完整记录，驾驶员同步率上升。';}
    if(optionId==='comet-alloy'){resources.alloy+=15+state.currentSector*2;ship.hull=Math.max(1,ship.hull-6);message='倒流彗核被截获，擦碰造成轻微舰体损伤。';}
    if(optionId==='comet-record'){resources.memoryFragments+=1;resources.credits+=45;pilot.syncExp+=6;message='扫描阵列保存了完整的时间倒流曲线，并取得研究酬金。';}
    if(optionId==='rescue-signal'){resources.credits-=45;resources.alloy+=9+state.currentSector;pilot.syncExp+=10;message='坐标已交还公共救援网，对方回传了感谢与物资。';}
    if(optionId==='sell-coordinates'){resources.credits+=105+state.currentSector*16;message='陌生坐标已转手给拾荒者。';}
    if(optionId==='archive-song'){resources.alloy-=6;resources.memoryFragments+=2;message='观测档案获得新外壳，那首歌被完整保留下来。';}
    if(optionId==='broadcast-song'){resources.credits+=45;pilot.syncExp+=7;message='频谱歌在公共频道播出，几艘路过舰船发来了小额酬谢。';}
    return {resources,ship,inventory,discoveredParts:discovered,pilot:normalizedSync(pilot),lootNotice,eventChoice:undefined,mode:state.cockpitAutoResume&&state.travelLeg?'cockpit':state.mode,eventLog:appendLog(state.eventLog,message)};
  }),
  resumeFromSupply: () => set(state => {
    const current=state.starMap.nodes.find(node=>node.id===state.currentNodeId);
    if(!state.travelQueue.length&&current&&current.x>85){
      const sector=state.currentSector+1;
      const map=generateStarMap(sector);
      return {
        mode:'starMap' as GameMode,
        currentSector:sector,
        currentNodeId:map.nodes[0].id,
        starMap:map,
        selectedRoute:[map.nodes[0].id],
        travelLeg:undefined,
        battleEncounter:undefined,
        cockpitAutoResume:false,
        resources:{...state.resources,credits:state.resources.credits+80+sector*18,alloy:state.resources.alloy+6+sector},
        shopPartIds:shopRoll(parts,state.pilot.id==='lumi',sector),
        eventLog:appendLog(state.eventLog,`末端补给完成，Sector ${String(sector).padStart(2,'0')} 航路已开放。`)
      };
    }
    const mode:GameMode=state.travelQueue.length?(state.cockpitAutoResume?'cockpit':'travel'):'starMap';
    return {mode,travelLeg:(mode==='travel'||mode==='cockpit')?makeLeg(state.currentNodeId,state.travelQueue,state.starMap,state.ship):undefined,selectedRoute:mode==='starMap'?[state.currentNodeId]:state.selectedRoute};
  }),
  repair: () => set(state => {const missing=state.ship.maxHull-state.ship.hull,cost=Math.min(state.resources.credits,Math.ceil(missing*.8)),gain=Math.floor(cost/.8);return {ship:{...state.ship,hull:Math.min(state.ship.maxHull,state.ship.hull+gain)},resources:{...state.resources,credits:state.resources.credits-cost},eventLog:appendLog(state.eventLog,`维修完成，消耗 ${cost} 信用点。`)}}),
  refuel: () => set(state => {const missing=state.ship.maxFuel-state.ship.fuel,cost=Math.min(state.resources.credits,Math.ceil(missing*.5)),gain=Math.floor(cost/.5);return {ship:{...state.ship,fuel:Math.min(state.ship.maxFuel,state.ship.fuel+gain)},resources:{...state.resources,credits:state.resources.credits-cost},eventLog:appendLog(state.eventLog,`燃料补充 ${gain} 点。`)}}),
  buyPart: id => set(state => {const part=partById.get(id);if(!part)return state;const cost=partCost(part,state.currentSector);if(state.resources.credits<cost.credits||state.resources.alloy<cost.alloy||state.resources.memoryFragments<cost.memory)return {...state,eventLog:appendLog(state.eventLog,'资源不足：高级装备需要信用点、合金与记忆碎片共同结算。')};return {resources:{...state.resources,credits:state.resources.credits-cost.credits,alloy:state.resources.alloy-cost.alloy,memoryFragments:state.resources.memoryFragments-cost.memory},inventory:[...state.inventory,id],discoveredParts:[...new Set([...state.discoveredParts,id])],shopPartIds:state.shopPartIds.filter(x=>x!==id),lootNotice:makeLootNotice(part,'商店购入'),eventLog:appendLog(state.eventLog,`购入 ${part.name}。`)}}),
  sellPart: id => set(state => {
    const part=partById.get(id);if(!part)return state;
    const owned=state.inventory.filter(item=>item===id).length;
    const equipped=Object.values(state.ship.equipped).filter(item=>item===id).length;
    if(owned<=equipped)return {...state,eventLog:appendLog(state.eventLog,`无法出售 ${part.name}：没有未安装的库存。`)};
    const inventory=[...state.inventory];inventory.splice(inventory.indexOf(id),1);
    const credits=Math.max(1,Math.floor(partPrice(part,state.currentSector)/2));
    return {inventory,resources:{...state.resources,credits:state.resources.credits+credits},eventLog:appendLog(state.eventLog,`以半价出售 ${part.name}，获得 ${credits} 信用点。`)};
  }),
  sellLowTier: () => set(state => {
    const equippedCounts=new Map<string,number>();
    Object.values(state.ship.equipped).forEach(id=>{if(id)equippedCounts.set(id,(equippedCounts.get(id)??0)+1)});
    const keptCounts=new Map<string,number>();
    let credits=0,sold=0;
    const inventory=state.inventory.filter(id=>{
      const part=partById.get(id);
      const required=equippedCounts.get(id)??0;
      const kept=keptCounts.get(id)??0;
      if(!part||rarityRanks.indexOf(part.rarity)>1||kept<required){keptCounts.set(id,kept+1);return true}
      credits+=Math.max(1,Math.floor(partPrice(part,state.currentSector)/2));sold++;return false;
    });
    if(!sold)return {...state,eventLog:appendLog(state.eventLog,'没有可出售的未安装民用级或工业级装置。')};
    return {inventory,resources:{...state.resources,credits:state.resources.credits+credits},eventLog:appendLog(state.eventLog,`批量出售 ${sold} 件低阶装置，获得 ${credits} 信用点。`)};
  }),
  synthesizeMemory: () => set(state => {
    const cost=memorySynthesisCost(state.currentSector);
    if(state.resources.alloy<cost.alloy||state.resources.credits<cost.credits)return {...state,eventLog:appendLog(state.eventLog,`记忆析出需要 ${cost.alloy} 合金与 ${cost.credits} 信用点。`)};
    return {resources:{...state.resources,alloy:state.resources.alloy-cost.alloy,credits:state.resources.credits-cost.credits,memoryFragments:state.resources.memoryFragments+1},eventLog:appendLog(state.eventLog,'补给站完成一次记忆析出：获得 1 枚记忆碎片。')};
  }),
  equipPart: (id, slot) => set(state => {
    const part=partById.get(id);if(!part||!state.inventory.includes(id))return state;
    const target:EquipmentSlot=slot ?? (part.slot==='weapon'?'weapon1':part.slot);
    if(part.slot!=='weapon'&&target!==part.slot) return state;
    if(part.slot==='weapon'&&target!=='weapon1'&&target!=='weapon2') return state;
    const equipped={...state.ship.equipped,[target]:id};
    const ownedCount=state.inventory.filter(item=>item===id).length;
    const equippedCount=Object.values(equipped).filter(item=>item===id).length;
    if(equippedCount>ownedCount) return {...state,eventLog:appendLog(state.eventLog,`库存中只有 ${ownedCount} 件 ${part.name}，无法同时安装到多个槽位。`)};
    const nextShip=calculatedShip(state.ship,equipped);
    const used=energyUsed(equipped);
    if(used>nextShip.maxEnergy) return {...state,eventLog:appendLog(state.eventLog,`能量不足：${part.name} 接入后需要 ${used}/${nextShip.maxEnergy}。请升级能量核心或卸下高耗能装置。`)};
    return {ship:nextShip,eventLog:appendLog(state.eventLog,`${part.name} 已安装至 ${target}，能量负载 ${used}/${nextShip.maxEnergy}。`)};
  }),
  selectPilot: id => set(state => {
    if(state.mode!=='start') return {...state,eventLog:appendLog(state.eventLog,'驾驶员已锁定，当前航程中不可更换。')};
    const pilot=normalizePilot({...state.pilot,id});
    return {pilot,currentDialogue:`${pilot.name} 已接入驾驶席。技能「${pilot.skillName}」生效。`,shopPartIds:shopRoll(parts,id==='lumi',state.currentSector),eventLog:appendLog(state.eventLog,`${pilot.name} 接任驾驶员：${pilot.skillDescription}`)};
  }),
  visitRoom: id => set(state => {
    const current=state.stationRooms.find(r=>r.id===state.currentRoomId); const target=state.stationRooms.find(r=>r.id===id);
    if(!current||!target||(!current.connectedRoomIds.includes(id)&&id!==current.id)) return state;
    if(target.visited) return {currentRoomId:id};
    let ship={...state.ship};let resources={...state.resources};let inventory=[...state.inventory];let discovered=[...state.discoveredParts];let pilot={...state.pilot};let dialogue=withDialogue('part_found',state.pilot.id);let message=`探索 ${target.name}。`;
    const visitedRooms=state.stationRooms.map(r=>r.id===id?{...r,visited:true,cleared:true}:r);
    let lootNotice=state.lootNotice;
    if(target.type==='storage'){resources.alloy+=8+state.currentSector;resources.credits+=35;const p=randomPart(parts,2+Math.floor(state.currentSector/2),state.pilot.id==='lumi');inventory.push(p.id);discovered=[...new Set([...discovered,p.id])];lootNotice=makeLootNotice(p,'维修站储物舱');message=`${target.name}：回收 ${p.name}。`;}
    if(target.type==='engineering'){ship.hull=Math.min(ship.maxHull,ship.hull+18);const pool=parts.filter(x=>x.slot==='engine'&&rarityRanks.indexOf(x.rarity)<=Math.min(5,2+Math.floor(state.currentSector/2)));const p=pool[Math.floor(Math.random()*pool.length)];inventory.push(p.id);discovered=[...new Set([...discovered,p.id])];lootNotice=makeLootNotice(p,'维修站工程舱');message='维修臂恢复工作，并释放一枚引擎组件。';}
    if(target.type==='control'){resources.alloy+=4; if(resources.memoryFragments>0){resources.memoryFragments-=1;resources.credits+=60+state.currentSector*15;message='消耗 1 枚记忆碎片破解旧控制台，换取了星港汇票。';} else message='下载了下一区域的星图情报，并回收少量合金。';}
    if(target.type==='memory'){resources.memoryFragments+=2;pilot.syncExp+=10;dialogue=withDialogue('memory_found',state.pilot.id);message=`${state.pilot.name} 回收了两枚记忆碎片。`;}
    if(target.type==='combat'){
      const encounter={enemy:scaleEnemy(enemyForDanger(3+Math.floor(state.currentSector/2)),state.currentSector,3),danger:3+state.currentSector,nodeId:target.id,returnMode:'station' as const};
      return {mode:'battle',settings:{...state.settings,battleScale:state.settings.defaultBattleScale},battleEncounter:encounter,currentRoomId:id,stationRooms:visitedRooms,currentDialogue:`${encounter.enemy.name} 已启动，切换实战模式。`,eventLog:appendLog(state.eventLog,'太空站防卫舱进入横版自动战斗。')};
    }
    if(target.type==='core'){
      resources.credits+=120;resources.alloy+=20;resources.memoryFragments+=1;pilot.syncExp+=18;dialogue=withDialogue('station_clear',state.pilot.id);
      const p=randomPart(parts,5,state.pilot.id==='lumi');inventory.push(p.id);discovered=[...new Set([...discovered,p.id])]; lootNotice=makeLootNotice(p,'核心舱结算'); const sector=state.currentSector+1; const map:StarMap=generateStarMap(sector);
      return {resources,ship,inventory,discoveredParts:discovered,pilot:normalizedSync({...pilot,mood:dialogue.mood}),mode:'starMap',currentSector:sector,starMap:map,currentNodeId:map.nodes[0].id,selectedRoute:[map.nodes[0].id],stationRooms:[],currentRoomId:undefined,currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,`核心舱结算：获得 ${p.name}，已解锁 Sector ${String(sector).padStart(2,'0')}。`),shopPartIds:shopRoll(parts,state.pilot.id==='lumi',sector),lootNotice,cockpitAutoResume:false};
    }
    return {ship,resources,inventory,discoveredParts:discovered,pilot:{...pilot,mood:dialogue.mood},currentRoomId:id,currentDialogue:dialogue.text,eventLog:appendLog(state.eventLog,message),stationRooms:visitedRooms,lootNotice};
  }),
  interact: () => set(state => {const d=withDialogue('click',state.pilot.id);return {pilot:normalizedSync({...state.pilot,syncExp:state.pilot.syncExp+1,mood:d.mood}),currentDialogue:d.text}}),
  setSetting: (key,value) => set(state => {
    const settings={...state.settings,[key]:value};
    if(key==='alwaysOnTop')window.taskbarNova?.setAlwaysOnTop(Boolean(value));
    if(key==='opacity')window.taskbarNova?.setOpacity(Number(value));
    if(key==='defaultTravelScale')return {settings,travelTimeScale:value as 1|4|12};
    if(key==='defaultBattleScale')return {settings:{...settings,battleScale:value as 1|2}};
    return {settings};
  }),
  setAutopilot: enabled => set(state=>({autopilotEnabled:enabled,eventLog:appendLog(state.eventLog,enabled?'全权代理已接管航线、事件、改装与补给。':'全权代理已关闭，控制权交还舰长。')})),
  tickAutopilot: () => {
    const state=get();if(!state.autopilotEnabled||state.mode==='start'||state.mode==='battle'||state.mode==='defeat'||state.mode==='cockpit'||state.mode==='settings'||state.mode==='pilot')return;
    if(state.eventChoice){
      const option=state.eventChoice.options.find(item=>!item.disabledReason);
      if(option)get().resolveEventChoice(option.id);
      return;
    }
    if(state.mode==='fitting'){get().closeFitting();return;}
    if(state.mode==='starMap'||state.mode==='travel'){
      const change=nextAutoEquip(state);
      if(change){get().equipPart(change.id,change.slot);return;}
    }
    if(state.mode==='supply'){
      if(state.ship.hull<state.ship.maxHull&&state.resources.credits>0){get().repair();return;}
      if(state.ship.fuel<state.ship.maxFuel&&state.resources.credits>0){get().refuel();return;}
      const pendingEquip=nextAutoEquip(state);if(pendingEquip){get().equipPart(pendingEquip.id,pendingEquip.slot);return;}
      const hasLowTierStock=state.inventory.some(id=>{
        const part=partById.get(id);if(!part||rarityRanks.indexOf(part.rarity)>1)return false;
        return state.inventory.filter(item=>item===id).length>Object.values(state.ship.equipped).filter(item=>item===id).length;
      });
      if(hasLowTierStock){get().sellLowTier();return;}
      const equippedPowers=Object.values(state.ship.equipped).map(id=>id?partPower(partById.get(id)!):0);
      const energyHeadroom=state.ship.maxEnergy-energyUsed(state.ship.equipped);
      const candidates=state.shopPartIds.map(id=>partById.get(id)).filter((p):p is ShipPart=>Boolean(p)).sort((a,b)=>{
        if(energyHeadroom<=2&&a.slot!==b.slot)return a.slot==='core'?-1:b.slot==='core'?1:0;
        return partPower(b)-partPower(a);
      });
      const currentPower=(p:ShipPart)=>p.slot==='weapon'?Math.min(...equippedPowers.slice(0,2)):partPower(partById.get(state.ship.equipped[p.slot]??'')??p);
      const synthesis=memorySynthesisCost(state.currentSector);
      const memoryBlockedUpgrade=candidates.find(p=>{
        const cost=partCost(p,state.currentSector);
        const corePolicy=p.slot!=='core'||energyHeadroom<=2;
        return corePolicy&&partPower(p)>currentPower(p)&&cost.memory>state.resources.memoryFragments
          &&state.resources.credits>=cost.credits+synthesis.credits
          &&state.resources.alloy>=cost.alloy+synthesis.alloy;
      });
      if(memoryBlockedUpgrade){get().synthesizeMemory();return;}
      const upgrade=candidates.find(p=>{
        const cost=partCost(p,state.currentSector);
        const corePolicy=p.slot!=='core'||energyHeadroom<=2;
        return corePolicy&&partPower(p)>currentPower(p)&&state.resources.credits>=cost.credits&&state.resources.alloy>=cost.alloy&&state.resources.memoryFragments>=cost.memory;
      });
      if(upgrade){get().buyPart(upgrade.id);return;}
      get().resumeFromSupply();return;
    }
    if(state.mode==='station'){
      const current=state.stationRooms.find(room=>room.id===state.currentRoomId);
      if(!current)return;
      const targets=new Set(state.stationRooms.filter(room=>!room.visited).map(room=>room.id));
      const queue:[[string,string[]]]|Array<[string,string[]]>=[[current.id,[current.id]]];const seen=new Set([current.id]);let path:string[]|undefined;
      while(queue.length){const [id,route]=queue.shift()!;if(targets.has(id)){path=route;break;}const room=state.stationRooms.find(item=>item.id===id);for(const nextId of room?.connectedRoomIds??[]){if(!seen.has(nextId)){seen.add(nextId);queue.push([nextId,[...route,nextId]])}}}
      if(path?.[1])get().visitRoom(path[1]);
      return;
    }
    if(state.mode==='starMap'){
      if(state.selectedRoute.length>1){get().startTravel();return;}
      const style=state.settings.navigationStyle;
      const score=(node:GameState['starMap']['nodes'][number])=>{
        const combat=node.type==='battle'||node.type==='boss';
        if(style==='combat')return node.x*3+node.rewardLevel*14+(combat?90:0)+node.danger*8;
        if(style==='avoid')return node.x*3+node.rewardLevel*5-(combat?120:0)-node.danger*16+(node.type==='supply'?45:0);
        return node.x*3+node.rewardLevel*10-(combat?node.danger*4:0)+(node.type==='salvage'||node.type==='story'?24:0);
      };
      const candidates=state.starMap.nodes.filter(node=>!node.visited&&node.id!==state.currentNodeId&&findDirectedPath(state.starMap,state.currentNodeId,node.id)).sort((a,b)=>score(b)-score(a));
      const target=candidates[0];
      if(target)get().planNode(target.id);
    }
  },
  toggleCollapse: () => set(state => {const collapsed=!state.collapsed;window.taskbarNova?.collapse(collapsed);return {collapsed};}),
  clearLootNotice: () => set({lootNotice:undefined}),
  resetGame: () => {const fresh=makeInitial();set({...fresh,hydrated:true,eventLog:['旅程已结束。请重新选择驾驶员与初始武器。']});}
}));

let saveTimer:ReturnType<typeof setTimeout>|undefined;
useGameStore.subscribe(state => {
  if(!state.hydrated)return;
  clearTimeout(saveTimer); saveTimer=setTimeout(()=>{
    const snapshot=JSON.parse(JSON.stringify({...state,updatedAt:Date.now()}));
    if(window.taskbarNova) window.taskbarNova.writeSave(snapshot);
    else localStorage.setItem('taskbar-nova-save',JSON.stringify(snapshot));
  },650);
});
