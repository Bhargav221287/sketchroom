import { create } from "zustand";
import {
  AvatarConfig,
  CanvasOp,
  ChatMessage,
  PodiumPlayer,
  RoomSettings,
  RoomState,
  TurnSnapshot,
  TurnSummaryData,
} from "@sketchroom/shared";
import { useSocketStore } from "./useSocketStore.js";
import { sound } from "../services/sound.js";
import confetti from "canvas-confetti";
import { toast } from "../design/components/Toast.js";

interface ActiveReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  playerName: string;
}

interface RoomStoreState {
  roomState: RoomState | null;
  myPlayerId: string;
  sessionToken: string;
  myNickname: string;
  myAvatar: AvatarConfig | null;

  // Realtime game data
  secretWord?: string; // For drawer only
  wordOptions: [string, string, string] | null;
  drawerChoosingName: string | null;
  turnSummary: TurnSummaryData | null;
  podiumData: { podium: PodiumPlayer[]; snapshots: TurnSnapshot[] } | null;

  // Realtime canvas data
  canvasOps: CanvasOp[];
  remoteCursor: { x: number; y: number; drawerId: string } | null;

  // Chat & Reactions
  chatMessages: ChatMessage[];
  activeReactions: ActiveReaction[];
  closeGuessAlert: string | null;

  // Actions
  initListeners: () => void;
  createRoom: (nickname: string, avatar: AvatarConfig, settings?: Partial<RoomSettings>) => Promise<string>;
  joinRoom: (roomCode: string, nickname: string, avatar: AvatarConfig) => Promise<boolean>;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  kickPlayer: (playerId: string) => void;
  addBot: () => void;
  removeBot: () => void;
  startGame: () => void;
  chooseWord: (index: number) => void;
  playAgain: () => void;
  sendOp: (op: CanvasOp) => void;
  sendUndo: () => void;
  sendRedo: () => void;
  sendClear: () => void;
  sendCursorMove: (x: number, y: number) => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  sendTurnSnapshot: (dataUrl: string) => void;
  clearCloseGuessAlert: () => void;
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  roomState: null,
  myPlayerId: localStorage.getItem("sketchroom_player_id") || "",
  sessionToken: localStorage.getItem("sketchroom_session_token") || "",
  myNickname: localStorage.getItem("sketchroom_nickname") || "Doodler",
  myAvatar: null,

  secretWord: undefined,
  wordOptions: null,
  drawerChoosingName: null,
  turnSummary: null,
  podiumData: null,

  canvasOps: [],
  remoteCursor: null,

  chatMessages: [],
  activeReactions: [],
  closeGuessAlert: null,

