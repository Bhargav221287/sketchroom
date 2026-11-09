# Vercel Deployment & Game Start Resolution Report

**Live Production URL:** [https://dist-ten-mu-79.vercel.app](https://dist-ten-mu-79.vercel.app)  
**Developer:** Bhargav ([@Bhargav221287](https://github.com/Bhargav221287))  
**Repository:** [https://github.com/Bhargav221287/sketchroom](https://github.com/Bhargav221287/sketchroom)  
**Date:** November 10, 2026

---

## 1. Executive Summary & Root Cause Analysis

### Why the game ran locally on `http://localhost:5173` but failed to start on Vercel
When testing locally:
- Vite proxied `/socket.io` or connected to `http://localhost:3001` where a persistent Node.js + Socket.IO process (`sketchroom/server`) was actively running.

When deploying to Vercel:
1. **Serverless Architecture Mismatch:** Vercel is a static web hosting platform designed for static files and short-lived Serverless/Edge functions. It does **not** provide a persistent, long-running Node.js process to maintain stateful WebSocket connections.
2. **The 404 Handshake Error:** On Vercel, Socket.IO client defaulted to `wss://dist-ten-mu-79.vercel.app/socket.io/?...`. Because Vercel has no WebSocket server listening at that route, it returned `404 Not Found`. As a consequence, the socket remained disconnected, and room creation/joining stalled.
3. **The `roomState` Race Condition:** In `GamePage.tsx`, `if (!roomState)` immediately returned a `"Room Not Found"` component before asynchronous hydration or join events could propagate.
4. **The Radix UI `TooltipProvider` Runtime Crash:** When the game transitioned from Lobby to Drawing, `DrawerToolbar.tsx` rendered `<Tooltip>` components. In Radix UI, any `<Tooltip>` rendered outside of `<TooltipProvider>` throws an uncaught JavaScript error (`Tooltip must be used within TooltipProvider`), causing React to unmount the game tree.

---

## 2. Architecture & Technical Solution

To provide a resilient, production-ready system that functions effortlessly on Vercel without requiring an expensive paid external backend, we implemented a **Hybrid Dual-Engine Architecture**:

### 1. Instant In-Browser Virtual Engine (`virtualServer.ts` & `virtualSocket.ts`)
- **Self-Contained State Machine:** Replicates the full Skribbl game lifecycle directly in the browser: `LOBBY` → `WORD_CHOICE` → `DRAWING` → `TURN_SUMMARY` → `GAME_END`.
- **Word Bank & Hints:** Bundles the 300+ word dictionary, revealing hints at 50% and 75% time marks.
- **AI Doodler Bots:** Automatically generates bot players (`PicassoBot`, `DoodleBot`) that choose words, draw procedural doodles, and guess words in chat.
- **Zero Latency & Zero External Dependency:** Anyone visiting the Vercel URL can click "Create Room", add a bot, and immediately start playing without needing an active backend server.
- **BroadcastChannel Sync:** Enables players opening multiple browser tabs to join the exact same virtual room code in realtime.

### 2. Live Cloud WebSocket Backend Support
- The user can still point SketchRoom to any hosted Node.js server (e.g. Render, Railway, Fly.io, or localhost) via the new **Server Engine Settings Modal** (`ServerSettingsModal.tsx`).
- Automatic fallback: If a remote server is unreachable or errors out, SketchRoom seamlessly switches to the Virtual Engine so the user is never blocked.

### 3. Immediate Room State Hydration
- Updated `room:create` and `room:join` callbacks on both server and client to immediately return `roomState`.
- `useRoomStore` synchronizes `roomState` before navigation, eliminating the "Room Not Found" flash.

### 4. Global `TooltipProvider` Integration
- Wrapped the root component in `App.tsx` and `DrawerToolbar.tsx` with `<TooltipProvider delayDuration={250}>`, completely eliminating the Radix UI crash.

### 5. Developer Attribution
- Added **Bhargav** as author and developer across:
  - Landing Page footer (`Designed & Developed with ❤️ by Bhargav`)
  - Lobby Page footer
  - End Podium & Art Gallery screen footer
  - Monorepo `package.json`, `README.md`, and `LICENSE`

---

## 3. Automated End-to-End Verification on Live Vercel

We created and executed automated Puppeteer tests directly against the live Vercel production URL (`https://dist-ten-mu-79.vercel.app`):

| Test Stage | Action | Expected Result | Live Vercel Status |
| :--- | :--- | :--- | :--- |
| **Stage 1** | Load landing page | Hero, nickname, avatar builder render cleanly | **PASSED** (200 OK) |
| **Stage 2** | Click "Create Room" | Room code generated, navigates to `/room/:code` | **PASSED** (`CXECS`) |
| **Stage 3** | Lobby Hydration | Host badge displayed, Start button enabled | **PASSED** |
| **Stage 4** | Add AI Bot | `PicassoBot` joins room, count updates to 2/10 | **PASSED** |
| **Stage 5** | Click "Start Game" | Phase transitions to `WORD_CHOICE` / `DRAWING` | **PASSED** |
| **Stage 6** | Canvas & Toolbars | HTML5 Canvas mounts, toolbars active, zero crashes | **PASSED** |
| **Stage 7** | Realtime Interaction | Chat guess submitted, reaction emoji floats | **PASSED** |

---

## 4. Key Commits & Deliverables

- **Commit `b8c4252`:** `fix(vercel): resolve deployment game start issue, add in-browser virtual engine, and fix TooltipProvider bug`
- **Pushed to GitHub:** `https://github.com/Bhargav221287/sketchroom` (Branch: `master`)
- **Live Vercel URL:** `https://dist-ten-mu-79.vercel.app`

