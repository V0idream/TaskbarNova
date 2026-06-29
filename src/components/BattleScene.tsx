import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import battleBackdrop from '../assets/battle/battle_backdrop_seamless_v2.png';
import enemyBoss from '../assets/battle/enemy_boss.png';
import enemyElite from '../assets/battle/enemy_elite.png';
import enemyRaider from '../assets/battle/enemy_raider.png';
import playerShip from '../assets/ship/player_ship_v2.png';
import missileCommon from '../assets/battle/vfx/missile_common.png';
import missileRare from '../assets/battle/vfx/missile_rare.png';
import missileEpic from '../assets/battle/vfx/missile_epic.png';
import explosionVfx from '../assets/battle/vfx/explosion_vfx.png';
import shieldVfx from '../assets/battle/vfx/shield_vfx_v2.png';
import enginePlumeVfx from '../assets/battle/vfx/engine_plume_v2.png';
import cockpitPlasmaBolt from '../assets/battle/vfx/cockpit_plasma_bolt_v2.png';
import cockpitBridge from '../assets/battle/cockpit_bridge_v2.png';
import enemyFront from '../assets/battle/enemy_front.png';
import enemyBossFront from '../assets/battle/enemy_boss_front.png';
import { applyDamage, buildStage, enemyMeta, type EnemyUnit } from '../game/battleModel';
import { battleTuning } from '../game/balance';
import { deriveBattleLoadout, type WeaponFamily, type WeaponProfile } from '../game/equipmentEffects';
import { partById, useGameStore } from '../game/gameStore';
import type { PartRarity } from '../game/types';

type Bullet={id:number;x:number;y:number;vx:number;vy:number;damage:number;owner:'player'|'enemy';family:WeaponFamily;color:string;guidance:number;targetId?:number;tier:number;life:number;phase:number};
type Beam={x1:number;y1:number;x2:number;y2:number;life:number;color:string;owner:'player'|'enemy';width:number};
type Particle={x:number;y:number;vx:number;vy:number;life:number;color:string};
type Explosion={x:number;y:number;life:number;max:number;size:number;tier:number};
type Telemetry={hull:number;shield:number;locked:boolean;shots:number;hits:number;seconds:number;phase:string;wave:number;waveTotal:number;enemyName:string;enemyHp:number;enemyMax:number;ai:string;manual:boolean;enemyScreenX:number;enemyScreenY:number;targetScale:number;pitch:number};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const tierByRarity:Record<PartRarity,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,anomaly:5};

