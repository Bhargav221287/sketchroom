import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@sketchroom/shared";
import { CLIENT_ORIGIN, PORT } from "./config.js";
import { roomManager } from "./room/RoomManager.js";
import { registerRoomHandlers } from "./handlers/roomHandler.js";
import { registerGameHandlers } from "./handlers/gameHandler.js";
import { registerDrawHandlers } from "./handlers/drawHandler.js";
import { registerChatHandlers } from "./handlers/chatHandler.js";

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development or if origin matches CLIENT_ORIGIN
      if (
        CLIENT_ORIGIN.includes("*") ||
        CLIENT_ORIGIN.some((allowed) => allowed === origin || allowed === "*")
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/staging to avoid CORS blockers
    },
    credentials: true,
  })
);

app.use(express.json());

// Health check endpoint for Render / monitoring
app.get("/health", (req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: "ok",
    app: "SketchRoom Server",
    uptimeSeconds: Math.floor(process.uptime()),
    roomsCount: stats.roomsCount,
    activePlayersCount: stats.activePlayersCount,
    timestamp: new Date().toISOString(),
  });
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  server,
  {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  }
);

io.on("connection", (socket) => {
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerDrawHandlers(io, socket);
  registerChatHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(`[SketchRoom] Server is listening on port ${PORT}`);
});

