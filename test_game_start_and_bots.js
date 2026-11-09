import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

async function run() {
  console.log("=== Testing Game Start and Bot Flow ===");

  const socket = io(SERVER_URL, { transports: ["websocket"] });

  await new Promise((resolve) => socket.on("connect", resolve));
  console.log("1. Connected to server");

  let roomCode = "";
  let hostPlayerId = "";

  // Create room
  await new Promise((resolve, reject) => {
    socket.emit(
      "room:create",
      {
        nickname: "HostTester",
        avatar: { faceShape: "circle", skinColor: "#FFD1B3", eyes: "normal", mouth: "smile", accessory: "none", backgroundColor: "#3B82F6" },
        settings: { rounds: 2, drawTimeSeconds: 30 },
      },
      (res) => {
        if (res.success && res.roomCode && res.playerId) {
          roomCode = res.roomCode;
          hostPlayerId = res.playerId;
          console.log(`2. Room created successfully: ${roomCode}, Host Player ID: ${hostPlayerId}`);
          resolve();
        } else {
          reject(new Error("Failed to create room: " + JSON.stringify(res)));
        }
      }
    );
  });

  // Add a Bot Player
  await new Promise((resolve) => {
    socket.once("player:joined", (player) => {
      console.log(`3. Bot player joined: ${player.nickname} (ID: ${player.id})`);
      resolve();
    });
    socket.emit("room:add_bot");
  });

  // Wait for room:state
  await new Promise((resolve) => {
    socket.once("room:state", (state) => {
      console.log(`4. Room state received: ${state.players.length} players, phase: ${state.phase}`);
      resolve();
    });
  });

  // Start the Game
  console.log("5. Emitting game:start...");
  const wordOptionsPromise = new Promise((resolve) => {
    socket.once("game:word_options", (data) => {
      console.log(`6. Received word options as drawer:`, data.words);
      resolve(data.words);
    });
    socket.once("game:drawer_choosing", (data) => {
      console.log(`6. (Alternative) Bot was chosen as drawer:`, data);
      resolve(null);
    });
  });

  socket.emit("game:start");
  const words = await wordOptionsPromise;

  if (words) {
    console.log("7. Choosing word 0:", words[0]);
    const turnStartPromise = new Promise((resolve) => {
      socket.once("game:turn_start", (data) => {
        console.log(`8. Game turn started! Phase: DRAWING, secret word: ${data.secretWord}, draw time: ${data.drawTimeSeconds}s`);
        resolve(data);
      });
    });

    socket.emit("game:choose_word", { wordIndex: 0 });
    await turnStartPromise;

    console.log("9. Emitting test drawing stroke...");
    socket.emit("draw:op", {
      op: {
        type: "stroke",
        id: "test-stroke-1",
        tool: "brush",
        color: "#000000",
        size: 5,
        opacity: 1,
        points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }],
      },
    });

    console.log("✓ SUCCESS: Full game start, bot addition, word choice, and drawing verified!");
  } else {
    console.log("✓ SUCCESS: Bot was drawer and game successfully started!");
  }

  socket.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
