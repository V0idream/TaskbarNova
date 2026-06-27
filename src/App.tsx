import { useEffect, useState } from 'react';
import { BattleScene } from './components/BattleScene';
import { CockpitView } from './components/CockpitView';
import { FittingPanel } from './components/FittingPanel';
import { PilotComms } from './components/PilotComms';
import { SettingsPanel } from './components/SettingsPanel';
import { ShipSprite } from './components/ShipSprite';
import { StarMapCanvas } from './components/StarMapCanvas';
import { StationPanel } from './components/StationPanel';
import { StatusBar } from './components/StatusBar';
import { SupplyPanel } from './components/SupplyPanel';
import { TravelScene } from './components/TravelScene';
import { WindowFrame } from './components/WindowFrame';
import { partById, routeMetrics, useGameStore } from './game/gameStore';
import type { PilotId } from './game/types';
import lumiPortrait from './assets/pilot/lumi_happy.png';
import novaPortrait from './assets/pilot/nova_neutral.png';

function CollapsedView(){
  const ship=useGameStore(s=>s.ship),toggle=useGameStore(s=>s.toggleCollapse),dialogue=useGameStore(s=>s.currentDialogue),mode=useGameStore(s=>s.mode),pilot=useGameStore(s=>s.pilot);
  const portrait=pilot.id==='lumi'?lumiPortrait:novaPortrait;
  const state=mode==='battle'?'战斗':mode==='travel'?'航行':mode==='fitting'?'改装':mode==='supply'?'停靠补给':mode==='station'?'空间站探索':'待命';
  return <div className="collapsed-view" title="拖动窗口；双击或点击右侧按钮展开" onDoubleClick={toggle}>
    <img className="collapsed-pilot" src={portrait} alt={pilot.name}/>
    <div className="collapsed-copy"><b>{pilot.name.toUpperCase()} · {state}</b><p>{dialogue}</p><span>盾 {Math.round(ship.shield)} · 油 {Math.round(ship.fuel)} · 舰 {Math.round(ship.hull)}</span></div>
    <button className="collapsed-expand" onClick={toggle} title="展开 Taskbar Nova">⌃</button>
  </div>;
}

function RouteIntel(){
  const state=useGameStore(),m=routeMetrics(state),launch=useGameStore(s=>s.startTravel);
  const can=state.selectedRoute.length>=2&&state.ship.fuel>=m.fuel&&state.ship.hull>0;
  return <div className="route-intel panel"><div className="section-head"><b>多段跃迁预测</b><span>{state.selectedRoute.length-1} 次跃迁</span></div><div className="intel-values"><span>预计燃料<b>{m.fuel}</b></span><span>预计时间<b>{m.durationLabel}</b></span><span>累计危险<b className={`risk-${m.label}`}>{m.label}</b></span><span>奖励指数<b>{m.reward}</b></span></div><p>{m.danger>8?'高危节点较多，战斗将使用当前装备实时演算。':m.fuel>state.ship.fuel?'燃料不足，请调整跃迁路线或停靠补给。':'可直接点击远端节点，系统会自动补齐中间跃迁点。'}</p><button className="launch-button" disabled={!can} onClick={launch}>启 动 跃 迁</button></div>;
}

function TravelIntel(){
  const leg=useGameStore(s=>s.travelLeg),map=useGameStore(s=>s.starMap),queue=useGameStore(s=>s.travelQueue),log=useGameStore(s=>s.eventLog),setMode=useGameStore(s=>s.setMode);
  const destination=map.nodes.find(n=>n.id===leg?.toId),openFitting=useGameStore(s=>s.openFitting);
  return <div className="travel-side-stack"><PilotComms/><div className="journey-card panel"><div className="section-head"><b>当前跃迁段</b><span>WARP</span></div><h3>{destination?.name}</h3><p>驾驶员正在维持跃迁窗口。途中可进入改装台或切到测试驾驶舱视角。</p><div className="journey-actions"><button className="primary" onClick={openFitting}>跃迁中改装</button><button onClick={()=>setMode('cockpit')}>驾驶舱视角</button></div><div><span>待处理跃迁点</span><b>{queue.length}</b></div></div><div className="event-log panel"><div className="section-head"><b>跃迁记录</b><span>LIVE</span></div>{log.slice(0,3).map((item,i)=><p key={`${item}-${i}`}><i/>{item}</p>)}</div></div>;
}

