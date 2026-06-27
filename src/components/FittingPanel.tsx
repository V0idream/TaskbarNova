import { useRef } from 'react';
import { partById, parts, shipEnergyUsed, useGameStore } from '../game/gameStore';
import type { EquipmentSlot, PartRarity, PartSlot, ShipPart } from '../game/types';
import { ShipSprite } from './ShipSprite';

const slotNames:Record<PartSlot,string>={weapon:'主武器',engine:'推进器',shield:'护盾',radar:'雷达',core:'能量核心'};
const equipmentNames:Record<EquipmentSlot,string>={weapon1:'武器槽 1',weapon2:'武器槽 2',engine:'推进器',shield:'护盾',radar:'雷达',core:'能量核心'};
const slotIcon:Record<PartSlot,string>={weapon:'⌁',engine:'»',shield:'⬡',radar:'⌖',core:'✦'};
const rarity:Record<PartRarity,string>={common:'民用级',uncommon:'工业级',rare:'军用级',epic:'实验级',legendary:'原型机',anomaly:'外星遗物'};
const rarityRank:Record<PartRarity,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,anomaly:5};
const categoryOrder:PartSlot[]=['core','weapon','engine','shield','radar'];

function PartStats({part}:{part:ShipPart}) {
  return <span>{Object.entries(part.stats).map(([k,v])=>`${k} ${Number(v)>0?'+':''}${v}`).join(' · ')} · 能耗 {part.energyCost??0}</span>;
}

export function FittingPanel(){
  const ship=useGameStore(s=>s.ship),inventory=useGameStore(s=>s.inventory),equip=useGameStore(s=>s.equipPart),close=useGameStore(s=>s.closeFitting);
  const sellLow=useGameStore(s=>s.sellLowTier);
  const tactical=useGameStore(s=>s.tacticalComputer),setComputer=useGameStore(s=>s.setTacticalComputer);
  const inventoryRef=useRef<HTMLDivElement>(null);
  const counts=new Map<string,number>();inventory.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
  const owned=parts.filter(p=>counts.has(p.id)).sort((a,b)=>categoryOrder.indexOf(a.slot)-categoryOrder.indexOf(b.slot)||rarityRank[a.rarity]-rarityRank[b.rarity]||a.name.localeCompare(b.name,'zh-Hans-CN'));
  const equippedIds=new Set(Object.values(ship.equipped).filter(Boolean));
  const bySlot=(slot:EquipmentSlot)=>partById.get(ship.equipped[slot]||'');
  const energy=shipEnergyUsed(ship);
  const jumpTo=(slot:PartSlot)=>{
    const container=inventoryRef.current;
    const target=container?.querySelector<HTMLElement>(`[data-device-slot="${slot}"]`);
    if(container&&target)container.scrollTo({top:target.offsetTop-container.offsetTop-4,behavior:'smooth'});
  };
  return <section className="mode-panel fitting-panel">
    <div className="panel-title"><div><small>SHIP ENGINEERING</small><h2>曙光号 · 全息改装台</h2></div><button onClick={close}>完成改装并返回</button></div>
    <div className="fitting-grid v3">
      <div className="ship-preview panel ship-preview-left-top">
        <ShipSprite/>
        <h3>{ship.name}</h3>
        <div className="ship-stats">
          <span>攻击<b>{ship.attack}</b></span><span>防御<b>{ship.defense}</b></span><span>跃迁速度<b>{ship.speed}</b></span><span>扫描<b>{ship.scan}</b></span><span>能量<b>{energy}/{ship.maxEnergy}</b></span><span>燃料效率<b>{Math.round(ship.fuelEfficiency*100)}%</b></span>
        </div>
        <div className="computer-box">
          <b>作战电脑</b>
          <label>作战风格<select value={tactical.style} onChange={e=>setComputer('style',e.target.value as 'frontal'|'flanking')}><option value="frontal">正面交战</option><option value="flanking">迂回作战</option></select></label>
          <label>战术偏好<select value={tactical.preference} onChange={e=>setComputer('preference',e.target.value as 'assault'|'guard'|'balanced')}><option value="assault">进攻优先</option><option value="guard">防守优先</option><option value="balanced">均衡</option></select></label>
        </div>
      </div>
      <div className="slots panel vertical-slots">
        <div className="section-head"><b>已安装装置</b><span>2 WEAPON SLOTS</span></div>
        {(['core','weapon1','weapon2','engine','shield','radar'] as EquipmentSlot[]).map(slot=>{const p=bySlot(slot);return <div className="slot-card wide" key={slot}>
          <i>{slot.startsWith('weapon')?'⌁':slot==='engine'?'»':slot==='shield'?'⬡':slot==='core'?'✦':'⌖'}</i>
          <div><small>{equipmentNames[slot]}</small><b>{p?.name||'空槽位'}</b><em>{p?rarity[p.rarity]:'未安装'}</em></div>
        </div>})}
      </div>
      <div className="inventory panel inventory-vertical">
        <div className="section-head"><b>装置库 · 低级在上，高级在下</b><span>{inventory.length} ITEMS / {owned.length} TYPES</span></div>
        <div className="device-jump-bar">{categoryOrder.map(slot=><button key={slot} onClick={()=>jumpTo(slot)}>{slotIcon[slot]} {slotNames[slot]}</button>)}<button className="sell-low-button" onClick={sellLow}>出售低阶</button></div>
        <div className="device-columns" ref={inventoryRef}>
          {categoryOrder.map(slot=><section className="device-column" data-device-slot={slot} key={slot}>
            <h3 onClick={()=>jumpTo(slot)}><i>{slotIcon[slot]}</i>{slotNames[slot]}</h3>
            {owned.filter(p=>p.slot===slot).map(p=><article key={p.id} className={`part-card rarity-${p.rarity} ${equippedIds.has(p.id)?'equipped':''}`}>
              <div><b>{p.name} <em className="item-count">×{counts.get(p.id)}</em></b><small>{rarity[p.rarity]}</small></div>
              <p>{p.description}</p>
              <PartStats part={p}/>
              {slot==='weapon'?<div className="weapon-slot-actions">
                <button onClick={()=>equip(p.id,'weapon1')} className={ship.equipped.weapon1===p.id?'active':''}>装到 1</button>
                <button onClick={()=>equip(p.id,'weapon2')} className={ship.equipped.weapon2===p.id?'active':''}>装到 2</button>
              </div>:<button className="install-button" onClick={()=>equip(p.id,slot as EquipmentSlot)}>安装</button>}
            </article>)}
          </section>)}
        </div>
      </div>
    </div>
  </section>;
}
