import { useGameStore } from '../game/gameStore';

export function SettingsPanel(){
  const settings=useGameStore(s=>s.settings);
  const setSetting=useGameStore(s=>s.setSetting);
  const setMode=useGameStore(s=>s.setMode);
  const reset=useGameStore(s=>s.resetGame);
  const autopilot=useGameStore(s=>s.autopilotEnabled);
  const setAutopilot=useGameStore(s=>s.setAutopilot);
  return <section className="mode-panel settings-panel">
    <div className="panel-title"><div><small>SYSTEM CONFIGURATION</small><h2>控制台设置</h2></div><button onClick={()=>setMode('starMap')}>返回星图</button></div>
    <div className="settings-grid panel">
      <label><div><b>全权代理</b><small>自动规划、处理事件、整备装备与补给</small></div><input type="checkbox" checked={autopilot} onChange={e=>setAutopilot(e.target.checked)}/></label>
      <label><div><b>代理航行风格</b><small>决定自动代理选择航点时的风险倾向</small></div><select value={settings.navigationStyle} onChange={e=>setSetting('navigationStyle',e.target.value as 'combat'|'avoid'|'balanced')}><option value="combat">多战</option><option value="avoid">避战</option><option value="balanced">均衡</option></select></label>
      <label><div><b>默认跃迁速度</b><small>开始航行时采用的时间倍率</small></div><select value={settings.defaultTravelScale} onChange={e=>setSetting('defaultTravelScale',Number(e.target.value) as 1|4|12)}><option value={1}>1×</option><option value={4}>4×</option><option value={12}>12×</option></select></label>
      <label><div><b>默认战斗速度</b><small>进入战斗时采用的时间倍率</small></div><select value={settings.defaultBattleScale} onChange={e=>setSetting('defaultBattleScale',Number(e.target.value) as 1|2)}><option value={1}>1×</option><option value={2}>2×</option></select></label>
      <label><div><b>窗口置顶</b><small>让 Nova 常驻其他窗口上方</small></div><input type="checkbox" checked={settings.alwaysOnTop} onChange={e=>setSetting('alwaysOnTop',e.target.checked)}/></label>
      <label><div><b>界面透明度</b><small>{Math.round(settings.opacity*100)}%</small></div><input type="range" min="0.1" max="1" step="0.05" value={settings.opacity} onChange={e=>setSetting('opacity',Number(e.target.value))}/></label>
      <label><div><b>战斗视角</b><small>可在战斗中随时切换</small></div><select value={settings.battleView} onChange={e=>setSetting('battleView',e.target.value as 'side'|'cockpit')}><option value="side">横版战术视角</option><option value="cockpit">3D 驾驶舱视角</option></select></label>
      <label><div><b>减少动态效果</b><small>关闭喷焰、流光和扫描动画</small></div><input type="checkbox" checked={settings.reduceMotion} onChange={e=>setSetting('reduceMotion',e.target.checked)}/></label>
      <label><div><b>勿扰模式</b><small>降低通讯与非关键提示频率</small></div><input type="checkbox" checked={settings.doNotDisturb} onChange={e=>setSetting('doNotDisturb',e.target.checked)}/></label>
      <label><div><b>台词频率</b><small>当前：{settings.dialogueFrequency}</small></div><select value={settings.dialogueFrequency} onChange={e=>setSetting('dialogueFrequency',e.target.value as 'low'|'normal'|'high')}><option value="low">低</option><option value="normal">标准</option><option value="high">高</option></select></label>
      <button className="danger-button" onClick={()=>confirm('确定结束当前旅程并回到开档选择？')&&reset()}>结束旅程</button>
    </div>
  </section>;
}
