import { useMemo } from 'react';
import { useGameStore } from '../game/gameStore';
import type { StarNodeType } from '../game/types';
import { ShipSprite } from './ShipSprite';

const icons:Record<StarNodeType,string>={start:'◉',battle:'⚔',salvage:'◇',supply:'✚',anomaly:'!',story:'◆',station:'◎',boss:'★'};
const labels:Record<StarNodeType,string>={start:'起点',battle:'战斗',salvage:'残骸',supply:'补给',anomaly:'异常',story:'记忆',station:'太空站',boss:'首领'};
export function StarMapCanvas(){
  const map=useGameStore(s=>s.starMap),route=useGameStore(s=>s.selectedRoute),current=useGameStore(s=>s.currentNodeId),mode=useGameStore(s=>s.mode),plan=useGameStore(s=>s.planNode);
  const points=useMemo(()=>new Map(map.nodes.map(n=>[n.id,n])),[map]); const currentNode=points.get(current)!;
  return <section className="star-map panel"><div className="map-grid"/>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="route-layer" aria-hidden="true">
      {map.edges.map(e=>{const a=points.get(e.from)!,b=points.get(e.to)!;const selected=route.some((id,i)=>id===e.from&&route[i+1]===e.to);return <line key={`${e.from}-${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={selected?'selected':''}/>})}
    </svg>
    {map.nodes.map(node=>{const routeIndex=route.indexOf(node.id),chosen=routeIndex>=0,active=node.id===current;return <button key={node.id} className={`star-node node-${node.type} ${chosen?'selected':''} ${node.visited?'visited':''} ${active?'active':''}`} style={{left:`${node.x}%`,top:`${node.y}%`}} onClick={()=>plan(node.id)} disabled={mode!=='starMap'} title={chosen?`航线第 ${routeIndex} 段`:'点击后自动规划到此节点'}><i>{node.revealed?icons[node.type]:'?'}</i>{chosen&&<em>{routeIndex}</em>}<span>{node.name}</span><small>{labels[node.type]} · 危险 {node.danger}</small></button>})}
    <div className="map-ship" style={{left:`${currentNode.x}%`,top:`${currentNode.y}%`}}><ShipSprite moving={mode==='travel'}/></div>
    <div className="map-legend"><span><i className="safe"/>可用航道</span><span><i className="planned"/>规划航线</span></div>
  </section>;
}
