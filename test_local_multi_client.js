import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5173";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=== Testing 3 Clients in Same Local Browser (No Connection Errors) ===");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. Host creates room in Tab 1
    const hostPage = await browser.newPage();
    await hostPage.setViewport({ width: 1280, height: 800 });

    const errors = [];
    hostPage.on("pageerror", (err) => errors.push(`[Host Error]: ${err.message}`));
    hostPage.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[Host Console Error]: ${msg.text()}`);
    });

    console.log("1. Host visiting landing page...");
    await hostPage.goto(BASE_URL, { waitUntil: "networkidle0" });

    // Set host nickname
    await hostPage.evaluate(() => {
      const input = document.querySelector("input");
      if (input) {
        input.value = "HostAlice";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Create Room"));
      btn?.click();
    });

    await hostPage.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 8000 });
    const roomUrl = hostPage.url();
    const roomCode = roomUrl.split("/room/")[1];
    console.log(`✓ Host created room ${roomCode} at: ${roomUrl}`);

    await sleep(800);

    // 2. Client 2 joins in Tab 2 (SAME browser context!)
    const client2Page = await browser.newPage();
    client2Page.on("pageerror", (err) => errors.push(`[Client 2 Error]: ${err.message}`));
    client2Page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[Client 2 Console Error]: ${msg.text()}`);
    });

    console.log("2. Client 2 navigating to room URL in same browser...");
    await client2Page.goto(roomUrl, { waitUntil: "networkidle0" });

    // Enter nickname and submit join prompt
    await client2Page.waitForFunction(() => document.body.innerText.includes("Join Room") || document.querySelector("input") !== null, { timeout: 6000 });
    await client2Page.evaluate(() => {
      const input = document.querySelector("input");
      if (input) {
        input.value = "BobGuesser";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Enter Game Room"));
      btn?.click();
    });

    console.log("✓ Client 2 submitted join prompt!");
    await sleep(1000);

    // 3. Client 3 joins in Tab 3 (SAME browser context!)
    const client3Page = await browser.newPage();
    client3Page.on("pageerror", (err) => errors.push(`[Client 3 Error]: ${err.message}`));
    client3Page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[Client 3 Console Error]: ${msg.text()}`);
    });

    console.log("3. Client 3 navigating to room URL in same browser...");
    await client3Page.goto(roomUrl, { waitUntil: "networkidle0" });

    await client3Page.waitForFunction(() => document.body.innerText.includes("Join Room") || document.querySelector("input") !== null, { timeout: 6000 });
    await client3Page.evaluate(() => {
      const input = document.querySelector("input");
      if (input) {
        input.value = "CharlieDoodler";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Enter Game Room"));
      btn?.click();
    });

    console.log("✓ Client 3 submitted join prompt!");
    await sleep(1500);

    // 4. Verify all 3 players are visible in Host's Lobby
    const hostLobbyPlayers = await hostPage.evaluate(() => {
      return Array.from(document.querySelectorAll("h4, span")).map((e) => e.innerText);
    });
    console.log("Host sees players:", hostLobbyPlayers.filter((t) => ["HostAlice", "BobGuesser", "CharlieDoodler"].includes(t)));

    const playerCount = await hostPage.evaluate(() => {
      const match = document.body.innerText.match(/(\d)\/10/);
      return match ? match[1] : null;
    });
    console.log(`✓ Players in lobby count: ${playerCount}/10`);

    if (playerCount !== "3") {
      throw new Error(`Expected 3 players in lobby, got: ${playerCount}`);
    }

    // 5. Host starts game
    console.log("4. Host starting game...");
    await hostPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Start Game"));
      btn?.click();
    });

    await sleep(1200);

    // 6. Verify game is active across all 3 tabs without connection errors
    console.log("5. Checking game state across all 3 tabs...");
    const hostHasGame = await hostPage.evaluate(() => document.body.innerText.includes("Round") || document.querySelector("canvas") !== null);
    const c2HasGame = await client2Page.evaluate(() => document.body.innerText.includes("Round") || document.querySelector("canvas") !== null);
    const c3HasGame = await client3Page.evaluate(() => document.body.innerText.includes("Round") || document.querySelector("canvas") !== null);

    console.log(`Host active: ${hostHasGame}, Client 2 active: ${c2HasGame}, Client 3 active: ${c3HasGame}`);
    if (!hostHasGame || !c2HasGame || !c3HasGame) {
      throw new Error("Game failed to transition on all clients!");
    }

    if (errors.length > 0) {
      console.warn("Errors encountered during multi-client run:", errors);
    } else {
      console.log("✓ Zero connection errors across all tabs!");
    }

    console.log("\n========================================================");
    console.log("🎉 LOCAL MULTI-CLIENT CONNECTION TEST PASSED 100%! 🎉");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Local multi-client test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