function PilotPanel(){
  const setMode=useGameStore(s=>s.setMode),pilot=useGameStore(s=>s.pilot),interact=useGameStore(s=>s.interact),selectPilot=useGameStore(s=>s.selectPilot);
  return <section className="mode-panel pilot-panel"><div className="panel-title"><div><small>PILOT LINK</small><h2>驾驶员通讯与心智同步终端</h2></div><button onClick={()=>setMode('starMap')}>返回星图</button></div><div className="pilot-focus"><PilotComms/><div className="panel pilot-record"><h3>当前驾驶员</h3><p>驾驶员在开档时锁定，航程中不可更换。Nova 偏向战后生存与记忆回收，Lumi 偏向高阶装置获取。</p><div className="pilot-choice-row"><button className={pilot.id==='nova'?'active':''} onClick={()=>selectPilot('nova')}><b>Nova</b><span>曙光回流：胜利后修复 18 舰体，并强化记忆回收</span></button><button className={pilot.id==='lumi'?'active':''} onClick={()=>selectPilot('lumi')}><b>Lumi</b><span>幸运星工坊：提高高级装置出现概率</span></button></div><div><span>当前等级</span><b>LV.{pilot.syncLevel}</b></div><div><span>同步进度</span><b>{Math.min(100,pilot.syncExp)}%</b></div><button className="primary" onClick={interact}>发起通讯</button></div></div></section>;
}

function StartPanel(){
  const choose=useGameStore(s=>s.chooseStarter);
  const [pilot,setPilot]=useState<PilotId>('nova');
  const [weapon,setWeapon]=useState('weapon_pulse_01');
  const starters=['weapon_pulse_01','weapon_massdriver_01','weapon_micro_missile_01'].map(id=>partById.get(id)!);
  return <section className="start-panel panel">
    <div><small>NEW CAPTAIN PROFILE</small><h1>曙光号 · 开档配置</h1><p>选择初始驾驶员和一号武器。驾驶员确认后会锁定；作战电脑与装备可在游戏内调整。</p></div>
    <div className="start-grid">
      <div className="start-card"><h3>驾驶员</h3><button className={pilot==='nova'?'active':''} onClick={()=>setPilot('nova')}><b>Nova</b><span>冷静、克制。战斗结束后修复舰体。</span></button><button className={pilot==='lumi'?'active':''} onClick={()=>setPilot('lumi')}><b>Lumi</b><span>活跃、直觉强。更容易摸到高阶装备。</span></button></div>
      <div className="start-card"><h3>初始武器</h3>{starters.map(part=><button key={part.id} className={weapon===part.id?'active':''} onClick={()=>setWeapon(part.id)}><b>{part.name}</b><span>{part.description}</span></button>)}</div>
    </div>
    <button className="launch-button" onClick={()=>choose(pilot,weapon)}>确认并启动曙光号</button>
  </section>;
}

function LootNotice(){
  const notice=useGameStore(s=>s.lootNotice),clear=useGameStore(s=>s.clearLootNotice),openFitting=useGameStore(s=>s.openFitting);
  useEffect(()=>{if(!notice)return;const timer=window.setTimeout(clear,8500);return()=>window.clearTimeout(timer)},[notice,clear]);
  if(!notice)return null;
  return <div className={`loot-notice rarity-${notice.rarity}`}><small>NEW EQUIPMENT</small><b>{notice.name}</b><p>{notice.text}</p><div><button onClick={openFitting}>查看改装</button><button onClick={clear}>收起</button></div></div>;
}

