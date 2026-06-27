# 美术素材说明

## v0.5.1 横向无缝战斗背景

本版本使用内置 `imagegen` 工具生成并落盘：

- `src/assets/battle/battle_backdrop_seamless_v2.png`：横向连续滚动的深空战斗背景，尺寸 1774×887。

画布绘制时让相邻图块交替水平镜像，使每一处连接都由同一张图的同侧边缘相接；即使图片生成时存在轻微边缘差异，运行时交界仍会保持像素连续。

最终提示词：

```text
Use case: stylized-concept
Asset type: seamless horizontally tileable 2D game battle background texture
Primary request: a deep-space battlefield panorama designed for continuous horizontal scrolling in a compact sci-fi desktop game
Scene/backdrop: dark navy-black starfield, sparse tiny stars, extremely subtle distant cyan and violet nebula haze, a few faint dust lanes; no planets, no ships, no large focal objects
Style/medium: polished cinematic sci-fi game background, realistic painted space texture, restrained contrast so bright HUD and projectiles remain readable
Composition/framing: wide landscape panorama with evenly distributed detail and no central focal point; the left and right edges must connect seamlessly when repeated horizontally
Lighting/mood: cold, quiet, dangerous deep space; very dark overall
Color palette: near-black navy, muted cyan, faint violet; avoid warm colors
Constraints: truly seamless horizontal tiling; matching color, star density, nebula structure, and luminance at the left and right boundaries; no text; no logo; no watermark; no borders; no frame; no cockpit; no spacecraft; no planets
Avoid: bright edge glow, large stars at boundaries, obvious repeating motifs, centered vortex, horizon line, visible seam
```

## v0.5.0 驾驶舱与正面敌舰

本版本继续使用内置 `imagegen` 工具生成并落盘：

- `src/assets/battle/cockpit_bridge_v2.png`：驾驶舱与战斗 3D 视角共用的无文字内景。
- `src/assets/battle/enemy_front.png`：普通敌舰正面透明精灵。
- `src/assets/battle/enemy_boss_front.png`：BOSS 正面透明精灵。

两张敌舰先生成纯绿幕源图，再使用 `remove_chroma_key.py` 本地去背；透明像素分别为 `1261502/1572864` 与 `912628/1572864`。

驾驶舱最终提示词：

```text
Use case: stylized-concept
Asset type: game cockpit environment background
Primary request: a fully redrawn first-person cockpit interior for a compact deep-space interceptor, viewed from the pilot seat looking forward into open space
Scene/backdrop: panoramic armored canopy, distant blue-violet nebula, sparse stars, a subtle warp corridor far ahead; dark cockpit structure and consoles occupy the lower quarter and side edges
Style/medium: high-end cinematic 3D game environment render, hard-surface sci-fi realism
Composition/framing: wide 16:9 landscape, symmetrical forward view, clear central sightline and large unobstructed center region for code-rendered HUD and targets
Constraints: no pilot, no hands, no spacecraft outside, no text, no letters, no numbers, no logos, no watermark, no baked-in HUD reticle
```

正面敌舰提示词：

```text
Use case: stylized-concept
Asset type: front-facing hostile spacecraft game sprite for a cockpit combat view
Primary request: a single hostile spacecraft seen directly head-on, centered, flying toward the camera
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal
Style/medium: cinematic 3D hard-surface game render
Composition/framing: exact frontal orthographic-like view, whole ship visible, generous padding
Constraints: uniform chroma background, crisp edges, no green on ship, no shadow, no text, no logo, no watermark
```

Nova 正式通讯立绘由内置 imagegen 工具生成，项目路径为 `src/assets/pilot/nova_neutral.png`。

## Nova 最终提示词

```text
Use case: stylized-concept
Asset type: game character portrait for the right-side communications panel of a compact desktop HUD
Primary request: Nova, an adult young anime starship pilot and amnesiac navigator, calm, intelligent, reliable, subtly warm rather than overly cute
Subject: silver-white long hair with a pale blue gradient, blue-violet softly glowing eyes, futuristic white and navy pilot suit with cyan holographic accents, transparent single-eye HUD visor, small communication earpiece, slim light shoulder armor, small chest energy core; half-body portrait facing the viewer, slightly turned, right hand naturally touching a holographic control panel
Style/medium: premium 2D anime visual-novel character art, clean line art, detailed cel shading, refined soft rim light
Composition/framing: portrait orientation, half body fully contained, generous padding, character centered slightly to the right for a communications panel
Scene/backdrop: very dark navy transparent-glass spaceship HUD alcove, subtle cyan and violet interface glow, clean and low contrast, no readable text
Color palette: white, deep navy, cyan, restrained violet
Constraints: adult appearance age 18-22; elegant futuristic design; non-revealing practical pilot suit; hands anatomically correct; no text, no logo, no watermark
Avoid: childlike appearance, sexualized clothing, exaggerated anatomy, extra fingers, asymmetrical eyes, photorealism, 3D plastic look, cluttered background, horror, gore, harsh shadows
```

