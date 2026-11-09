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

export function registerDrawHandlers(io: TypedServer, socket: TypedSocket) {
  // Stroke / Shape / Fill Operation
  socket.on("draw:op", ({ op }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId || room.phase !== "DRAWING") return;

    room.opLog.addOp(op);
    // Broadcast to everyone else in the room
    socket.to(roomCode).emit("draw:op", { op });
  });

  // Undo
  socket.on("draw:undo", () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId || room.phase !== "DRAWING") return;

    const undone = room.opLog.undo();
    if (undone) {
      room.broadcast("draw:undo", { opId: (undone as any).id });
    }
  });

  // Redo
  socket.on("draw:redo", () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId || room.phase !== "DRAWING") return;

    const redone = room.opLog.redo();
    if (redone) {
      room.broadcast("draw:redo", { op: redone });
    }
  });

  // Clear Canvas
  socket.on("draw:clear", () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId || room.phase !== "DRAWING") return;

    room.opLog.clear();
    room.broadcast("draw:clear");
  });

  // Live Drawer Pointer / Cursor Position
  socket.on("draw:cursor_move", ({ x, y }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.currentDrawerId !== playerId || room.phase !== "DRAWING") return;

    // Send to other players (spectators) only
    socket.to(roomCode).emit("draw:remote_cursor", { x, y, drawerId: playerId });
  });
}

