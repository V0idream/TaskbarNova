import type { CSSProperties } from 'react';
import cockpitBridge from '../assets/battle/cockpit_bridge_v2.png';
import lumiPortrait from '../assets/pilot/lumi_happy.png';
import novaPortrait from '../assets/pilot/nova_neutral.png';
import { partById, useGameStore } from '../game/gameStore';
import { StatusBar } from './StatusBar';

const stars = Array.from({ length: 34 }, (_, index) => ({
  left: 8 + ((index * 37) % 84),
  top: 7 + ((index * 29) % 82),
  delay: -((index * 0.17) % 2.7),
  size: 1 + (index % 3),
  speed: 1.35 + (index % 7) * .16
}));

export function CockpitView(){
  const ship=useGameStore(s=>s.ship),pilot=useGameStore(s=>s.pilot),dialogue=useGameStore(s=>s.currentDialogue),sector=useGameStore(s=>s.currentSector);
  const map=useGameStore(s=>s.starMap),currentNodeId=useGameStore(s=>s.currentNodeId),travelLeg=useGameStore(s=>s.travelLeg),queue=useGameStore(s=>s.travelQueue),travelScale=useGameStore(s=>s.travelTimeScale),setMode=useGameStore(s=>s.setMode),openFitting=useGameStore(s=>s.openFitting);
  const destination=map.nodes.find(n=>n.id===travelLeg?.toId);
  const current=map.nodes.find(n=>n.id===currentNodeId);
  const weapon1=ship.equipped.weapon1?partById.get(ship.equipped.weapon1):undefined;
  const weapon2=ship.equipped.weapon2?partById.get(ship.equipped.weapon2):undefined;
  const progress=travelLeg?Math.min(100,Math.round(travelLeg.elapsedMs/travelLeg.durationMs*100)):0;
  const returnMode=travelLeg?'travel':'starMap';
  const portrait=pilot.id==='lumi'?lumiPortrait:novaPortrait;
  const visualRate=travelScale===12?5:travelScale===4?2:1;

  const flightStyle={
    '--travel-progress':progress/100,
    '--cruise-speed':travelLeg?Math.round(640+ship.speed*38):0,
    '--warp-rate':visualRate
  } as CSSProperties;

  return <section className="cockpit-view" style={flightStyle}>
    <div className="panel-title cockpit-title">
      <div><small>EXPERIMENTAL 3D COCKPIT</small><h2>曙光号 · 驾驶员视角测试舱</h2></div>
      <div className="nav-actions">
        <button onClick={openFitting}>改装</button>
        <button onClick={()=>setMode(returnMode)}>{travelLeg?'返回跃迁':'返回星图'}</button>
      </div>
    </div>
    <div className="cockpit-stage panel">
      <div className={`cockpit-space cockpit-space-v2 ${travelLeg?'is-traveling':'is-holding'}`} style={{backgroundImage:`linear-gradient(rgba(2,7,18,.08),rgba(2,7,18,.20)),url(${cockpitBridge})`}}>
        <div className="cockpit-stars">
          {stars.map((star,index)=><i key={index} style={{left:`${star.left}%`,top:`${star.top}%`,width:star.size,height:star.size,animationDelay:`${star.delay/visualRate}s`,animationDuration:`${star.speed/visualRate}s`} as CSSProperties}/>)}
        </div>
        <div className="cockpit-speed-streams">{Array.from({length:18},(_,index)=><i key={index} style={{'--stream-index':index,'--stream-left':`${12+(index*29)%76}%`,'--stream-top':`${4+(index*43)%88}%`,'--stream-width':`${42+(index%5)*18}px`} as CSSProperties}/>)}</div>
        <div className="depth-road">
          {Array.from({length:8},(_,index)=><i key={index}/>)}
        </div>
        <div className="cockpit-horizon"><i/><i/><i/></div>
        <div className="fighter-hud travel-hud">
          <div className="pitch-ladder"><i className="pitch p20"><b>20</b></i><i className="pitch p10"><b>10</b></i><i className="pitch p0"><b>0</b></i><i className="pitch n10"><b>10</b></i><i className="pitch n20"><b>20</b></i></div>
          <div className="flight-path-marker"><i/><i/><b/></div>
          <div className="heading-tape"><span>330</span><span>345</span><b>000</b><span>015</span><span>030</span></div>
          <div className="hud-speed"><small>SPD</small><b>{travelLeg?Math.round(640+ship.speed*38):'---'}</b></div>
          <div className="hud-altitude"><small>DST</small><b>{travelLeg?`${Math.max(0,100-progress)}%`:'HOLD'}</b></div>
        </div>
        <div className="cockpit-reticle"><i/><b>{travelLeg?'WARP VECTOR':'LOCAL HOLD'}</b></div>
        <div className="cockpit-flight-hud"><span>−30</span><i/><b>{travelLeg?`${progress}%`:'HOLD'}</b><i/><span>+30</span></div>
        <div className="cockpit-canopy">
          <i className="canopy-left"/><i className="canopy-right"/><i className="canopy-top"/>
        </div>
      </div>
      <div className="cockpit-dashboard">
        <div className="cockpit-readout main-readout">
          <small>航行状态</small>
          <b>{travelLeg?`跃迁至 ${destination?.name??'未知航点'}`:`停泊于 ${current?.name??'当前航点'}`}</b>
          <span>Sector {String(sector).padStart(2,'0')} · 队列 {queue.length} · 进度 {travelLeg?`${progress}%`:'待机'}</span>
          <em><i style={{width:`${travelLeg?progress:100}%`}}/></em>
        </div>
        <div className="cockpit-readout">
          <small>驾驶员</small>
          <div className="cockpit-pilot-link"><img src={portrait} alt={pilot.name}/><div><b>{pilot.name}</b><span>{dialogue}</span></div></div>
        </div>
        <div className="cockpit-readout">
          <small>武器链路</small>
          <b>{weapon1?.name??'槽位一待命'}</b>
          <span>{weapon2?.name??'槽位二待命'}</span>
        </div>
      </div>
    </div>
    <StatusBar/>
  </section>;
}
