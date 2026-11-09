import {
  AvatarConfig,
  CanvasOp,
  ChatMessage,
  GamePhase,
  Player,
  PodiumPlayer,
  RoomSettings,
  RoomState,
  TurnSnapshot,
  TurnSummaryData,
} from "./types/index.js";

export interface ClientToServerEvents {
  "room:create": (
    payload: {
      nickname: string;
      avatar: AvatarConfig;
      settings?: Partial<RoomSettings>;
    },
    callback: (response: {
      success: boolean;
      roomCode?: string;
      playerId?: string;
      sessionToken?: string;
      roomState?: RoomState;
      error?: string;
    }) => void
  ) => void;

  "room:join": (
    payload: {
      roomCode: string;
      nickname: string;
      avatar: AvatarConfig;
      sessionToken?: string;
    },
    callback: (response: {
      success: boolean;
      roomCode?: string;
      playerId?: string;
      sessionToken?: string;
      roomState?: RoomState;
      error?: string;
    }) => void
  ) => void;

  "room:leave": () => void;

  "room:kick": (payload: { targetPlayerId: string }) => void;

  "room:add_bot": () => void;

  "room:remove_bot": () => void;

  "room:update_settings": (payload: { settings: Partial<RoomSettings> }) => void;

  "room:set_ready": (payload: { ready: boolean }) => void;

  "game:start": () => void;

  "game:play_again": () => void;

  "game:choose_word": (payload: { wordIndex: number }) => void;

  "draw:op": (payload: { op: CanvasOp }) => void;

  "draw:undo": () => void;

  "draw:redo": () => void;

  "draw:clear": () => void;

  "draw:cursor_move": (payload: { x: number; y: number }) => void;

  "chat:send": (payload: { text: string }) => void;

  "reaction:send": (payload: { emoji: string }) => void;

  "turn:snapshot": (payload: { dataUrl: string }) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;

  "room:error": (error: { code: string; message: string }) => void;

  "player:joined": (player: Player) => void;

  "player:left": (payload: { playerId: string; newHostId?: string }) => void;

  "player:reconnected": (payload: { playerId: string }) => void;

  "game:phase_change": (payload: { phase: GamePhase; durationMs?: number }) => void;

  "game:word_options": (payload: { words: [string, string, string]; durationSeconds: number }) => void;

  "game:drawer_choosing": (payload: { drawerId: string; drawerName: string; durationSeconds: number }) => void;

  "game:turn_start": (payload: {
    drawerId: string;
    round: number;
    maxRounds: number;
    drawTimeSeconds: number;
    wordLength: number;
    wordHint: string;
    secretWord?: string; // Only provided to the active drawer
  }) => void;

  "game:hint_reveal": (payload: { wordHint: string; revealedIndices: number[] }) => void;

  "game:timer_tick": (payload: { timeLeftSeconds: number }) => void;

  "game:turn_end": (payload: TurnSummaryData) => void;

  "game:game_over": (payload: { podium: PodiumPlayer[]; snapshots: TurnSnapshot[] }) => void;

  "draw:op": (payload: { op: CanvasOp }) => void;

  "draw:history_replay": (payload: { ops: CanvasOp[] }) => void;

  "draw:remote_cursor": (payload: { x: number; y: number; drawerId: string }) => void;

  "draw:undo": (payload: { opId?: string }) => void;

  "draw:redo": (payload: { op: CanvasOp }) => void;

  "draw:clear": () => void;

  "chat:message": (message: ChatMessage) => void;

  "chat:correct_guess": (payload: { playerId: string; playerName: string; pointsAwarded: number }) => void;

  "chat:close_guess": (payload: { message: string }) => void;

  "reaction:broadcast": (payload: { id: string; playerId: string; playerName: string; emoji: string; x: number; y: number }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  roomCode: string;
  nickname: string;
  sessionToken: string;
}

