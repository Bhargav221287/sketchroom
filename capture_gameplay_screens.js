import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { io } from "socket.io-client";
import { generateRandomAvatar } from "./shared/dist/index.js";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_DIR = path.resolve("./docs/screenshots");

const VIEWPORTS = [
  { name: "mobile_360", width: 360, height: 740 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("[Gameplay Screenshots] Setting up multi-player session...");

  // 1. Create a room via socket
  const hostSocket = io("http://localhost:3001", { transports: ["websocket"] });
  let roomCode = "";
  let sessionToken = "";

  await new Promise((resolve) => {
    hostSocket.emit(
      "room:create",
      {
        nickname: "CaptainDoodle",
        avatar: generateRandomAvatar(),
        settings: { rounds: 2, drawTimeSeconds: 60 },
      },
      (res) => {
        roomCode = res.roomCode;
        sessionToken = res.sessionToken;
        resolve();
      }
    );
  });

  // 2. Add 2 more players so we meet min players
  const p2Socket = io("http://localhost:3001", { transports: ["websocket"] });
  const p3Socket = io("http://localhost:3001", { transports: ["websocket"] });

  await new Promise((resolve) => {
    p2Socket.emit("room:join", { roomCode, nickname: "Alice", avatar: generateRandomAvatar() }, resolve);
  });
  await new Promise((resolve) => {
    p3Socket.emit("room:join", { roomCode, nickname: "Bob_The_Artist", avatar: generateRandomAvatar() }, resolve);
  });

  console.log(`[Gameplay Screenshots] Room ${roomCode} ready with 3 players.`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Inject sessionToken into localStorage before loading
  await page.goto("http://localhost:5173/");
  await page.evaluate(
    (code, token) => {
      localStorage.setItem("sketchroom_session_token", token);
      localStorage.setItem("sketchroom_nickname", "CaptainDoodle");
    },
    roomCode,
    sessionToken
  );

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    // A. Capture Lobby
    console.log(`Capturing Lobby Light (${vp.name})...`);
    await page.goto(`http://localhost:5173/room/${roomCode}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await sleep(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `lobby_${vp.name}_light.png`), fullPage: false });

    console.log(`Capturing Lobby Dark (${vp.name})...`);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await sleep(400);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `lobby_${vp.name}_dark.png`), fullPage: false });
  }

  // B. Start Game & Select Word
  console.log("[Gameplay Screenshots] Starting game...");
  hostSocket.emit("game:start");
  await sleep(1000);

  // Drawer picks word
  hostSocket.emit("game:choose_word", { wordIndex: 0 });
  await sleep(1500);

  // Send some sample drawing strokes
  hostSocket.emit("draw:op", {
    op: {
      type: "stroke",
      id: "demo-stroke-1",
      tool: "brush",
      color: "#8B5CF6",
      size: 12,
      opacity: 1,
      points: [
        { x: 0.3, y: 0.3 },
        { x: 0.5, y: 0.4 },
        { x: 0.7, y: 0.3 },
      ],
    },
  });

  // Send some chat messages
  p2Socket.emit("chat:send", { text: "Is it a rainbow?" });
  p3Socket.emit("chat:send", { text: "Looks like a smiley face!" });

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    console.log(`Capturing Game Screen Light (${vp.name})...`);
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await sleep(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `game_${vp.name}_light.png`), fullPage: false });

    console.log(`Capturing Game Screen Dark (${vp.name})...`);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await sleep(400);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `game_${vp.name}_dark.png`), fullPage: false });
  }

  // Clean up
  hostSocket.disconnect();
  p2Socket.disconnect();
  p3Socket.disconnect();
  await browser.close();

  console.log("[Gameplay Screenshots] All gameplay screens captured!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Error capturing gameplay screens:", e);
  process.exit(1);
});