## v0.3.3 应用图标

本版本使用内置 imagegen 工具生成应用图标，并复制进工程目录：

- `src/assets/app/taskbar_nova_icon_chroma.png`：原始绿幕源图。
- `src/assets/app/taskbar_nova_icon.png`：本地去背后的透明 PNG。
- `src/assets/app/taskbar_nova_icon.ico`：Windows 图标源。
- `build/icon.ico`：Electron Builder 打包使用的正式图标。

透明图标校验结果：最终 PNG 包含 Alpha 通道，Alpha 范围为 0–255，四角透明。

最终提示词：

```text
Use case: logo-brand
Asset type: Windows desktop application icon for a sci-fi anime HUD game named Taskbar Nova
Primary request: create a polished square app icon: a sleek cyan-blue starship silhouette forming a capital N, with a small glowing nova star core and subtle orbital ring, futuristic holographic style
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal
Subject: emblem-like starship N mark, readable at small sizes, centered with generous padding
Style/medium: high-polish game app icon, semi-3D glossy sci-fi illustration, vector-friendly shapes but raster-rendered
Composition/framing: centered square icon, strong silhouette, no tiny details, no border cut off
Lighting/mood: luminous cyan, violet accents, crisp glow, dark metallic ship surfaces
Color palette: cyan, electric blue, violet, white highlights; do not use green in the subject
Text: none
Constraints: background must be one uniform #00ff00 color with no shadow, gradient, texture, floor, reflection, watermark, or text. Keep subject fully separated from background with crisp edges. No cast shadow. No letters except the abstract N-shaped starship silhouette.
```

小飞船位图生成遇到网络错误，因此成品使用 `src/components/ShipSprite.tsx` 中的项目原生 SVG 精灵。它支持巡航喷焰、悬浮、移动与受损状态，并可直接替换为后续正式图片。

## v0.2.0 战斗素材

`src/assets/battle/battle_backdrop.png` 和 `enemy_raider.png` 均由内置 imagegen 工具生成。敌舰使用纯绿色抠像源图，并通过技能自带工具转换为透明 PNG；最终文件包含有效 Alpha 通道、四角完全透明。

战斗背景提示词：

```text
Use case: stylized-concept
Asset type: seamless-feeling battle background for a side-scrolling 2D anime sci-fi shooter inside a compact desktop game window
Primary request: a deep-space combat corridor near a damaged orbital shipyard, designed as a layered parallax backdrop with no foreground ships
Scene/backdrop: dark navy star field, subtle blue-violet nebula, distant broken station rings and sparse wreckage silhouettes, thin cyan navigation beacons, restrained orange emergency lights
Style/medium: premium 2D anime sci-fi game background, painted environment concept art with crisp hard-surface silhouettes
Composition/framing: very wide horizontal side view, clear central flight lane, visual detail concentrated at far upper and lower edges, generous unobstructed space for gameplay
Lighting/mood: cold cyan rim light, tense but readable, high contrast only around distant structures
Color palette: deep navy, black-blue, cyan, restrained violet and orange
Constraints: no spaceships, no characters, no enemies, no projectiles, no UI, no text, no logos, no watermark; readable under HUD overlays; no central focal object
Avoid: photorealistic military scene, horror, excessive debris, bright white nebula, clutter, motion blur, planets filling the frame
```

敌舰提示词：

