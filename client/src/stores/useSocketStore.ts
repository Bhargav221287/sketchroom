import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@sketchroom/shared";
import { VirtualSocket } from "../services/virtualSocket.js";

export type SocketStatus = "connected" | "connecting" | "reconnecting" | "disconnected";
export type SocketMode = "cloud" | "browser";

interface SocketState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  status: SocketStatus;
  mode: SocketMode;
  serverUrl: string | null;
  connect: () => Socket<ServerToClientEvents, ClientToServerEvents>;
  disconnect: () => void;
  setServerUrl: (url: string) => void;
  useBrowserEngine: () => void;
}

const getTargetServerUrl = (): string | null => {
  if (typeof window !== "undefined") {
    // Check forced browser mode override
    if (localStorage.getItem("sketchroom_mode") === "browser") {
      return null;
    }

    // Check saved custom server override
    const saved = localStorage.getItem("sketchroom_server_url");
    if (saved) return saved;
  }

  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  if (typeof window !== "undefined") {
    // Dev/preview servers on port 5173 or 4173 always connect to backend on port 3001 (works for localhost and LAN IPs)
    if (window.location.port === "5173" || window.location.port === "4173") {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }

    // Check localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3001";
    }

    // On Vercel or cloud static host without explicit server URL, return null so VirtualSocket is used
    return null;
  }
  return "http://localhost:3001";
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  status: "disconnected",
  mode: "browser",
  serverUrl: null,

  connect: () => {
    let currentSocket = get().socket;
    if (currentSocket && get().status !== "disconnected") {
      return currentSocket;
    }

    const targetUrl = getTargetServerUrl();

    // If no remote server URL is configured (e.g. running on Vercel deployment),
    // immediately activate the Instant In-Browser Engine!
    if (!targetUrl) {
      const vSocket = new VirtualSocket();
      set({
        socket: vSocket as any,
        status: "connected",
        mode: "browser",
        serverUrl: null,
      });
      return vSocket as any;
    }

    currentSocket = io(targetUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    set({ socket: currentSocket as any, status: "connecting", serverUrl: targetUrl });

    let fallbackTimeout: any = null;

    // Fallback timer: if remote server is unreachable within 5 seconds,
    // automatically activate the In-Browser Engine so user is never blocked!
    fallbackTimeout = setTimeout(() => {
      if (get().status !== "connected") {
        console.warn(`[SocketStore] Remote server ${targetUrl} did not connect in time. Activating In-Browser Engine.`);
        try {
          currentSocket?.disconnect();
        } catch {}
        const vSocket = new VirtualSocket();
        set({
          socket: vSocket as any,
          status: "connected",
          mode: "browser",
        });
      }
    }, 5000);

    currentSocket.on("connect", () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      set({ status: "connected", mode: "cloud" });
    });

    currentSocket.on("connect_error", () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      console.warn(`[SocketStore] Connection to ${targetUrl} failed. Switching to In-Browser Engine.`);
      try {
        currentSocket?.disconnect();
      } catch {}
      const vSocket = new VirtualSocket();
      set({
        socket: vSocket as any,
        status: "connected",
        mode: "browser",
      });
    });

    currentSocket.on("disconnect", () => {
      if (get().mode === "cloud") {
        set({ status: "disconnected" });
      }
    });

    return currentSocket;
  },

  disconnect: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null, status: "disconnected" });
    }
  },

  setServerUrl: (url: string) => {
    localStorage.setItem("sketchroom_server_url", url);
    const s = get().socket;
    if (s) {
      try {
        s.disconnect();
      } catch {}
    }
    set({ socket: null, serverUrl: url });
    get().connect();
  },

  useBrowserEngine: () => {
    localStorage.removeItem("sketchroom_server_url");
    const s = get().socket;
    if (s) {
      try {
        s.disconnect();
      } catch {}
    }
    const vSocket = new VirtualSocket();
    set({
      socket: vSocket as any,
      status: "connected",
      mode: "browser",
      serverUrl: null,
    });
  },
}));
