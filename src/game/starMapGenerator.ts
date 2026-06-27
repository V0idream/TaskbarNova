import type { StarEdge, StarMap, StarNode, StarNodeType } from './types';

const names: Record<StarNodeType, string[]> = {
  start: ['星港信标'], battle: ['警戒空域', '掠夺者航道', '失控防线'], salvage: ['漂流残骸', '废弃货舱', '断裂船坞'],
  supply: ['远星补给站', '静默维修港'], anomaly: ['引力涟漪', '幽灵信号'], story: ['记忆回波', '旧日航标'],
  station: ['废弃维修站 B-17', '静默环形船坞'], boss: ['深空封锁线', '重力井哨戒群']
};
const weighted: StarNodeType[] = ['battle','battle','battle','salvage','salvage','supply','anomaly','story'];
const pick = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)];

export function generateStarMap(sector = 1): StarMap {
  const columnCounts = [1, 3, 3, 3, 1];
  const nodes: StarNode[] = [];
  const columns: StarNode[][] = [];
  let anomalyCount = 0;

  columnCounts.forEach((count, column) => {
    const col: StarNode[] = [];
    for (let row = 0; row < count; row++) {
      const terminalPool: StarNodeType[] = sector % 3 === 0 ? ['boss','boss','station','anomaly'] : ['boss','station','supply','anomaly','story'];
      let type: StarNodeType = column === 0 ? 'start' : column === 4 ? pick(terminalPool) : (column === 3 && row === 1 ? 'boss' : column === 2 && row === 0 ? 'supply' : pick(weighted));
      if (type === 'anomaly' && anomalyCount >= 2) type = 'salvage';
      if (type === 'anomaly') anomalyCount++;
      const node: StarNode = {
        id: `s${sector}-c${column}-r${row}`,
        type,
        name: pick(names[type]),
        x: 7 + column * 22,
        y: count === 1 ? 50 : 18 + row * (64 / (count - 1)),
        danger: column === 0 ? 0 : Math.min(14, Math.max(1, column + Math.floor(Math.random() * 2) + Math.floor((sector - 1) * 1.15))),
        rewardLevel: column === 0 ? 0 : Math.min(5, column + 1 + Math.floor(sector / 3)),
        visited: column === 0,
        revealed: true
      };
      nodes.push(node); col.push(node);
    }
    columns.push(col);
  });

  const edges: StarEdge[] = [];
  for (let c = 0; c < columns.length - 1; c++) {
    const fromCol = columns[c]; const toCol = columns[c + 1];
    fromCol.forEach((from, i) => {
      const primary = toCol[Math.min(toCol.length - 1, Math.round(i * (toCol.length - 1) / Math.max(1, fromCol.length - 1)))];
      edges.push(makeEdge(from, primary));
      if (toCol.length > 1 && Math.random() > 0.35) {
        const alternate = toCol[(toCol.indexOf(primary) + 1) % toCol.length];
        if (!edges.some(e => e.from === from.id && e.to === alternate.id)) edges.push(makeEdge(from, alternate));
      }
    });
    toCol.forEach(to => {
      if (!edges.some(e => e.to === to.id)) edges.push(makeEdge(pick(fromCol), to));
    });
  }
  return { nodes, edges };
}

function makeEdge(from: StarNode, to: StarNode): StarEdge {
  const distance = Math.round(Math.hypot(to.x - from.x, to.y - from.y));
  return { from: from.id, to: to.id, distance, fuelCost: Math.max(5, Math.round(distance / 3.6)) };
}
