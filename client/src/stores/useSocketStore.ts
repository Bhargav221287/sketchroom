import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@sketchroom/shared";

export type SocketStatus = "connected" | "connecting" | "reconnecting" | "disconnected";

interface SocketState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  status: SocketStatus;
  connect: () => Socket<ServerToClientEvents, ClientToServerEvents>;
  disconnect: () => void;
}

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? window.location.origin
    : "http://localhost:3001");

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  status: "disconnected",

  connect: () => {
    let currentSocket = get().socket;
    if (currentSocket && currentSocket.connected) {
      return currentSocket;
    }

    set({ status: "connecting" });

    currentSocket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    currentSocket.on("connect", () => {
      set({ status: "connected" });
    });

    currentSocket.on("connect_error", () => {
      set({ status: "reconnecting" });
    });

    currentSocket.on("disconnect", () => {
      set({ status: "disconnected" });
    });

    set({ socket: currentSocket });
    return currentSocket;
  },

  disconnect: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null, status: "disconnected" });
    }
  },
}));
