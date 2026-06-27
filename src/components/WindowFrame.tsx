import { useEffect, useState, type ReactNode } from 'react';
import { useGameStore } from '../game/gameStore';

export function WindowFrame({children}:{children:ReactNode}){
  const sector=useGameStore(s=>s.currentSector);const toggle=useGameStore(s=>s.toggleCollapse);const autopilot=useGameStore(s=>s.autopilotEnabled);const setAutopilot=useGameStore(s=>s.setAutopilot);
  const [clickThrough,setClickThrough]=useState(false);
  useEffect(()=>window.taskbarNova?.onClickThroughChanged(setClickThrough),[]);
  return <div className={`window-frame ${clickThrough?'click-through-mode':''}`}>
    <header className="titlebar">
      <div className="brand"><span className="brand-mark">N</span><div><b>TASKBAR NOVA</b><small>SECTOR {String(sector).padStart(2,'0')} · 星舰少女</small></div></div>
      <div className="drag-region"><span className="signal-dot"/>{clickThrough?'鼠标穿透中 · Ctrl+Alt+P / F8 恢复':'量子链路稳定 · Ctrl+Alt+P / F8 鼠标穿透'}</div>
      <nav className="window-controls">
        <button className={autopilot?'active':''} title="切换全权代理" onClick={()=>setAutopilot(!autopilot)}>代</button><button title="鼠标穿透 Ctrl+Alt+P / F8" onClick={()=>window.taskbarNova?.toggleClickThrough()}>穿</button><button title="收起" onClick={toggle}>⌄</button><button title="最小化" onClick={()=>window.taskbarNova?.minimize()}>—</button><button title="关闭" className="close" onClick={()=>window.taskbarNova?.close()}>×</button>
      </nav>
    </header>{clickThrough&&<div className="click-through-hint">鼠标穿透已开启：窗口可见，点击会操作后方内容。按 Ctrl+Alt+P 或 F8 关闭。</div>}{children}<i className="corner corner-a"/><i className="corner corner-b"/>
  </div>;
}
