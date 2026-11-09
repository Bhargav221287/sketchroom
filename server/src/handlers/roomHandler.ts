import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  MAX_PLAYERS_PER_ROOM,
  Player,
  sanitizeNickname,
  serializeAvatar,
  ServerToClientEvents,
  SocketData,
} from "@sketchroom/shared";
import { roomManager } from "../room/RoomManager.js";
import crypto from "crypto";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerRoomHandlers(io: TypedServer, socket: TypedSocket) {
  // Create Room
  socket.on("room:create", ({ nickname, avatar, settings }, callback) => {
    try {
      const cleanNickname = sanitizeNickname(nickname);
      const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const sessionToken = crypto.randomUUID();

      const hostPlayer: Player = {
        id: playerId,
        nickname: cleanNickname,
        avatar,
        avatarString: serializeAvatar(avatar),
        score: 0,
        roundScore: 0,
        isHost: true,
        isReady: true,
        hasGuessed: false,
        isDisconnected: false,
      };

      const room = roomManager.createRoom(hostPlayer, socket, sessionToken, io);
      if (settings) {
        room.updateSettings(settings);
      }

      callback({
        success: true,
        roomCode: room.roomCode,
        sessionToken,
      });
    } catch (err: any) {
      callback({
        success: false,
        error: err.message || "Failed to create room",
      });
    }
  });

  // Join Room
  socket.on("room:join", ({ roomCode, nickname, avatar, sessionToken }, callback) => {
    try {
      const code = roomCode.toUpperCase().trim();
      const room = roomManager.getRoom(code);

      if (!room) {
        callback({ success: false, error: "Room not found. Please check your room code." });
        return;
      }

      // Check for reconnection attempt with existing sessionToken
      if (sessionToken && room.reconnectPlayer(sessionToken, socket)) {
        callback({
          success: true,
          roomCode: code,
          playerId: socket.data.playerId,
          sessionToken,
        });
        return;
      }

      // Check player limit
      if (room.getPlayerCount() >= MAX_PLAYERS_PER_ROOM) {
        callback({ success: false, error: "Room is currently full (maximum 10 players)." });
        return;
      }

      const cleanNickname = sanitizeNickname(nickname);
      const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newSessionToken = crypto.randomUUID();

      const player: Player = {
        id: playerId,
        nickname: cleanNickname,
        avatar,
        avatarString: serializeAvatar(avatar),
        score: 0,
        roundScore: 0,
        isHost: room.getPlayerCount() === 0,
        isReady: false,
        hasGuessed: false,
        isDisconnected: false,
      };

      room.addPlayer(player, socket, newSessionToken);

      callback({
        success: true,
        roomCode: code,
        playerId,
        sessionToken: newSessionToken,
      });
    } catch (err: any) {
      callback({ success: false, error: err.message || "Failed to join room" });
    }
  });

  // Leave Room
  socket.on("room:leave", () => {
    const { roomCode, playerId } = socket.data;
    if (roomCode && playerId) {
      const room = roomManager.getRoom(roomCode);
      if (room) {
        room.removePlayer(playerId);
      }
    }
  });

  // Kick Player (Host only)
  socket.on("room:kick", ({ targetPlayerId }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;

    room.removePlayer(targetPlayerId);
  });

  // Update Settings (Host only)
  socket.on("room:update_settings", ({ settings }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;

    room.updateSettings(settings);
  });

  // Toggle Ready
  socket.on("room:set_ready", ({ ready }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = roomManager.getRoom(roomCode);
    if (room) {
      room.setReady(playerId, ready);
    }
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    const { roomCode, playerId } = socket.data;
    if (roomCode && playerId) {
      const room = roomManager.getRoom(roomCode);
      if (room) {
        room.handleDisconnect(playerId);
      }
    }
  });
}
