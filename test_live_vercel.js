import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VERCEL_URL = "https://dist-ten-mu-79.vercel.app";
const ARTIFACT_DIR = "C:\\Users\\bharg\\.gemini\\antigravity\\brain\\c3e16e42-b68c-4faa-ac97-f5212cb35498\\screenshots";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=== Testing LIVE Vercel Deployment ===");
  console.log(`Target URL: ${VERCEL_URL}`);

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const errors = [];
    page.on("pageerror", (err) => {
      console.log("PAGE ERROR:", err.message);
      errors.push(err.message);
    });
    page.on("console", (msg) => {
      console.log(`[Vercel Browser Log] ${msg.type()}: ${msg.text()}`);
    });

    // 1. Visit live Vercel URL
    console.log("1. Visiting live Vercel URL...");
    await page.goto(VERCEL_URL, { waitUntil: "networkidle0" });

    // 2. Click Create Room
    console.log("2. Clicking 'Create Room'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Create Room"));
      btn?.click();
    });

    // 3. Wait for Lobby page navigation
    console.log("3. Waiting for navigation to /room/...");
    await page.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 8000 });
    console.log(`✓ Navigated to live room: ${page.url()}`);

    await sleep(800);

    // 4. Verify Start Game button is present and enabled
    console.log("4. Checking 'Start Game' button in Lobby...");
    const isStartDisabled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Start Game"));
      return btn ? btn.disabled : null;
    });
    console.log(`Start button disabled: ${isStartDisabled}`);
    if (isStartDisabled !== false) {
      throw new Error(`Start Game button should be enabled, got: ${isStartDisabled}`);
    }

    // 5. Click "Add Bot Player"
    console.log("5. Clicking 'Add Bot Player'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Add Bot Player"));
      btn?.click();
    });

    await page.waitForFunction(
      () => document.body.innerText.includes("BOT") || document.body.innerText.includes("PicassoBot") || document.body.innerText.includes("2/10"),
      { timeout: 6000 }
    );
    console.log("✓ Bot player joined live Vercel lobby!");

    // Capture Lobby screenshot
    const lobbyScreenshotPath = path.join(ARTIFACT_DIR, "vercel_live_lobby.png");
    await page.screenshot({ path: lobbyScreenshotPath });
    console.log(`✓ Lobby screenshot saved to: ${lobbyScreenshotPath}`);

    // 6. Click Start Game
    console.log("6. Clicking 'Start Game'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Start Game"));
      btn?.click();
    });

    // 7. Verify Word Choice or Drawing phase
    console.log("7. Waiting for Word Choice or Drawing phase...");
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("choosing a word") ||
        document.body.innerText.includes("Choose a Word to Draw") ||
        document.querySelector("canvas") !== null,
      { timeout: 8000 }
    );
    console.log("✓ Live game started successfully on Vercel!");

    // If human is drawer, select a word
    await sleep(600);
    const hasWordBtn = await page.evaluate(() => {
      const btn = document.querySelector("button.capitalize");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (hasWordBtn) {
      console.log("✓ Human is drawer: selected a word!");
    } else {
      console.log("✓ Bot is drawer: waiting for bot to draw/choose word...");
    }

    // 8. Verify Canvas is active
    console.log("8. Waiting for drawing canvas...");
    await page.waitForSelector("canvas", { timeout: 8000 });
    console.log("✓ Canvas active and drawing phase verified live on Vercel!");

    await sleep(1500);

    // Capture active Game screenshot
    const gameScreenshotPath = path.join(ARTIFACT_DIR, "vercel_live_gameplay.png");
    await page.screenshot({ path: gameScreenshotPath });
    console.log(`✓ Live game screenshot saved to: ${gameScreenshotPath}`);

    console.log("\n========================================================");
    console.log("🎉 VERCEL PRODUCTION DEPLOYMENT TEST PASSED 100%! 🎉");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Test failed on live Vercel:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

