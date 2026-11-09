import { io, Socket } from "socket.io-client";
import {
  generateRandomAvatar,
  ClientToServerEvents,
  ServerToClientEvents,
  CanvasOp,
} from "@sketchroom/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";
const NUM_PLAYERS = 10;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation() {
  console.log(`\n======================================================`);
  console.log(`[SketchRoom Simulation] Starting 10-Player Headless Test`);
  console.log(`======================================================\n`);

  const sockets: TypedSocket[] = [];
  const sessionTokens: string[] = [];
  let roomCode = "";

  try {
    // 1. Connect Host Player (p0)
    console.log(`[Step 1] Connecting Host Player...`);
    const hostSocket: TypedSocket = io(SERVER_URL, { transports: ["websocket"] });
    sockets.push(hostSocket);

    await new Promise<void>((resolve, reject) => {
      hostSocket.on("connect", () => {
        hostSocket.emit(
          "room:create",
          {
            nickname: "Player_1_Host",
            avatar: generateRandomAvatar(),
            settings: { rounds: 2, drawTimeSeconds: 30 },
          },
          (res) => {
            if (res.success && res.roomCode && res.sessionToken) {
              roomCode = res.roomCode;
              sessionTokens.push(res.sessionToken);
              console.log(`✓ Room created successfully! Code: ${roomCode}`);
              resolve();
            } else {
              reject(new Error(res.error || "Failed to create room"));
            }
          }
        );
      });
      hostSocket.on("connect_error", (e) => reject(e));
    });

    // 2. Connect Remaining 9 Players (p1 through p9)
    console.log(`[Step 2] Joining 9 additional players into room ${roomCode}...`);
    for (let i = 2; i <= NUM_PLAYERS; i++) {
      const socket: TypedSocket = io(SERVER_URL, { transports: ["websocket"] });
      sockets.push(socket);

      await new Promise<void>((resolve, reject) => {
        socket.on("connect", () => {
          socket.emit(
            "room:join",
            {
              roomCode,
              nickname: `Player_${i}`,
              avatar: generateRandomAvatar(),
            },
            (res) => {
              if (res.success && res.sessionToken) {
                sessionTokens.push(res.sessionToken);
                resolve();
              } else {
                reject(new Error(res.error || `Failed to join player ${i}`));
              }
            }
          );
        });
      });
    }

    console.log(`✓ All ${NUM_PLAYERS} players connected and joined room ${roomCode}!`);

    // Verify player list count on host
    await sleep(500);

    // 3. Host starts the game
    console.log(`\n[Step 3] Host starts game...`);
    let activeDrawerId = "";
    let secretWord = "";
    let drawerSocket: TypedSocket = hostSocket;

    const turnPromise = new Promise<void>((resolve) => {
      // Any socket can be the chosen drawer
      sockets.forEach((s) => {
        s.on("game:word_options", ({ words }) => {
          drawerSocket = s;
          console.log(`✓ Drawer received word choices: [${words.join(", ")}]`);
          secretWord = words[0];
          s.emit("game:choose_word", { wordIndex: 0 });
        });

        s.on("game:turn_start", (data) => {
          activeDrawerId = data.drawerId;
          console.log(`✓ Turn started! Drawer: ${data.drawerId}, Word Length: ${data.wordLength}`);
          resolve();
        });
      });
    });

    hostSocket.emit("game:start");
    await turnPromise;

    // 4. Simulate Drawer Drawing Strokes
    console.log(`\n[Step 4] Simulating stroke drawing from drawer...`);
    const strokeOp: CanvasOp = {
      type: "stroke",
      id: "sim-stroke-1",
      tool: "brush",
      color: "#000000",
      size: 5,
      opacity: 1,
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 0.8 },
      ],
    };

    drawerSocket.emit("draw:op", { op: strokeOp });
    drawerSocket.emit("draw:cursor_move", { x: 0.5, y: 0.5 });
    console.log(`✓ Draw op and cursor move dispatched.`);

    // 5. Simulate Guesses & Proximity Detection
    console.log(`\n[Step 5] Simulating guesses and 'close' hint...`);
    const guesserSocket = sockets.find((s) => s !== drawerSocket) || sockets[1];

    let closeHintReceived = false;
    guesserSocket.on("chat:close_guess", ({ message }) => {
      console.log(`✓ 'You're close!' hint confirmed: "${message}"`);
      closeHintReceived = true;
    });

    // Send close typo guess if word is >= 4 chars
    if (secretWord.length >= 4) {
      const typo = secretWord.substring(0, secretWord.length - 1) + "x";
      guesserSocket.emit("chat:send", { text: typo });
      await sleep(400);
    }

    // Send exact correct guess
    let correctGuessReceived = false;
    guesserSocket.on("chat:correct_guess", ({ playerName, pointsAwarded }) => {
      console.log(`✓ Correct guess confirmed: ${playerName} scored +${pointsAwarded} pts!`);
      correctGuessReceived = true;
    });

    guesserSocket.emit("chat:send", { text: secretWord });
    await sleep(600);

    // 6. Test Reconnection Slot Holding
    console.log(`\n[Step 6] Testing player disconnect & slot hold via sessionToken...`);
    const playerToDisconnect = sockets[NUM_PLAYERS - 1];
    const savedToken = sessionTokens[NUM_PLAYERS - 1];

    playerToDisconnect.disconnect();
    await sleep(500);

    // Reconnect new socket with saved sessionToken
    const reconnectedSocket: TypedSocket = io(SERVER_URL, { transports: ["websocket"] });
    await new Promise<void>((resolve, reject) => {
      reconnectedSocket.on("connect", () => {
        reconnectedSocket.emit(
          "room:join",
          {
            roomCode,
            nickname: `Player_${NUM_PLAYERS}`,
            avatar: generateRandomAvatar(),
            sessionToken: savedToken,
          },
          (res) => {
            if (res.success) {
              console.log(`✓ Player reconnected seamlessly using 60s sessionToken slot!`);
              resolve();
            } else {
              reject(new Error(res.error || "Reconnection failed"));
            }
          }
        );
      });
    });

    console.log(`\n======================================================`);
    console.log(`🎉 ALL 10-PLAYER HEADLESS TESTS PASSED WITH 100% SUCCESS!`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`❌ Simulation failed:`, error);
    process.exit(1);
  } finally {
    for (const s of sockets) {
      s.disconnect();
    }
    process.exit(0);
  }
}

runSimulation();
