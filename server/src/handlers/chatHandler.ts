import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@sketchroom/shared";
import { roomManager } from "../room/RoomManager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Simple per-socket rate limiting
const messageTimestamps = new Map<string, number[]>();

export function registerChatHandlers(io: TypedServer, socket: TypedSocket) {
  socket.on("chat:send", ({ text }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    // Rate limiting: max 5 messages per 2 seconds
    const now = Date.now();
    const timestamps = messageTimestamps.get(playerId) || [];
    const recent = timestamps.filter((t) => now - t < 2000);
    if (recent.length >= 5) {
      socket.emit("chat:message", {
        id: `sys-${now}`,
        playerName: "System",
        text: "Please slow down your guesses/messages!",
        timestamp: now,
        type: "system",
      });
      return;
    }
    recent.push(now);
    messageTimestamps.set(playerId, recent);

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    room.handleGuess(playerId, text);
  });
}
