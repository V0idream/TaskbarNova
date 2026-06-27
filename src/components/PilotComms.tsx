import lumiPortrait from '../assets/pilot/lumi_happy.png';
import novaPortrait from '../assets/pilot/nova_neutral.png';
import { useGameStore } from '../game/gameStore';

const moodLabel={neutral:'冷静',happy:'微笑',worried:'担心',excited:'兴奋',tired:'疲惫',serious:'警戒'};

export function PilotComms(){
  const pilot=useGameStore(s=>s.pilot),dialogue=useGameStore(s=>s.currentDialogue),interact=useGameStore(s=>s.interact);
  const portrait=pilot.id==='lumi'?lumiPortrait:novaPortrait;
  return <aside className={`pilot-comms panel pilot-${pilot.id}`} onClick={interact} title={`点击与 ${pilot.name} 互动`}>
    <div className="portrait-wrap"><img src={portrait} alt={`${pilot.name} 驾驶员头像`}/><div className="scanline"/></div>
    <div className="comms-copy">
      <div className="comms-head"><b>{pilot.name.toUpperCase()} // 驾驶席</b><span>{moodLabel[pilot.mood]}</span></div>
      <p>{dialogue}</p>
      <div className="pilot-skill-chip"><b>技能「{pilot.skillName}」</b><span>{pilot.skillDescription}</span></div>
      <div className="sync-row"><span>心智同步 LV.{pilot.syncLevel}</span><div><i style={{width:`${Math.min(100,pilot.syncExp)}%`}}/></div><em>{pilot.syncExp}%</em></div>
    </div>
  </aside>;
}
