import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickButtonWithText(page, text) {
  const clicked = await page.evaluate((targetText) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.innerText.toLowerCase().includes(targetText.toLowerCase()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);

  if (!clicked) {
    throw new Error(`Could not find button containing text "${text}"`);
  }
}

async function run() {
  console.log("=== Puppeteer Browser Game Start Test ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Visit Landing Page
    console.log("1. Visiting http://localhost:5173...");
    await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });

    // 2. Click Create Room
    console.log("2. Clicking 'Create Room'...");
    await clickButtonWithText(page, "Create Room");

    // 3. Wait for Lobby page navigation
    console.log("3. Waiting for Lobby page (/room/)...");
    await page.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 8000 });
    console.log(`✓ Navigated to: ${page.url()}`);

    // Wait a brief moment for socket state to hydrate
    await sleep(1000);

    // 4. Verify Start Game button is present and ENABLED
    console.log("4. Checking 'Start Game' button...");
    const isStartDisabled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.innerText.includes("Start Game"));
      return btn ? btn.disabled : null;
    });
    console.log(`Start button disabled status: ${isStartDisabled}`);
    if (isStartDisabled !== false) {
      throw new Error(`Expected Start Game button to be enabled (false), but got ${isStartDisabled}`);
    }

    // 5. Click "Add Bot Player"
    console.log("5. Clicking 'Add Bot Player'...");
    await clickButtonWithText(page, "Add Bot Player");

    // 6. Verify Bot joins
    console.log("6. Verifying bot player appears in DOM...");
    await page.waitForFunction(() => document.body.innerText.includes("BOT"), { timeout: 5000 });
    console.log("✓ Bot player joined the lobby!");

    // 7. Click Start Game
    console.log("7. Clicking 'Start Game'...");
    await clickButtonWithText(page, "Start Game");

    // 8. Verify Word Choice Modal appears
    console.log("8. Waiting for Word Choice modal or turn start...");
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Choose a Word to Draw!") ||
        document.body.innerText.includes("is choosing a word") ||
        document.querySelector("canvas") !== null,
      { timeout: 8000 }
    );
    console.log("✓ Game transitioned from LOBBY to game phase successfully!");

    // If word buttons are present, click one
    await sleep(1000);
    const hasWordOptions = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button.capitalize"));
      if (btns.length > 0) {
        btns[0].click();
        return true;
      }
      return false;
    });
    if (hasWordOptions) {
      console.log("9. Word option clicked by drawer!");
    } else {
      console.log("9. (Word already selected or bot is drawer)");
    }

    // Wait for canvas to be mounted
    await page.waitForSelector("canvas", { timeout: 6000 });
    console.log("✓ Canvas is mounted and active!");

    // Take screenshot of running game
    await page.screenshot({ path: "docs/screenshots/game_started_verified.png" });
    console.log("✓ Screenshot saved to docs/screenshots/game_started_verified.png");
    console.log("\n========================================================");
    console.log("🎉 BROWSER GAME START TEST PASSED WITH 100% SUCCESS! 🎉");
    console.log("========================================================\n");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
