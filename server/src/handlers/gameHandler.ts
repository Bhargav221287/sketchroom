import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  EMOJI_REACTIONS,
  InterServerEvents,
  MIN_PLAYERS_TO_START,
  ServerToClientEvents,
  SocketData,
} from "@sketchroom/shared";
import { roomManager } from "../room/RoomManager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerGameHandlers(io: TypedServer, socket: TypedSocket) {
  // Start Game
  socket.on("game:start", () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;

    if (room.getPlayerCount() < MIN_PLAYERS_TO_START) {
      socket.emit("room:error", {
        code: "MIN_PLAYERS_REQUIRED",
        message: `At least ${MIN_PLAYERS_TO_START} players are required to start.`,
      });
      return;
    }

    room.startGame();
  });

  // Choose Word (Drawer only)
  socket.on("game:choose_word", ({ wordIndex }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId || room.phase !== "WORD_CHOICE") return;

    room.chooseWord(wordIndex);
  });

  // Play Again (Host only)
  socket.on("game:play_again", () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.hostId !== playerId || room.phase !== "GAME_END") return;

    room.playAgain();
  });

  // Floating Emoji Reaction
  socket.on("reaction:send", ({ emoji }) => {
    const { roomCode, playerId, nickname } = socket.data;
    if (!roomCode || !playerId) return;

    // Validate allowed emojis
    if (!EMOJI_REACTIONS.includes(emoji as any)) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Randomize initial x position across canvas
    const x = 0.2 + Math.random() * 0.6;
    const y = 0.7 + Math.random() * 0.2;

    room.broadcast("reaction:broadcast", {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playerId,
      playerName: nickname || "Player",
      emoji,
      x,
      y,
    });
  });

  // Canvas Snapshot
  socket.on("turn:snapshot", ({ dataUrl }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId) return;

    room.saveTurnSnapshot(dataUrl);
  });
}