export function BattleScene(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const encounter=useGameStore(s=>s.battleEncounter),ship=useGameStore(s=>s.ship),finish=useGameStore(s=>s.finishBattle),settings=useGameStore(s=>s.settings),setSetting=useGameStore(s=>s.setSetting),computer=useGameStore(s=>s.tacticalComputer),sector=useGameStore(s=>s.currentSector);
  const loadout=useMemo(()=>deriveBattleLoadout(ship,partById),[ship]);
  const stage=useMemo(()=>buildStage(encounter?.danger??1, encounter?.enemy.id.includes('boss')||false, sector),[encounter?.danger,encounter?.enemy.id,sector]);
  const battleScaleRef=useRef(settings.battleScale);
  useEffect(()=>{battleScaleRef.current=settings.battleScale},[settings.battleScale]);
  const [telemetry,setTelemetry]=useState<Telemetry>({hull:ship.hull,shield:ship.shield,locked:false,shots:0,hits:0,seconds:0,phase:'接敌',wave:1,waveTotal:stage.length,enemyName:stage[0]?.name??'',enemyHp:stage[0]?.hp??1,enemyMax:stage[0]?.maxHp??1,ai:'待机',manual:false,enemyScreenX:50,enemyScreenY:42,targetScale:.72,pitch:0});

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas||!encounter)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const bg=new Image();bg.src=battleBackdrop;
    const pImg=new Image();pImg.src=playerShip;
    const images={normal:new Image(),elite:new Image(),boss:new Image(),missile0:new Image(),missile1:new Image(),missile2:new Image(),explosion:new Image(),shield:new Image(),engine:new Image()};
    images.normal.src=enemyRaider;images.elite.src=enemyElite;images.boss.src=enemyBoss;images.missile0.src=missileCommon;images.missile1.src=missileRare;images.missile2.src=missileEpic;images.explosion.src=explosionVfx;images.shield.src=shieldVfx;images.engine.src=enginePlumeVfx;
    const units=stage.map(unit=>({...unit}));
    let frame=0,last=performance.now(),lastUi=0,finished=false,endedAt=0,time=0,scroll=0,lockTime=0,bulletId=0;
    let playerY=canvas.clientHeight/2,lastPlayerY=playerY,pitchVisual=0,hull=ship.hull,shield=ship.shield,shots=0,hits=0,activeIndex=0;
    const weaponCooldowns=new Map<string,number>();
    const bullets:Bullet[]=[];const beams:Beam[]=[];const particles:Particle[]=[];const explosions:Explosion[]=[];
    const manual={keys:new Set<string>(),lastInput:-Infinity};
    const onKey=(event:KeyboardEvent,down:boolean)=>{const key=event.key.toLowerCase();if(!['w','s','a','d'].includes(key)) return;event.preventDefault();if(down) manual.keys.add(key); else manual.keys.delete(key);manual.lastInput=performance.now();};
    const onKeyDown=(event:KeyboardEvent)=>onKey(event,true); const onKeyUp=(event:KeyboardEvent)=>onKey(event,false);
    window.addEventListener('keydown',onKeyDown); window.addEventListener('keyup',onKeyUp);
    const addBurst=(x:number,y:number,color:string,count=10)=>{for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.5)*210,life:.35+Math.random()*.55,color})};
    const addExplosion=(x:number,y:number,size:number,tier:number)=>explosions.push({x,y,size,tier,life:.86+tier*.08,max:.86+tier*.08});
    const bounds=(h:number)=>({top:58,bottom:Math.max(130,h-58)});
    const sizeOf=(unit:EnemyUnit)=>enemyMeta[unit.kind].size;
    const visibleEnemy=(unit:EnemyUnit,w:number)=>unit.hp>0&&unit.x-sizeOf(unit)*.55<w&&unit.x+sizeOf(unit)*.55>0;
    const actionableEnemy=(unit:EnemyUnit,w:number)=>visibleEnemy(unit,w)&&unit.entered;
    const current=()=>units[activeIndex];
    const enemyWeaponText=(unit?:EnemyUnit)=>unit?unit.weapons.map(w=>w==='laser'?'相干光束':w==='missile'?'矢量导弹':'质量弹').join('+'):'-';
    const nearestLive=(w:number)=>units.find(unit=>visibleEnemy(unit,w))??units.find(unit=>unit.hp>0&&unit.x<w+160);
    const hasThreatMissile=(playerX:number)=>bullets.some(b=>b.owner==='enemy'&&b.family==='missile'&&Math.abs(b.x-playerX)<270);
    const choosePlayerTargetY=(enemy:EnemyUnit|undefined,h:number,primary:WeaponFamily)=>{
      const b=bounds(h); if(!enemy) return h*.5;
      const guard=computer.preference==='guard'||(computer.preference==='balanced'&&shield<ship.maxShield*.45)||hasThreatMissile(h*.17);
      const frontal=computer.style==='frontal'||(primary==='laser'&&!guard);
      if(frontal&&!guard) return clamp(enemy.y,b.top,b.bottom);
      const avoidOffset=enemy.y<h*.5?104:-104;
      return clamp(enemy.y+avoidOffset+Math.sin(time*1.4)*24,b.top,b.bottom);
    };
    const interceptMissilesByBeam=(beam:Beam)=>{
      for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(b.owner===beam.owner||b.family!=='missile')continue;const withinX=b.x>=Math.min(beam.x1,beam.x2)&&b.x<=Math.max(beam.x1,beam.x2);if(withinX&&Math.abs(b.y-beam.y1)<14+beam.width){addBurst(b.x,b.y,beam.color,12);bullets.splice(i,1);}}
    };
    const effectivePlayerAttack=ship.attack<=36?ship.attack:36+Math.sqrt(ship.attack-36)*3.2;
    const cappedPlayerDamage=(raw:number,target:EnemyUnit,family:WeaponFamily)=>Math.min(
      raw,
      target.maxHp*(family==='missile'?battleTuning.playerMissileMaxHitRatio:battleTuning.playerOtherMaxHitRatio)
    );
    const firePlayerWeapon=(weapon:WeaponProfile, enemy:EnemyUnit, playerX:number, y:number, w:number)=>{
      shots++;
      const critical=Math.random()<loadout.criticalChance;
      const damage=effectivePlayerAttack*weapon.damageMultiplier*battleTuning.playerDamageScale*(critical?battleTuning.playerCriticalMultiplier:1);
      if(weapon.instant){
        const beam={x1:playerX+78,y1:y,x2:w-28,y2:y,life:.13,color:weapon.projectileColor,owner:'player' as const,width:weapon.variant==='scatter'?10+weapon.visualTier*1.3:4+weapon.visualTier*.85};
        beams.push(beam); interceptMissilesByBeam(beam);
        if(visibleEnemy(enemy,w)&&Math.abs(enemy.y-y)<weapon.hitWidth&&enemy.x>playerX){enemy.hp-=cappedPlayerDamage(damage,enemy,weapon.family);hits++;addBurst(enemy.x,enemy.y,weapon.projectileColor,critical?20:11)}
        return;
      }
      const distance=Math.max(120,enemy.x-(playerX+75));
      const timeToImpact=distance/Math.max(1,weapon.projectileSpeed);
      const leadVy=weapon.family==='kinetic'
        ? clamp((enemy.y-y)/Math.max(.16,timeToImpact),-430,430)
        : clamp((enemy.y-y)/Math.max(.22,timeToImpact)*.82,-260-weapon.visualTier*34,260+weapon.visualTier*34);
      bullets.push({id:bulletId++,x:playerX+75,y,vx:weapon.projectileSpeed,vy:leadVy,damage,owner:'player',family:weapon.family,color:weapon.projectileColor,guidance:weapon.guidance,targetId:enemy.id,tier:weapon.visualTier,life:4,phase:Math.random()*Math.PI*2});
      addBurst(playerX-50,y,weapon.projectileColor,2+weapon.visualTier);
    };
    const fireKineticInterceptor=(weapon:WeaponProfile, missile:Bullet, playerX:number, y:number)=>{
      shots++;
      const distance=Math.max(40,missile.x-(playerX+75));
      const timeToImpact=distance/Math.max(1,weapon.projectileSpeed-missile.vx);
      const aimY=missile.y+missile.vy*Math.max(0,timeToImpact);
      bullets.push({id:bulletId++,x:playerX+75,y,vx:weapon.projectileSpeed,vy:clamp((aimY-y)/Math.max(.12,timeToImpact),-520,520),damage:effectivePlayerAttack*weapon.damageMultiplier*battleTuning.playerDamageScale,owner:'player',family:'kinetic',color:weapon.projectileColor,guidance:0,tier:weapon.visualTier,life:2.5,phase:0});
      addBurst(playerX+60,y,weapon.projectileColor,3+weapon.visualTier);
    };
    const fireEnemy=(enemy:EnemyUnit, playerX:number, enemyX:number)=>{
      const family=enemy.weapons[Math.floor(Math.random()*enemy.weapons.length)];
      const damage=Math.max(2,encounter.enemy.attack*(enemy.kind==='boss'?1.22:enemy.kind==='elite'?.96:.66)-ship.defense*.42);
      if(family==='laser'){
        enemy.laserCharge=0.42;
        const beam={x1:enemyX-70,y1:enemy.y,x2:playerX+30,y2:enemy.y,life:.18,color:'#ff477e',owner:'enemy' as const,width:5};
        beams.push(beam); interceptMissilesByBeam(beam);
        if(Math.abs(playerY-enemy.y)<22){const result=applyDamage(damage*1.08,shield,hull,0);shield=result.shield;hull=result.hull;addBurst(playerX,playerY,result.evaded?'#8fa9c7':'#ff477e',12)}
        return;
      }
      const speed=family==='missile'?220+sector*8:390+sector*10;
      bullets.push({id:bulletId++,x:enemyX-74,y:enemy.y,vx:-speed,vy:family==='missile'?(playerY-enemy.y)*.48:0,damage,owner:'enemy',family,color:family==='missile'?'#ffb347':'#ff6b88',guidance:family==='missile'?1.35+sector*.055:0,targetId:undefined,tier:Math.min(3,Math.floor(sector/2)),life:4,phase:Math.random()*Math.PI*2});
    };
    const render=(now:number)=>{
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(520,rect.width),h=Math.max(260,rect.height);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const dt=Math.min(.04,(now-last)/1000)*battleScaleRef.current;last=now;time+=dt;scroll+=dt*130;lockTime+=dt;
      const b=bounds(h),playerX=w*.17,live=nearestLive(w)??current(),enemyStopX=w*.58;
      const manualActive=manual.keys.size>0||performance.now()-manual.lastInput<1000;
      if(!endedAt&&live){
        if(manualActive){const axis=(manual.keys.has('w')?-1:0)+(manual.keys.has('s')?1:0);playerY=clamp(playerY+axis*loadout.maneuverSpeed*1.2*dt,b.top,b.bottom);}
        else{const targetY=choosePlayerTargetY(live,h,loadout.primaryFamily);playerY=clamp(playerY+clamp(targetY-playerY,-loadout.maneuverSpeed*dt,loadout.maneuverSpeed*dt),b.top,b.bottom);}
        const pitchTarget=clamp((lastPlayerY-playerY)/Math.max(.001,dt)*.045,-13,13);
        pitchVisual+=(pitchTarget-pitchVisual)*Math.min(1,dt*7);
        lastPlayerY=playerY;
        units.forEach(unit=>{
          if(unit.hp<=0) return;
          if(unit.x>w+sizeOf(unit)*.8) {unit.x-=unit.speed*dt; return;}
          unit.entered=true;
          if(unit.x>enemyStopX) unit.x=Math.max(enemyStopX,unit.x-unit.speed*dt);
          unit.y=clamp(unit.y+Math.sin(time*(unit.kind==='boss'?.48:.92)+unit.id)*24*dt,b.top,b.bottom);
          if(!actionableEnemy(unit,w)) return;
          unit.cooldown-=dt;unit.laserCharge=Math.max(0,unit.laserCharge-dt);
          if(unit.cooldown<=0){fireEnemy(unit,playerX,unit.x);unit.cooldown=unit.kind==='boss'?.92:unit.kind==='elite'?1.18:1.55;}
        });
        const target=nearestLive(w);
        if(target&&visibleEnemy(target,w)){
          loadout.weapons.forEach((weapon,index)=>{
            const key=weapon.slot;const cd=(weaponCooldowns.get(key)??index*.25)-dt;weaponCooldowns.set(key,cd);
            const aligned=Math.abs(target.y-playerY)<28+weapon.visualTier*2;
            const manualFire=manualActive&&((weapon.slot==='weapon1'&&manual.keys.has('a'))||(weapon.slot==='weapon2'&&manual.keys.has('d')));
            const defensive=computer.preference==='guard'||(computer.preference==='balanced'&&shield<ship.maxShield*.45);
            const threat=defensive&&weapon.family==='kinetic'?bullets.filter(b=>b.owner==='enemy'&&b.family==='missile'&&b.x>playerX).sort((a,b)=>a.x-b.x)[0]:undefined;
            const autoFire=!manualActive&&(weapon.family!=='laser'||aligned);
            if(cd<=0&&threat){fireKineticInterceptor(weapon,threat,playerX,playerY+(index?12:-10));weaponCooldowns.set(key,weapon.fireInterval*.72);}
            else if(cd<=0&&(manualFire||autoFire)){firePlayerWeapon(weapon,target,playerX,playerY+(index?12:-10),w);weaponCooldowns.set(key,weapon.fireInterval);}
          });
        }
        shield=Math.min(ship.maxShield,shield+loadout.shieldRegen*dt);
        for(let i=bullets.length-1;i>=0;i--){const bullet=bullets[i];bullet.life-=dt;
          if(bullet.family==='missile'){
            const target=bullet.owner==='player'
              ? units.find(unit=>unit.id===bullet.targetId&&visibleEnemy(unit,w)) ?? units.find(unit=>visibleEnemy(unit,w))
              : undefined;
            if(target&&bullet.owner==='player') bullet.targetId=target.id;
            const targetY=bullet.owner==='player'?(target?target.y+Math.sin(time*.8+target.id)*8:bullet.y):playerY;
            const weaveAmp=bullet.owner==='player'
              ? battleTuning.playerMissileWeaveBase+bullet.tier*battleTuning.playerMissileWeavePerTier
              : battleTuning.enemyMissileWeaveBase+bullet.tier*battleTuning.enemyMissileWeavePerTier;
            const weave=Math.sin(time*(4.1+bullet.tier*.35)+bullet.phase)*weaveAmp;
            const turnBonus=bullet.owner==='player'?battleTuning.playerMissileTurnBonus:battleTuning.enemyMissileTurnBonus;
            const maxTurn=(320+bullet.tier*66)*turnBonus;
            const desiredVy=clamp((targetY+weave-bullet.y)*bullet.guidance,-maxTurn,maxTurn);
            const response=clamp(dt*(bullet.owner==='player'?5.2+bullet.tier*.55:2.8),0,1);
            bullet.vy+=(desiredVy-bullet.vy)*response;
          }
          bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;
          for(let j=bullets.length-1;j>=0;j--){const other=bullets[j];if(i===j||other.owner===bullet.owner)continue;if((bullet.family==='missile'||other.family==='missile')&&Math.hypot(bullet.x-other.x,bullet.y-other.y)<16+Math.max(bullet.tier,other.tier)*2){addBurst((bullet.x+other.x)/2,(bullet.y+other.y)/2,bullet.family==='missile'?other.color:bullet.color,14);bullets.splice(Math.max(i,j),1);bullets.splice(Math.min(i,j),1);i=Math.min(i,bullets.length);break;}}
          if(i>=bullets.length) continue;
          if(bullet.owner==='player'){
            const missileFuse=bullet.family==='missile'?battleTuning.playerMissileProximityBase+bullet.tier*battleTuning.playerMissileProximityPerTier:0;
            const target=units.find(unit=>visibleEnemy(unit,w)&&Math.abs(bullet.x-unit.x)<sizeOf(unit)*.42+missileFuse&&Math.abs(bullet.y-unit.y)<sizeOf(unit)*.28+missileFuse);
            if(target){target.hp-=cappedPlayerDamage(bullet.damage,target,bullet.family);hits++;addBurst(bullet.x,bullet.y,bullet.color,bullet.family==='missile'?20+bullet.tier*4:8+bullet.tier);if(bullet.family==='missile')addExplosion(bullet.x,bullet.y,48+bullet.tier*10,bullet.tier);bullets.splice(i,1);continue}
          } else if(Math.abs(bullet.x-playerX)<54&&Math.abs(bullet.y-playerY)<30){
            const result=applyDamage(bullet.damage,shield,hull,bullet.family==='missile'?loadout.evasion*.9:loadout.evasion*.35);
            shield=result.shield;hull=result.hull;addBurst(bullet.x,bullet.y,result.evaded?'#8fa9c7':shield>0?'#38e8ff':'#ff4d6d',result.evaded?5:11);if(bullet.family==='missile')addExplosion(bullet.x,bullet.y,46,bullet.tier);bullets.splice(i,1);continue;
          }
          if(bullet.life<=0||bullet.x<-80||bullet.x>w+90||bullet.y<-70||bullet.y>h+70) bullets.splice(i,1);
        }
        units.forEach(unit=>{if(unit.hp<=0&&!unit.exploded){unit.exploded=true;addBurst(unit.x,unit.y,unit.kind==='boss'?'#ff4d6d':'#ffb347',unit.kind==='boss'?56:26);addExplosion(unit.x,unit.y,unit.kind==='boss'?130:72,unit.kind==='boss'?4:2);}});
        while(activeIndex<units.length&&units[activeIndex].hp<=0) activeIndex++;
        if(hull<=0||units.every(unit=>unit.hp<=0)){endedAt=time;addExplosion(hull<=0?playerX:w*.72,hull<=0?playerY:h*.5,hull<=0?96:120,hull<=0?2:4);addBurst(hull<=0?playerX:w*.72,hull<=0?playerY:h*.5,hull<=0?'#ff4d6d':'#63f5a8',54)}
      }
      for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
      for(let i=beams.length-1;i>=0;i--){beams[i].life-=dt;if(beams[i].life<=0)beams.splice(i,1)}
      for(let i=explosions.length-1;i>=0;i--){explosions[i].life-=dt;if(explosions[i].life<=0)explosions.splice(i,1)}
      const cockpitTargets=canvas.parentElement?.querySelectorAll<HTMLElement>('.combat-depth-lines>i');
      const projectedUnits=units.filter(unit=>visibleEnemy(unit,w)).slice(0,cockpitTargets?.length??0);
      cockpitTargets?.forEach((target,index)=>{
        const unit=projectedUnits[index];
        if(!unit){target.className='';target.style.cssText='';return}
        const depth=clamp((unit.x-playerX)/Math.max(1,w-playerX),0,1);
        const screenX=clamp(50+(unit.y-h*.5)/Math.max(1,h)*58,17,83);
        const screenY=clamp(20+(1-depth)*31,18,55);
        const scale=clamp(.52+(1-depth)*.68,.5,1.2);
        target.className=`enemy-proxy ${unit.kind} ${unit===live?'active-target':''}`;
        target.style.left=`${screenX}%`;
        target.style.top=`${screenY}%`;
        target.style.width=`${enemyMeta[unit.kind].size*scale}px`;
        target.style.height=`${enemyMeta[unit.kind].size*.64*scale}px`;
        target.style.backgroundImage=`url(${unit.kind==='boss'?enemyBossFront:enemyFront})`;
        target.style.opacity=unit.hp>0?'1':'0';
      });
      const cockpitVisual=canvas.parentElement?.querySelector<HTMLElement>('.cockpit-combat-visual');
      let projectileLayer=cockpitVisual?.querySelector<HTMLElement>('.tracked-projectile-layer');
      if(cockpitVisual&&!projectileLayer){projectileLayer=document.createElement('div');projectileLayer.className='tracked-projectile-layer';cockpitVisual.appendChild(projectileLayer)}
      const projectedEffects=[
        ...bullets.filter(bullet=>bullet.x>-50&&bullet.x<w+50).slice(-14).map(bullet=>({kind:bullet.family,owner:bullet.owner,x:bullet.x,y:bullet.y,tier:bullet.tier,color:bullet.color,life:bullet.life})),
        ...beams.slice(-4).map(beam=>({kind:'laser' as const,owner:beam.owner,x:(beam.x1+beam.x2)/2,y:(beam.y1+beam.y2)/2,tier:0,color:beam.color,life:beam.life})),
        ...explosions.slice(-4).map(explosion=>({kind:'explosion' as const,owner:'enemy' as const,x:explosion.x,y:explosion.y,tier:explosion.tier,color:'#ffb347',life:explosion.life}))
      ];
      if(projectileLayer){
        while(projectileLayer.children.length<projectedEffects.length)projectileLayer.appendChild(document.createElement('i'));
        while(projectileLayer.children.length>projectedEffects.length)projectileLayer.lastElementChild?.remove();
        projectedEffects.forEach((effect,index)=>{
          const node=projectileLayer!.children[index] as HTMLElement;
          const depth=clamp((effect.x-playerX)/Math.max(1,w-playerX),0,1);
          const screenX=clamp(50+(effect.y-h*.5)/Math.max(1,h)*64,10,90);
          const screenY=clamp(18+(1-depth)*48,15,72);
          const nearScale=clamp(.28+(1-depth)*1.25,.25,1.55);
          node.className=`tracked-projectile ${effect.owner} ${effect.kind}`;
          node.style.left=`${screenX}%`;node.style.top=`${screenY}%`;
          node.style.opacity=String(clamp(effect.life*3,0,1));
          node.style.setProperty('--shot-scale',String(nearScale));
          node.style.setProperty('--shot-color',effect.color);
          node.style.backgroundImage=effect.kind==='missile'
            ? `url(${effect.tier>=3?missileEpic:effect.tier>=1?missileRare:missileCommon})`
            : effect.kind==='explosion'?`url(${explosionVfx})`
            : `url(${cockpitPlasmaBolt})`;
        });
      }
      ctx.clearRect(0,0,w,h);
      if(bg.complete){
        const scale=Math.max(w/bg.width,h/bg.height),dw=bg.width*scale,dh=bg.height*scale,travel=scroll*.42;
        const firstIndex=Math.floor(travel/dw),ox=-(travel-firstIndex*dw),tileCount=Math.ceil(w/dw)+2,drawWidth=Math.ceil(dw)+1;
        ctx.globalAlpha=.9;
        for(let n=-1;n<tileCount;n++){
          const x=ox+n*dw,tileIndex=firstIndex+n;
          if(Math.abs(tileIndex)%2===0)ctx.drawImage(bg,x,-(dh-h)/2,drawWidth,dh);
          else{ctx.save();ctx.translate(x+drawWidth,0);ctx.scale(-1,1);ctx.drawImage(bg,0,-(dh-h)/2,drawWidth,dh);ctx.restore();}
        }
        ctx.globalAlpha=1;
      }else{ctx.fillStyle='#030817';ctx.fillRect(0,0,w,h)}
      ctx.fillStyle='rgba(3,9,22,.25)';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(56,232,255,.14)';ctx.setLineDash([10,12]);for(let y=60;y<h;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.setLineDash([]);
      units.filter(unit=>unit.hp>0&&unit.x>-180&&unit.x<w+260).forEach(unit=>{const img=images[unit.kind],size=sizeOf(unit);if(img.complete){ctx.save();ctx.shadowBlur=unit.kind==='boss'?24:16;ctx.shadowColor=unit.kind==='normal'?'#ff4d6d':'#b06cff';ctx.drawImage(img,unit.x-size/2,unit.y-size*.32,size,size*.64);ctx.restore()}ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(unit.x-size*.35,unit.y-size*.42,size*.7,4);ctx.fillStyle=unit.kind==='boss'?'#ff4d6d':unit.kind==='elite'?'#b06cff':'#ffb347';ctx.fillRect(unit.x-size*.35,unit.y-size*.42,size*.7*Math.max(0,unit.hp/unit.maxHp),4);if(unit.weapons.includes('laser')&&unit.laserCharge>0){ctx.strokeStyle='rgba(255,71,126,.45)';ctx.beginPath();ctx.moveTo(0,unit.y);ctx.lineTo(unit.x,unit.y);ctx.stroke()}});
      const enginePart=partById.get(ship.equipped.engine??''),engineTier=tierByRarity[enginePart?.rarity??'common'];
      if(pImg.complete){const enginePulse=.84+Math.sin(time*(10+engineTier))*0.16,plumeWidth=(105+engineTier*15)*enginePulse,plumeHeight=36+engineTier*4;ctx.save();ctx.shadowBlur=16+engineTier*3;ctx.shadowColor=engineTier>=3?'#b488ff':'#38e8ff';ctx.globalAlpha=.5+.07*engineTier;if(images.engine.complete)ctx.drawImage(images.engine,playerX-61-plumeWidth,playerY-plumeHeight/2,plumeWidth,plumeHeight);ctx.globalAlpha=1;ctx.drawImage(pImg,playerX-74,playerY-34,154,77);ctx.restore()}
      const shieldPart=partById.get(ship.equipped.shield??''),shieldTier=tierByRarity[shieldPart?.rarity??'common'];
      if(shield>0){const shieldPulse=1+Math.sin(time*(2.4+shieldTier*.2))*.035;ctx.save();ctx.globalAlpha=(.16+shield/ship.maxShield*.34)*(0.88+Math.sin(time*3.1)*.12);if(images.shield.complete)ctx.drawImage(images.shield,playerX-(82+shieldTier*3)*shieldPulse,playerY-(58+shieldTier*2)*shieldPulse,(164+shieldTier*6)*shieldPulse,(116+shieldTier*4)*shieldPulse);ctx.strokeStyle=`rgba(${80+shieldTier*20},220,255,${.24+shield/ship.maxShield*.42})`;ctx.lineWidth=2+shieldTier*.35;ctx.beginPath();ctx.ellipse(playerX,playerY,(72+shieldTier*4)*shieldPulse,(42+shieldTier*2)*shieldPulse,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
      bullets.forEach(bu=>{ctx.save();ctx.fillStyle=bu.color;ctx.strokeStyle=bu.color;ctx.shadowBlur=bu.family==='missile'?18+bu.tier*3:9+bu.tier*2;ctx.shadowColor=bu.color;if(bu.family==='missile'){const img=bu.tier>=3?images.missile2:bu.tier>=1?images.missile1:images.missile0,ww=34+bu.tier*5,hh=12+bu.tier*2;ctx.translate(bu.x,bu.y);ctx.rotate(Math.atan2(bu.vy,bu.vx));if(img.complete)ctx.drawImage(img,-ww/2,-hh/2,ww,hh);else{ctx.beginPath();ctx.moveTo(ww/2,0);ctx.lineTo(-ww/2,-hh/2);ctx.lineTo(-ww/2,hh/2);ctx.closePath();ctx.fill()}ctx.globalAlpha=.45;ctx.fillRect(-ww-18,-2,ww,4)}else{ctx.lineWidth=3+bu.tier*.45;ctx.beginPath();ctx.moveTo(bu.x-22-bu.tier*3,bu.y);ctx.lineTo(bu.x+14+bu.tier*2,bu.y);ctx.stroke()}ctx.restore()});
      beams.forEach(beam=>{ctx.save();ctx.globalAlpha=clamp(beam.life*7,0,1);ctx.strokeStyle=beam.color;ctx.shadowBlur=22;ctx.shadowColor=beam.color;ctx.lineWidth=beam.width;ctx.beginPath();ctx.moveTo(beam.x1,beam.y1);ctx.lineTo(beam.x2,beam.y2);ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore()});
      explosions.forEach(e=>{ctx.save();ctx.globalAlpha=clamp(e.life/e.max,0,1);const scale=1+(1-e.life/e.max)*.65;if(images.explosion.complete)ctx.drawImage(images.explosion,e.x-e.size*scale/2,e.y-e.size*scale/2,e.size*scale,e.size*scale);else{ctx.fillStyle='#ffb347';ctx.beginPath();ctx.arc(e.x,e.y,e.size*.3*scale,0,Math.PI*2);ctx.fill()}ctx.restore()});
      particles.forEach(p=>{ctx.globalAlpha=clamp(p.life*1.8,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)});ctx.globalAlpha=1;
      if(now-lastUi>90){
        lastUi=now;
        const active=nearestLive(w)??current();
        const ai=manualActive?'手动接管：W/S 机动，A/D 分别开火':computer.style==='frontal'?'正面交战：火控贴近目标轴线':'迂回作战：保持偏轴航迹';
        const activeDepth=active?clamp((active.x-playerX)/Math.max(1,w-playerX),0,1):.5;
        const enemyScreenX=active?clamp(50+(active.y-h*.5)/Math.max(1,h)*58,17,83):50;
        const enemyScreenY=active?clamp(20+(1-activeDepth)*31,18,55):42;
        const targetScale=active?clamp(.52+(1-activeDepth)*.68,.5,1.2):.78;
        setTelemetry({hull:Math.max(0,hull),shield:Math.max(0,shield),locked:lockTime>=loadout.lockSeconds,shots,hits,seconds:time,phase:endedAt?(hull>0?'关卡清空':'舰体失效'):`${active?.name??'目标'} / ${enemyWeaponText(active)}`,wave:Math.min(units.filter(u=>u.hp<=0).length+1,units.length),waveTotal:units.length,enemyName:active?.name??'清空',enemyHp:Math.max(0,active?.hp??0),enemyMax:active?.maxHp??1,ai,manual:manualActive,enemyScreenX,enemyScreenY,targetScale,pitch:pitchVisual});
      }
      if(endedAt&&time-endedAt>1.15&&!finished){finished=true;finish({won:hull>0&&units.every(unit=>unit.hp<=0),hull:Math.max(0,hull),shield:Math.max(0,shield),durationSeconds:time,shotsFired:shots,hits});return}
      frame=requestAnimationFrame(render);
    };
    frame=requestAnimationFrame(render);return()=>{cancelAnimationFrame(frame);canvas.parentElement?.querySelector('.tracked-projectile-layer')?.remove();window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp)};
  },[encounter,finish,loadout,ship,stage,computer,sector]);

  if(!encounter)return <div className="battle-scene panel">战斗数据同步中...</div>;
  const t=telemetry,accuracy=t.shots?Math.round(t.hits/t.shots*100):0;
  const cockpitMode=settings.battleView==='cockpit';
  const frontalEnemy=encounter.enemy.id.includes('boss')?enemyBossFront:enemyFront;
  const cockpitStyle={
    backgroundImage:`linear-gradient(rgba(2,7,18,.03),rgba(2,7,18,.12)),url(${cockpitBridge})`,
    '--enemy-x':`${t.enemyScreenX}%`,
    '--enemy-y':`${t.enemyScreenY}%`,
    '--target-scale':t.targetScale,
    '--cockpit-pitch':`${t.pitch}deg`,
    '--ladder-shift':`${t.pitch*1.8}px`,
    '--camera-shift':`${t.pitch*1.35}px`,
    '--cockpit-bolt':`url(${cockpitPlasmaBolt})`
  } as CSSProperties;
  return <section className="battle-scene">
    <div className="battle-header"><div><small>{cockpitMode?'3D COCKPIT COMBAT':'SIDE-SCROLLING COMBAT'} / WAVE {t.wave} OF {t.waveTotal}</small><h2>{ship.name} <b>VS</b> {t.enemyName}</h2></div><div className="battle-speed"><button className={cockpitMode?'active':''} onClick={()=>setSetting('battleView',cockpitMode?'side':'cockpit')}>{cockpitMode?'横版':'3D视角'}</button><span>{t.manual?'手动接管':'自动战术'}</span>{([1,2] as const).map(value=><button key={value} className={settings.battleScale===value?'active':''} onClick={()=>setSetting('battleScale',value)}>{value}×</button>)}</div></div>
    <div className="battle-layout"><div className={`battle-viewport panel ${cockpitMode?'battle-cockpit-mode':''}`}><canvas ref={canvasRef}/>{cockpitMode&&<div className="cockpit-combat-visual" style={cockpitStyle}><div className="combat-depth-lines"><i/><i/><i/><i/></div><img className={`frontal-enemy ${encounter.enemy.id.includes('boss')?'boss':''}`} src={frontalEnemy} alt="敌舰正面"/><div className="fighter-hud combat-hud"><div className="pitch-ladder"><i className="pitch p20"><b>20</b></i><i className="pitch p10"><b>10</b></i><i className="pitch p0"><b>0</b></i><i className="pitch n10"><b>10</b></i><i className="pitch n20"><b>20</b></i></div><div className="flight-path-marker"><i/><i/><b/></div><div className="heading-tape"><span>330</span><span>345</span><b>000</b><span>015</span><span>030</span></div><div className="hud-speed"><small>SPD</small><b>{Math.round(420+loadout.maneuverSpeed)}</b></div><div className="hud-altitude"><small>PITCH</small><b>{t.pitch>=0?'+':''}{t.pitch.toFixed(1)}°</b></div></div><div className="combat-lock-reticle"><i/><b>{t.locked?'TARGET LOCK':'ACQUIRING'}</b></div><div className="cockpit-weapon-flash left"/><div className="cockpit-weapon-flash right"/></div>}<div className="battle-bars"><div><span>{ship.name} SHIELD</span><i><em style={{width:`${t.shield/ship.maxShield*100}%`}}/></i><b>{Math.ceil(t.shield)} / {ship.maxShield}</b></div><div className="enemy-bar"><span>{t.enemyName} ARMOR</span><i><em style={{width:`${t.enemyHp/t.enemyMax*100}%`}}/></i><b>{Math.ceil(t.enemyHp)} / {t.enemyMax}</b></div></div><div className="combat-phase" role="status"><i className={t.locked?'locked':''}/>{t.phase}</div></div>
      <aside className="battle-loadout panel"><div className="section-head"><b>装备实效 / 行动逻辑</b><span>LIVE</span></div><div className={`manual-control-card ${t.manual?'active':''}`}><b>手动接管</b><p>按 W/S 上下移动，A 发射武器槽 1，D 发射武器槽 2；停止操作 1 秒后回到自动模式。</p></div>{loadout.weapons.map(weapon=><div className={`effect-card weapon ${weapon.family}`} key={weapon.slot}><small>{weapon.slot.toUpperCase()} / TIER {weapon.visualTier+1}</small><b>{weapon.weaponName}</b><p>{weapon.family==='laser'?'相干光束会在轴线重合时切入护层':weapon.family==='missile'?'矢量导弹会折线追踪，也可能被火力拦截':'质量弹会提前修正炮口，但飞行时间会留下偏差'} · 间隔 {weapon.fireInterval.toFixed(2)}s</p></div>)}<div className="effect-card engine"><small>TACTICAL COMPUTER</small><b>{t.ai}</b><p>作战电脑读取“作战风格”和“战术偏好”决定贴近轴线或偏轴机动。</p></div><div className="effect-card shield"><small>SHIELD / HULL DAMAGE</small><b>{loadout.shieldName}</b><p>护盾先吸收伤害；胜利后护盾自动回满，护盾等级会改变场上护层表现。</p></div><div className="effect-card radar"><small>RADAR / FIRE CONTROL</small><b>{loadout.radarName}</b><p>锁定 {loadout.lockSeconds.toFixed(1)}s · 暴击 {Math.round(loadout.criticalChance*100)}%</p></div><div className="battle-stats" data-testid="battle-telemetry"><span>战斗时间<b>{t.seconds.toFixed(1)}s</b></span><span>射击 / 命中<b>{t.shots} / {t.hits}</b></span><span>命中率<b>{accuracy}%</b></span><span>舰体<b>{Math.ceil(t.hull)} / {ship.maxHull}</b></span></div></aside>
    </div>
  </section>;
}