```text
Use case: stylized-concept
Asset type: enemy spaceship sprite for a side-scrolling 2D anime sci-fi shooter
Primary request: one hostile orbital raider drone, angular predatory silhouette, dark gunmetal and crimson armor, compact twin cannons, small orange engine vents
Subject: a single unmanned enemy spacecraft only, side profile pointing left, clean hard-surface silhouette, readable at about 90 pixels wide
Style/medium: polished 2D anime game sprite illustration, crisp cel-shaded mechanical surfaces
Composition/framing: centered, generous padding, entire craft visible, perfectly horizontal side view
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal
Lighting/mood: cool blue rim light with restrained red warning glow
Constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; crisp edges; no use of #00ff00 anywhere in the ship; no cast shadow; no text, logo, watermark, projectiles, exhaust smoke, or extra objects
Avoid: organic creature, photorealism, excessive tiny detail, motion blur, cropped wings, green lights, transparent glass
```

## v0.3.0 新增素材

本版本使用内置 imagegen 工具生成以下项目素材，并复制进工程目录：

- `src/assets/ship/player_ship_v2.png`：重绘我方飞船，绿幕源图经 `remove_chroma_key.py` 转为透明 PNG。
- `src/assets/pilot/lumi_happy.png`：新增活泼少女驾驶员 Lumi。
- `src/assets/battle/warp_backdrop.png`：跃迁通道背景。
- `src/assets/battle/enemy_elite.png`：精英敌舰，绿幕源图经本地抠像。
- `src/assets/battle/enemy_boss.png`：BOSS 敌舰，绿幕源图经本地抠像。

透明素材校验结果：三张精灵 PNG 均包含 Alpha 通道，四角透明，Alpha 范围为 0–255。

新增素材提示词概要：

```text
Player ship: sleek heroic compact starfighter, left-to-right side view, bright cyan-white hull, holographic blue engine fins, flat #00ff00 chroma-key background.
Lumi portrait: lively cheerful young anime starship mechanic/pilot girl, orange-pink hair, futuristic headset, cyan holographic trim, no text.
Elite enemy: angular elite interceptor, dark graphite armor, violet-red energy veins, facing left, flat #00ff00 chroma-key background.
Boss enemy: massive command dreadnought, obsidian armor, red-violet reactor core, multiple weapon pods, facing left, flat #00ff00 chroma-key background.
Warp backdrop: deep space hyperspace tunnel, cyan and violet light streaks, holographic grid refraction, no foreground ships.
```

## v0.3.1 跃迁特效叠加素材

本版本继续使用内置 imagegen 工具生成 `src/assets/battle/warp_overlay.png`，作为跃迁场景的 screen 混合叠加图。它与 CSS 深度粒子、冲击波、相位带和飞船跃迁光环共同组成新的跃迁特效。

最终提示词：

```text
Use case: stylized-concept
Asset type: game warp effect overlay texture
Primary request: a high-energy hyperspace / warp-jump visual overlay for a compact sci-fi anime desktop game.
Scene/backdrop: deep transparent-feeling space tunnel, luminous cyan and violet concentric shock rings, radial speed streaks from a central vanishing point, subtle holographic refraction arcs.
Subject: abstract warp energy only; no ships, no characters, no UI.
Style/medium: polished 2D sci-fi game VFX texture, high contrast edges with dark negative space so it can be blended with CSS screen/lighten.
Composition/framing: 16:9 landscape, central vanishing point slightly right of center, readable as an overlay behind a small player ship.
Lighting/mood: intense but clean, cyan-blue with violet accents, energetic jump initiation.
Constraints: no text, no watermark, no logos, no spacecraft, no planets, no foreground objects.
```

## v0.3.8 战斗 VFX 与多级导弹素材

本版本继续使用内置 imagegen 工具生成战斗用位图素材，并在本地转为透明 PNG：

- `src/assets/battle/vfx/missile_common.png`：低阶导弹外形。
- `src/assets/battle/vfx/missile_rare.png`：中高阶导弹外形。
- `src/assets/battle/vfx/missile_epic.png`：高阶/外星遗物导弹外形。
- `src/assets/battle/vfx/explosion_vfx.png`：爆炸特效，战斗内按生命期自动淡出并移除。
- `src/assets/battle/vfx/shield_vfx.png`：护盾叠加特效，按护盾等级改变尺寸和亮度。

新增素材提示词概要：

```text
Missile sprites: side-view sci-fi missile variants, flat chroma-key background, progressively more advanced shapes, cyan/orange/violet engine glow.
Explosion VFX: compact anime sci-fi energy explosion, transparent-ready chroma-key source, orange plasma core and cyan shock edge.
Shield VFX: circular holographic energy shield, cyan-violet layered rings, transparent-ready chroma-key source.
```
