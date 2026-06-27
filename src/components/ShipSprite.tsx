import playerShip from '../assets/ship/player_ship_v2.png';
import enginePlume from '../assets/battle/vfx/engine_plume_v2.png';

export function ShipSprite({moving=false,damaged=false}:{moving?:boolean;damaged?:boolean}){
  return <span className={`ship-sprite sprite-image ${moving?'is-moving':''} ${damaged?'is-damaged':''}`} aria-label="曙光号">
    <img src={playerShip} alt="曙光号" draggable={false}/>
    <i className="engine-flame" style={{backgroundImage:`url(${enginePlume})`}}/>
    {damaged&&<em className="damage-spark"/>}
  </span>;
}
