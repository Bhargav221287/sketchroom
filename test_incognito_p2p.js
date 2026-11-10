import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VERCEL_URL = "https://dist-ten-mu-79.vercel.app";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testIncognitoCrossDevice() {
  console.log("=== Testing Incognito / Cross-Device WebRTC P2P Multiplayer on Vercel ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    // 1. Context 1 (Host: "Puku"): Default context
    const context1 = browser.defaultBrowserContext();
    const page1 = await context1.newPage();
    await page1.setViewport({ width: 1280, height: 800 });

    console.log("1. Tab 1 (Host Puku): Visiting Vercel URL...");
    await page1.goto(VERCEL_URL, { waitUntil: "domcontentloaded" });

    await page1.waitForSelector("input");
    await page1.evaluate(() => {
      const inp = document.querySelector("input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(inp, "Puku");
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      const btns = Array.from(document.querySelectorAll("button"));
      btns.find((b) => b.innerText.includes("Create Room"))?.click();
    });

    await page1.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 10000 });
    const code = page1.url().split("/room/")[1].substring(0, 5);
    console.log(`✓ Host created room code: ${code}`);

    await page1.waitForFunction(() => document.body.innerText.includes("Players in Lobby"));
    console.log("✓ Host is in Lobby!");

    await sleep(2000); // Give PeerJS cloud signaling a moment to bind skr-v2-<codeId>

    // 2. Context 2 (Guest: "LK"): 100% Isolated Incognito Browser Context (NO localStorage or BroadcastChannel shared!)
    console.log("2. Tab 2 (Guest LK): Launching isolated Incognito context...");
    const incognitoContext = await browser.createBrowserContext();
    const page2 = await incognitoContext.newPage();
    await page2.setViewport({ width: 1280, height: 800 });

    console.log(`Tab 2 (Incognito): Visiting ${VERCEL_URL}/room/${code}...`);
    await page2.goto(`${VERCEL_URL}/room/${code}`, { waitUntil: "domcontentloaded" });

    await page2.waitForFunction(
      () => document.body.innerText.includes("Enter Game Room") || document.body.innerText.includes("Choose your nickname"),
      { timeout: 10000 }
    );

    console.log("Tab 2 (Incognito): Entering nickname 'LK' and clicking 'Enter Game Room'...");
    await page2.evaluate(() => {
      const form = document.querySelector("form");
      const inp = document.querySelector("form input");
      if (inp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(inp, "LK");
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Enter Game Room"));
      btn?.click();
    });

    console.log("3. Waiting for WebRTC P2P connection between Host and Incognito Guest...");
    // Wait for Host to see LK
    await page1.waitForFunction(() => document.body.innerText.includes("LK"), { timeout: 15000 });
    // Wait for Guest to see Puku
    await page2.waitForFunction(() => document.body.innerText.includes("Puku"), { timeout: 15000 });

    const p1Text = await page1.evaluate(() => document.body.innerText);
    const p2Text = await page2.evaluate(() => document.body.innerText);

    console.log("\n=== Tab 1 (Host Puku) Lobby State ===");
    console.log(`Contains 2/10: ${p1Text.includes("2/10")}`);
    console.log(`Contains Puku (You) Host: ${p1Text.includes("Puku") && p1Text.includes("Host")}`);
    console.log(`Contains LK: ${p1Text.includes("LK")}`);

    console.log("\n=== Tab 2 (Incognito Guest LK) Lobby State ===");
    console.log(`Contains 2/10: ${p2Text.includes("2/10")}`);
    console.log(`Contains Puku Host: ${p2Text.includes("Puku")}`);
    console.log(`Contains LK (You): ${p2Text.includes("LK")}`);
    console.log(`Contains 'Waiting for host': ${p2Text.includes("Waiting for host")}`);

    console.log("\n4. Host clicking 'Start Game'...");
    await page1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      btns.find((b) => b.innerText.includes("Start Game"))?.click();
    });

    await page1.waitForFunction(
      () =>
        document.body.innerText.includes("Choose a word") ||
        document.body.innerText.includes("choosing a word") ||
        document.querySelector("canvas") !== null,
      { timeout: 10000 }
    );
    await page2.waitForFunction(
      () =>
        document.body.innerText.includes("Choose a word") ||
        document.body.innerText.includes("choosing a word") ||
        document.querySelector("canvas") !== null,
      { timeout: 10000 }
    );

    console.log("✓ BOTH tabs (Normal + Incognito) transitioned to Game!");
    console.log("\n==========================================================================");
    console.log("🎉 INCOGNITO / CROSS-DEVICE WEBRTC MULTIPLAYER PASSED 100%! 🎉");
    console.log("==========================================================================");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testIncognitoCrossDevice();

