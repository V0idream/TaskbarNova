import dialogues from '../data/dialogues.json';
import type { DialogueLine, DialogueTrigger, PilotId, PilotMood } from './types';

const lines = dialogues as DialogueLine[];

export function dialogueFor(trigger: DialogueTrigger, pilotId: PilotId = 'nova'): { text: string; mood: PilotMood } {
  const choices = lines.filter(line => line.trigger === trigger && (!line.pilotId || line.pilotId === pilotId));
  const pool = choices.length ? choices : lines.filter(line => line.trigger === trigger);
  const weighted = pool.flatMap(line => Array.from({ length: Math.max(1, line.weight ?? 1) }, () => line));
  const line = weighted[Math.floor(Math.random() * Math.max(1, weighted.length))];
  return line ? { text: line.text, mood: line.mood ?? 'neutral' } : { text: '系统状态稳定。', mood: 'neutral' };
}
