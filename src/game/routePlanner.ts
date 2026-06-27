import type { StarMap } from './types';

export function findDirectedPath(map: StarMap, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];
  const queue: string[][] = [[fromId]];
  const visited = new Set([fromId]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const edge of map.edges.filter(candidate => candidate.from === last)) {
      if (visited.has(edge.to)) continue;
      const next = [...path, edge.to];
      if (edge.to === toId) return next;
      visited.add(edge.to);
      queue.push(next);
    }
  }
  return null;
}

export function travelDurationMs(distance: number, shipSpeed: number) {
  const speedFactor = Math.max(0.55, Math.min(1.35, 8 / Math.max(1, shipSpeed)));
  return Math.round(Math.max(45_000, Math.min(120_000, distance * 3_200 * speedFactor)));
}
