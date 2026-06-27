export type GameMode = 'start' | 'starMap' | 'travel' | 'battle' | 'defeat' | 'fitting' | 'supply' | 'station' | 'pilot' | 'settings' | 'cockpit';
export type StarNodeType = 'start' | 'battle' | 'salvage' | 'supply' | 'anomaly' | 'story' | 'station' | 'boss';
export type PartSlot = 'weapon' | 'engine' | 'shield' | 'radar' | 'core';
export type EquipmentSlot = 'weapon1' | 'weapon2' | 'engine' | 'shield' | 'radar' | 'core';
export type PartRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'anomaly';
export type PilotMood = 'neutral' | 'happy' | 'worried' | 'excited' | 'tired' | 'serious';
export type DialogueTrigger = 'boot' | 'route_planned' | 'low_fuel' | 'low_hull' | 'battle_win' | 'battle_lose' | 'part_found' | 'rare_part_found' | 'station_enter' | 'station_clear' | 'supply_enter' | 'memory_found' | 'idle' | 'click';
export type PilotId = 'nova' | 'lumi';
export type CombatStyle = 'frontal' | 'flanking';
export type TacticalPreference = 'assault' | 'guard' | 'balanced';
export type NavigationStyle = 'combat' | 'avoid' | 'balanced';

export interface PlayerResources { credits: number; alloy: number; memoryFragments: number }
export interface ShipStats { maxHull: number; maxShield: number; maxFuel: number; maxEnergy: number; attack: number; defense: number; speed: number; scan: number; cargoMax: number; fuelEfficiency: number }
export interface ShipState extends ShipStats {
  name: string; hull: number; shield: number; fuel: number; cargoUsed: number;
  equipped: Partial<Record<EquipmentSlot, string>>;
}
export interface ShipPart {
  id: string; name: string; slot: PartSlot; rarity: PartRarity; description: string;
  stats: Partial<ShipStats>; tags: string[]; energyCost?: number; visualKey?: string;
}
export interface StarNode { id: string; type: StarNodeType; name: string; x: number; y: number; danger: number; rewardLevel: number; visited: boolean; revealed: boolean }
export interface StarEdge { from: string; to: string; distance: number; fuelCost: number; dangerModifier?: number }
export interface StarMap { nodes: StarNode[]; edges: StarEdge[] }
export interface Enemy { id: string; name: string; hp: number; attack: number; defense: number; rewardCredits: number; lootTable: string[] }
export type StationRoomType = 'entrance' | 'storage' | 'engineering' | 'control' | 'combat' | 'memory' | 'core' | 'exit';
export interface StationRoom { id: string; type: StationRoomType; name: string; description: string; connectedRoomIds: string[]; visited: boolean; cleared: boolean; x: number; y: number }
export interface DialogueLine { id: string; trigger: DialogueTrigger; text: string; mood?: PilotMood; pilotId?: PilotId; minSyncLevel?: number; weight?: number }
export interface PilotState { id: PilotId; name: string; syncLevel: number; syncExp: number; mood: PilotMood; skillName: string; skillDescription: string }
export interface TacticalComputer { style: CombatStyle; preference: TacticalPreference }
export interface Settings {
  alwaysOnTop: boolean;
  opacity: number;
  dialogueFrequency: 'low' | 'normal' | 'high';
  reduceMotion: boolean;
  doNotDisturb: boolean;
  battleScale: 1 | 2;
  battleView: 'side' | 'cockpit';
  navigationStyle: NavigationStyle;
  defaultTravelScale: 1 | 4 | 12;
  defaultBattleScale: 1 | 2;
}
export interface TravelLeg { fromId: string; toId: string; durationMs: number; elapsedMs: number }
export interface BattleEncounter { enemy: Enemy; danger: number; nodeId: string; returnMode: 'travel' | 'station' }
export interface LootNotice { partId: string; name: string; rarity: PartRarity; text: string; createdAt: number }
export interface EventChoiceOption { id: string; label: string; description: string; disabledReason?: string }
export interface EventChoice { id: string; title: string; text: string; options: EventChoiceOption[] }

export interface GameState {
  version: string; createdAt: number; updatedAt: number; hydrated: boolean;
  mode: GameMode; collapsed: boolean; currentSector: number; currentNodeId: string;
  resources: PlayerResources; ship: ShipState; pilot: PilotState; tacticalComputer: TacticalComputer;
  inventory: string[]; discoveredParts: string[]; starMap: StarMap;
  selectedRoute: string[]; travelQueue: string[]; travelLeg?: TravelLeg; travelTimeScale: 1 | 4 | 12;
  battleEncounter?: BattleEncounter; stationRooms: StationRoom[]; currentRoomId?: string;
  currentDialogue: string; eventLog: string[]; shopPartIds: string[]; settings: Settings; lootNotice?: LootNotice;
  eventChoice?: EventChoice; battleSnapshot?: Partial<GameState>; fittingReturnMode?: 'starMap' | 'travel' | 'battle' | 'cockpit' | 'supply' | 'station';
  cockpitAutoResume: boolean;
  autopilotEnabled: boolean;
}
