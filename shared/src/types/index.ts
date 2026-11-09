export type AvatarFaceShape = "round" | "square" | "oval" | "blob";
export type AvatarEyes = "dots" | "happy" | "winking" | "cool" | "sleepy" | "star";
export type AvatarMouth = "smile" | "grin" | "tongue" | "open" | "neutral";
export type AvatarAccessory = "none" | "glasses" | "sunglasses" | "hat" | "crown" | "headband" | "mustache";

export interface AvatarConfig {
  faceShape: AvatarFaceShape;
  faceColor: string;
  eyes: AvatarEyes;
  mouth: AvatarMouth;
  accessory: AvatarAccessory;
  bgColor: string;
}

export type PlayerAnimationState = "idle" | "drawing" | "correct" | "disconnected";

export interface Player {
  id: string;
  nickname: string;
  avatar: AvatarConfig;
  avatarString: string;
  score: number;
  roundScore: number;
  isHost: boolean;
  isReady: boolean;
  hasGuessed: boolean;
  isDisconnected: boolean;
  disconnectedAt?: number;
}

export interface RoomSettings {
  rounds: number;
  drawTimeSeconds: number;
  categories: string[];
  customWords: string[];
}

export type GamePhase = "LOBBY" | "WORD_CHOICE" | "DRAWING" | "TURN_SUMMARY" | "GAME_END";

export interface NormalizedPoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
  pressure?: number;
}

export type DrawTool = "brush" | "eraser" | "fill" | "line" | "rectangle" | "circle";

export interface StrokeOp {
  type: "stroke";
  id: string;
  tool: "brush" | "eraser";
  color: string;
  size: number; // Normalized stroke thickness (approx 1 to 40 px base)
  opacity: number;
  points: NormalizedPoint[];
}

export interface ShapeOp {
  type: "shape";
  id: string;
  shape: "line" | "rectangle" | "circle";
  color: string;
  size: number;
  opacity: number;
  start: NormalizedPoint;
  end: NormalizedPoint;
}

export interface FillOp {
  type: "fill";
  id: string;
  x: number; // 0 to 1
  y: number; // 0 to 1
  color: string;
}

export interface ClearOp {
  type: "clear";
  id: string;
}

export type CanvasOp = StrokeOp | ShapeOp | FillOp | ClearOp;

export type ChatMessageType = "normal" | "system" | "correct" | "close" | "guesser";

export interface ChatMessage {
  id: string;
  playerId?: string;
  playerName: string;
  text: string;
  timestamp: number;
  type: ChatMessageType;
}

export interface TurnSummaryData {
  word: string;
  scores: Array<{
    playerId: string;
    playerName: string;
    scoreGain: number;
    totalScore: number;
  }>;
  snapshotPng?: string;
}

export interface TurnSnapshot {
  round: number;
  turn: number;
  word: string;
  drawerId: string;
  drawerName: string;
  dataUrl: string;
}

export interface PodiumPlayer {
  rank: number;
  player: Player;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  currentTurn: number;
  currentDrawerId: string | null;
  wordLength?: number;
  wordHint?: string;
  revealedIndices?: number[];
  timeLeftSeconds?: number;
  totalTimeSeconds?: number;
}
