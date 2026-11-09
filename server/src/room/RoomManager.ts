import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  Player,
  ROOM_CODE_LENGTH,
  ROOM_INACTIVITY_TIMEOUT_MS,
  ServerToClientEvents,
  SocketData,
} from "@sketchroom/shared";
import { Room } from "./Room.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Periodic sweep for abandoned or inactive rooms (10 mins)
    this.cleanupInterval = setInterval(() => {
      this.sweepInactiveRooms();
    }, 60 * 1000);
  }

  public generateRoomCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    return code;
  }

  public createRoom(
    hostPlayer: Player,
    hostSocket: TypedSocket,
    sessionToken: string,
    io: TypedServer
  ): Room {
    const roomCode = this.generateRoomCode();
    const room = new Room(roomCode, hostPlayer, hostSocket, sessionToken, io);
    this.rooms.set(roomCode, room);
    return room;
  }

  public getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  public removeRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.cleanup();
      this.rooms.delete(roomCode);
    }
  }

  public sweepInactiveRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const isDead =
        (room.getPlayerCount() === 0 && now - room.lastActiveAt > 60 * 1000) ||
        now - room.lastActiveAt > ROOM_INACTIVITY_TIMEOUT_MS;

      if (isDead) {
        room.cleanup();
        this.rooms.delete(code);
      }
    }
  }

  public getStats() {
    let totalPlayers = 0;
    for (const room of this.rooms.values()) {
      totalPlayers += room.getPlayerCount();
    }
    return {
      roomsCount: this.rooms.size,
      activePlayersCount: totalPlayers,
    };
  }
}

export const roomManager = new RoomManager();

