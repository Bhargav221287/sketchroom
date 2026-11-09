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

const getServerUrl = (): string => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (typeof window !== "undefined") {
    // In dev / preview on port 5173 or 4173, point to backend port 3001
    if (window.location.port === "5173" || window.location.port === "4173") {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    const saved = localStorage.getItem("sketchroom_server_url");
    if (saved) return saved;

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3001";
    }
    return window.location.origin;
  }
  return "http://localhost:3001";
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  status: "disconnected",

  connect: () => {
    let currentSocket = get().socket;
    if (currentSocket && currentSocket.connected) {
      return currentSocket;
    }

    set({ status: "connecting" });

    currentSocket = io(getServerUrl(), {
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