  initListeners: () => {
    const socket = useSocketStore.getState().connect();

    socket.off("room:state");
    socket.off("room:error");
    socket.off("player:joined");
    socket.off("player:left");
    socket.off("game:word_options");
    socket.off("game:drawer_choosing");
    socket.off("game:turn_start");
    socket.off("game:hint_reveal");
    socket.off("game:timer_tick");
    socket.off("game:turn_end");
    socket.off("game:game_over");
    socket.off("draw:op");
    socket.off("draw:history_replay");
    socket.off("draw:remote_cursor");
    socket.off("draw:undo");
    socket.off("draw:redo");
    socket.off("draw:clear");
    socket.off("chat:message");
    socket.off("chat:correct_guess");
    socket.off("chat:close_guess");
    socket.off("reaction:broadcast");

    socket.on("room:state", (state) => {
      set({ roomState: state });

      // Self-heal: ensure myPlayerId matches a valid player in the room
      const currentId = get().myPlayerId;
      const playerExists = state.players.some((p) => p.id === currentId);
      if (!playerExists && state.players.length > 0) {
        // Try matching by nickname
        const nickMatch = state.players.find((p) => p.nickname === get().myNickname);
        if (nickMatch) {
          localStorage.setItem("sketchroom_player_id", nickMatch.id);
          set({ myPlayerId: nickMatch.id });
        } else if (state.players.length === 1) {
          // If solo player, this must be my player
          const solo = state.players[0];
          localStorage.setItem("sketchroom_player_id", solo.id);
          set({ myPlayerId: solo.id });
        }
      }

      if (state.phase === "LOBBY") {
        set({
          secretWord: undefined,
          wordOptions: null,
          drawerChoosingName: null,
          turnSummary: null,
          podiumData: null,
          canvasOps: [],
        });
      }
    });

    socket.on("room:error", ({ code, message }) => {
      toast.error(message);
    });

    socket.on("player:joined", (player) => {
      sound.playPop();
    });

    socket.on("game:word_options", ({ words }) => {
      set({ wordOptions: words, drawerChoosingName: null, turnSummary: null });
    });

    socket.on("game:drawer_choosing", ({ drawerName }) => {
      set({ drawerChoosingName: drawerName, wordOptions: null, turnSummary: null });
    });

    socket.on("game:turn_start", (payload) => {
      set({
        secretWord: payload.secretWord,
        wordOptions: null,
        drawerChoosingName: null,
        turnSummary: null,
        canvasOps: [],
      });
    });

    socket.on("game:hint_reveal", ({ wordHint, revealedIndices }) => {
      const current = get().roomState;
      if (current) {
        set({
          roomState: {
            ...current,
            wordHint,
            revealedIndices,
          },
        });
      }
    });

    socket.on("game:timer_tick", ({ timeLeftSeconds }) => {
      const current = get().roomState;
      if (current) {
        set({ roomState: { ...current, timeLeftSeconds } });
      }
      if (timeLeftSeconds <= 10 && timeLeftSeconds > 0) {
        sound.playTick();
      }
    });

    socket.on("game:turn_end", (summary) => {
      set({ turnSummary: summary, secretWord: summary.word });
    });

    socket.on("game:game_over", (data) => {
      set({ podiumData: data, turnSummary: null });
      sound.playFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    });

    socket.on("draw:op", ({ op }) => {
      set((state) => ({ canvasOps: [...state.canvasOps, op] }));
    });

    socket.on("draw:history_replay", ({ ops }) => {
      set({ canvasOps: ops });
    });

    socket.on("draw:remote_cursor", (cursor) => {
      set({ remoteCursor: cursor });
    });

    socket.on("draw:undo", () => {
      set((state) => ({ canvasOps: state.canvasOps.slice(0, -1) }));
    });

    socket.on("draw:redo", ({ op }) => {
      set((state) => ({ canvasOps: [...state.canvasOps, op] }));
    });

    socket.on("draw:clear", () => {
      set((state) => ({
        canvasOps: [...state.canvasOps, { type: "clear", id: `clear-${Date.now()}` }],
      }));
    });

    socket.on("chat:message", (msg) => {
      set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
    });

    socket.on("chat:correct_guess", ({ playerId, playerName, pointsAwarded }) => {
      const isMe = playerId === get().myPlayerId;
      if (isMe) {
        sound.playCorrect();
        sound.triggerHaptic("success");
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
        toast.success(`You guessed the word! +${pointsAwarded} points!`);
      } else {
        toast.info(`${playerName} guessed the word!`);
      }
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          {
            id: `cg-${Date.now()}-${Math.random()}`,
            playerId,
            playerName,
            text: `guessed the word! (+${pointsAwarded} pts)`,
            timestamp: Date.now(),
            type: "correct",
          },
        ],
      }));
    });

    socket.on("chat:close_guess", ({ message }) => {
      sound.triggerHaptic("warning");
      set({ closeGuessAlert: message });
      toast.warning(message);
      setTimeout(() => {
        if (get().closeGuessAlert === message) {
          set({ closeGuessAlert: null });
        }
      }, 3500);
    });

    socket.on("reaction:broadcast", (reaction) => {
      set((state) => ({
        activeReactions: [...state.activeReactions, reaction],
      }));
      // Remove reaction after 2.5 seconds
      setTimeout(() => {
        set((state) => ({
          activeReactions: state.activeReactions.filter((r) => r.id !== reaction.id),
        }));
      }, 2500);
    });
  },

  createRoom: async (nickname, avatar, settings) => {
    const socket = useSocketStore.getState().connect();
    get().initListeners();

    return new Promise((resolve, reject) => {
      socket.emit("room:create", { nickname, avatar, settings }, (res) => {
        if (res.success && res.roomCode && res.sessionToken) {
          localStorage.setItem("sketchroom_session_token", res.sessionToken);
          localStorage.setItem("sketchroom_nickname", nickname);
          if (res.playerId) {
            localStorage.setItem("sketchroom_player_id", res.playerId);
            set({ myPlayerId: res.playerId });
          }
          set({
            sessionToken: res.sessionToken,
            myNickname: nickname,
            myAvatar: avatar,
          });
          resolve(res.roomCode);
        } else {
          reject(new Error(res.error || "Failed to create room"));
        }
      });
    });
  },

  joinRoom: async (roomCode, nickname, avatar) => {
    const socket = useSocketStore.getState().connect();
    get().initListeners();
    const sessionToken = get().sessionToken;

    return new Promise((resolve, reject) => {
      socket.emit("room:join", { roomCode, nickname, avatar, sessionToken }, (res) => {
        if (res.success && res.roomCode) {
          if (res.sessionToken) {
            localStorage.setItem("sketchroom_session_token", res.sessionToken);
            set({ sessionToken: res.sessionToken });
          }
          if (res.playerId) {
            localStorage.setItem("sketchroom_player_id", res.playerId);
            set({ myPlayerId: res.playerId });
          }
          localStorage.setItem("sketchroom_nickname", nickname);
          set({ myNickname: nickname, myAvatar: avatar });
          resolve(true);
        } else {
          reject(new Error(res.error || "Failed to join room"));
        }
      });
    });
  },

  leaveRoom: () => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("room:leave");
    }
    set({ roomState: null, canvasOps: [], chatMessages: [] });
  },

  setReady: (ready) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("room:set_ready", { ready });
    }
  },

  updateSettings: (settings) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("room:update_settings", { settings });
    }
  },

  kickPlayer: (targetPlayerId) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("room:kick", { targetPlayerId });
    }
  },

  addBot: () => {
    const socket = useSocketStore.getState().connect();
    if (socket) {
      socket.emit("room:add_bot");
    }
  },

  removeBot: () => {
    const socket = useSocketStore.getState().connect();
    if (socket) {
      socket.emit("room:remove_bot");
    }
  },

  startGame: () => {
    const socket = useSocketStore.getState().connect();
    if (socket) {
      socket.emit("game:start");
    }
  },

  chooseWord: (wordIndex) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("game:choose_word", { wordIndex });
    }
  },

  playAgain: () => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("game:play_again");
    }
  },

  sendOp: (op) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      set((state) => ({ canvasOps: [...state.canvasOps, op] }));
      socket.emit("draw:op", { op });
    }
  },

  sendUndo: () => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      set((state) => ({ canvasOps: state.canvasOps.slice(0, -1) }));
      socket.emit("draw:undo");
    }
  },

  sendRedo: () => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("draw:redo");
    }
  },

  sendClear: () => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      set((state) => ({
        canvasOps: [...state.canvasOps, { type: "clear", id: `clear-${Date.now()}` }],
      }));
      socket.emit("draw:clear");
    }
  },

  sendCursorMove: (x, y) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("draw:cursor_move", { x, y });
    }
  },

  sendChat: (text) => {
    const socket = useSocketStore.getState().socket;
    if (socket && text.trim()) {
      socket.emit("chat:send", { text: text.trim() });
    }
  },

  sendReaction: (emoji) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("reaction:send", { emoji });
    }
  },

  sendTurnSnapshot: (dataUrl) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit("turn:snapshot", { dataUrl });
    }
  },

  clearCloseGuessAlert: () => {
    set({ closeGuessAlert: null });
  },
}));

