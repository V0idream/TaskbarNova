import { memorySynthesisCost, partById, partCost, partPrice, useGameStore } from '../game/gameStore';

export function SupplyPanel(){
  const ship=useGameStore(s=>s.ship),resources=useGameStore(s=>s.resources),sector=useGameStore(s=>s.currentSector);
  const shop=useGameStore(s=>s.shopPartIds),inventory=useGameStore(s=>s.inventory);
  const repair=useGameStore(s=>s.repair),refuel=useGameStore(s=>s.refuel),buy=useGameStore(s=>s.buyPart);
  const sell=useGameStore(s=>s.sellPart),sellLow=useGameStore(s=>s.sellLowTier),synthesize=useGameStore(s=>s.synthesizeMemory),resume=useGameStore(s=>s.resumeFromSupply);
  const counts=new Map<string,number>();inventory.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
  const equipped=new Map<string,number>();Object.values(ship.equipped).forEach(id=>{if(id)equipped.set(id,(equipped.get(id)??0)+1)});
  const sellable=[...counts.keys()].filter(id=>(counts.get(id)??0)>(equipped.get(id)??0));
  const memoryCost=memorySynthesisCost(sector);
  return <section className="mode-panel supply-panel">
    <div className="panel-title"><div><small>ORBITAL SERVICE NODE</small><h2>远星补给站 // 07</h2></div><button className="primary" onClick={resume}>离港并继续航行</button></div>
    <div className="service-grid">
      <div className="service-card panel"><i>⬡</i><div><h3>舰体维修</h3><p>当前完整度 {Math.round(ship.hull)} / {ship.maxHull}</p></div><button disabled={ship.hull>=ship.maxHull||resources.credits<=0} onClick={repair}>修复全部</button></div>
      <div className="service-card panel"><i>◈</i><div><h3>燃料补给</h3><p>当前储量 {Math.round(ship.fuel)} / {ship.maxFuel}</p></div><button disabled={ship.fuel>=ship.maxFuel||resources.credits<=0} onClick={refuel}>补充全部</button></div>
      <div className="service-card panel memory-service"><i>◇</i><div><h3>记忆析出</h3><p>{memoryCost.alloy} 合金 + {memoryCost.credits} 信用点 → 1 记忆</p></div><button disabled={resources.alloy<memoryCost.alloy||resources.credits<memoryCost.credits} onClick={synthesize}>开始析出</button></div>
    </div>
    <div className="shop panel">
      <div className="section-head"><b>今日零件清单</b><span>◈ {resources.credits} · 合金 {resources.alloy} · 记忆 {resources.memoryFragments}</span></div>
      <div className="shop-list">{shop.length?shop.map(id=>{const p=partById.get(id)!;const cost=partCost(p,sector);const disabled=resources.credits<cost.credits||resources.alloy<cost.alloy||resources.memoryFragments<cost.memory;return <article className={`shop-card rarity-${p.rarity}`} key={id}><small>{p.slot.toUpperCase()} / {p.rarity==='anomaly'?'RELIC':p.rarity.toUpperCase()}</small><h3>{p.name}</h3><p>{p.description}</p><b>{Object.entries(p.stats).map(([k,v])=>`${k} ${Number(v)>0?'+':''}${v}`).join(' · ')} · 能耗 {p.energyCost??0}</b><button disabled={disabled} onClick={()=>buy(id)}>购买 ◈ {cost.credits}{cost.alloy?` · 合金 ${cost.alloy}`:''}{cost.memory?` · 记忆 ${cost.memory}`:''}</button></article>}):<div className="empty">库存已售罄</div>}</div>
      <div className="sell-rack"><div className="section-head"><b>库存回收 · 半价结算</b><span>{sellable.length} TYPES</span><button className="sell-low-button" onClick={sellLow}>一键出售低阶库存</button></div>{sellable.map(id=>{const p=partById.get(id)!;return <button key={id} onClick={()=>sell(id)}><span>{p.name} ×{counts.get(id)}</span><b>出售一件 ◈ {Math.floor(partPrice(p,sector)/2)}</b></button>})}</div>
    </div>
  </section>;
}