function EventChoicePanel(){
  const choice=useGameStore(s=>s.eventChoice),resolve=useGameStore(s=>s.resolveEventChoice);
  if(!choice)return null;
  return <div className="event-choice-modal panel"><small>RANDOM EVENT</small><h2>{choice.title}</h2><p>{choice.text}</p><div>{choice.options.map(option=><button key={option.id} disabled={Boolean(option.disabledReason)} onClick={()=>resolve(option.id)}><b>{option.label}</b><span>{option.disabledReason||option.description}</span></button>)}</div></div>;
}

function DefeatPanel(){
  const rollback=useGameStore(s=>s.rollbackBattle),end=useGameStore(s=>s.endJourney),log=useGameStore(s=>s.eventLog);
  return <section className="defeat-panel panel"><small>BATTLE FAILED</small><h1>舰体进入临界保护</h1><p>{log[0]??'战斗失利。请选择后续处理。'}</p><div><button className="primary" onClick={rollback}><b>时空回溯</b><span>回到这场战斗开始前，重新尝试。</span></button><button className="danger-button" onClick={end}><b>结束旅程</b><span>结束当前存档，回到开档选择。</span></button></div></section>;
}

export default function App(){
  const hydrate=useGameStore(s=>s.hydrate),hydrated=useGameStore(s=>s.hydrated),collapsed=useGameStore(s=>s.collapsed),mode=useGameStore(s=>s.mode),setMode=useGameStore(s=>s.setMode),log=useGameStore(s=>s.eventLog),settings=useGameStore(s=>s.settings),sector=useGameStore(s=>s.currentSector),travelLeg=useGameStore(s=>s.travelLeg),tickTravel=useGameStore(s=>s.tickTravel),tickAutopilot=useGameStore(s=>s.tickAutopilot),openFitting=useGameStore(s=>s.openFitting);
  useEffect(()=>{hydrate()},[hydrate]);
  useEffect(()=>{if(!travelLeg)return;let last=performance.now();const timer=window.setInterval(()=>{const now=performance.now();tickTravel(now-last);last=now;},120);return()=>window.clearInterval(timer)},[tickTravel,travelLeg?.toId]);
  useEffect(()=>{const timer=window.setInterval(tickAutopilot,650);return()=>window.clearInterval(timer)},[tickAutopilot]);
  if(!hydrated)return <div className="loading">NOVA LINK INITIALIZING...</div>;
  if(collapsed)return <CollapsedView/>;
  return <main className={settings.reduceMotion?'reduce-motion':''}><WindowFrame><div className="content-shell">
    <LootNotice/>
    <EventChoicePanel/>
    {mode==='start'&&<StartPanel/>}
    {mode==='starMap'&&<div className="map-mode"><div className="map-column"><div className="sector-heading"><div><small>ACTIVE SECTOR</small><h1>Sector {String(sector).padStart(2,'0')}：废弃轨道带</h1></div><div className="nav-actions"><button onClick={openFitting}>改装</button><button onClick={()=>setMode('cockpit')}>驾驶舱</button><button onClick={()=>setMode('pilot')}>通讯</button><button onClick={()=>setMode('settings')}>设置</button></div></div><StarMapCanvas/><StatusBar/></div><div className="side-column"><PilotComms/><RouteIntel/><div className="event-log panel"><div className="section-head"><b>事件记录</b><span>LIVE</span></div>{log.slice(0,3).map((item,i)=><p key={`${item}-${i}`}><i/>{item}</p>)}</div></div></div>}
    {mode==='travel'&&<div className="travel-mode-shell"><div className="travel-main"><TravelScene/><StatusBar/></div><TravelIntel/></div>}
    {mode==='battle'&&<BattleScene/>}
    {mode==='defeat'&&<DefeatPanel/>}
    {mode==='fitting'&&<div className="fitting-mode-shell"><FittingPanel/><StatusBar/></div>}
    {mode==='supply'&&<><SupplyPanel/><StatusBar/></>}
    {mode==='station'&&<><StationPanel/><StatusBar/></>}
    {mode==='settings'&&<SettingsPanel/>}
    {mode==='pilot'&&<PilotPanel/>}
    {mode==='cockpit'&&<CockpitView/>}
  </div></WindowFrame></main>;
}
