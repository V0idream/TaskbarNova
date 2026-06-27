import type { CSSProperties } from 'react';
import travelBackdrop from '../assets/battle/warp_backdrop.png';
import warpOverlay from '../assets/battle/warp_overlay.png';
import { useGameStore } from '../game/gameStore';
import { ShipSprite } from './ShipSprite';

const formatTime=(ms:number)=>{const seconds=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`};

export function TravelScene(){
  const leg=useGameStore(s=>s.travelLeg),scale=useGameStore(s=>s.travelTimeScale),setScale=useGameStore(s=>s.setTravelTimeScale);
  const map=useGameStore(s=>s.starMap),queue=useGameStore(s=>s.travelQueue),ship=useGameStore(s=>s.ship),route=useGameStore(s=>s.selectedRoute),currentId=useGameStore(s=>s.currentNodeId);
  if(!leg)return <div className="travel-scene panel">正在计算下一段跃迁窗口...</div>;
  const from=map.nodes.find(n=>n.id===leg.fromId),to=map.nodes.find(n=>n.id===leg.toId),progress=Math.min(1,leg.elapsedMs/leg.durationMs);
  const remaining=(leg.durationMs-leg.elapsedMs)/scale;
  const visualRate=scale===12?5:scale===4?2:1;
  const travelStyle={backgroundImage:`linear-gradient(90deg,rgba(2,8,20,.45),rgba(2,8,20,.16)),url(${travelBackdrop})`,'--warp-rate':visualRate} as CSSProperties;
  return <section className="travel-scene panel" style={travelStyle}>
    <div className="travel-stars">{Array.from({length:18},(_,i)=><i key={i} style={{top:`${(i*37)%94}%`,left:`${(i*61)%96}%`,animationDelay:`-${i*.13}s`}}/>)}</div>
    <div className="warp-image-overlay" style={{backgroundImage:`url(${warpOverlay})`}}/>
    <div className="warp-depth-field">{Array.from({length:28},(_,i)=><i key={i} style={{top:`${8+(i*29)%84}%`,left:`${14+(i*47)%72}%`,animationDelay:`-${i*.09/visualRate}s`,animationDuration:`${(0.72+(i%5)*.11)/visualRate}s`}}/>)}</div>
    <div className="warp-shockwave" style={{opacity:.28+progress*.34}}><i/><i/><i/></div>
    <div className="travel-hud-top"><div><small>WARP JUMP / LEG {route.indexOf(leg.toId)} OF {route.length-1}</small><h2>{from?.name} <b>›</b> {to?.name}</h2></div><div className="travel-speed" aria-label="跃迁时间倍率">{([1,4,12] as const).map(value=><button key={value} className={scale===value?'active':''} onClick={()=>setScale(value)}>{value}×</button>)}</div></div>
    <div className="flight-lane"><div className="warp-line line-a"/><div className="warp-line line-b"/><div className="warp-line line-c"/><div className="warp-line line-d"/><div className="phase-ribbon"/><div className="travel-ship"><ShipSprite moving damaged={ship.hull<30}/><span className="engine-trail"/><span className="jump-aura"/></div><div className="destination-marker"><i/><b>{to?.name}</b><small>{queue.length} 个航点待处理</small></div></div>
    <div className="warp-vortex"><i/><i/><i/></div>
    <div className="travel-progress"><div className="travel-progress-head"><span>跃迁窗口稳定度 {Math.round(96+Math.sin(progress*Math.PI)*3)}%</span><b data-testid="travel-eta">ETA {formatTime(remaining)}</b></div><i><em style={{width:`${progress*100}%`}}/></i><div className="travel-waypoints">{route.map((id,index)=>{const node=map.nodes.find(n=>n.id===id);const done=route.indexOf(currentId)>=index;const active=id===leg.toId;return <span key={id} className={`${done?'done':''} ${active?'active':''}`}><i>{index}</i>{node?.name}</span>})}</div></div>
    <aside className="travel-telemetry"><span>跃迁效率<b>{Math.round((1-ship.fuelEfficiency)*100)}%</b></span><span>相位速度<b>{ship.speed*128} c</b></span><span>本段标准时长<b>{formatTime(leg.durationMs)}</b></span><span>时间倍率<b>{scale}×</b></span></aside>
  </section>;
}
